import asyncio
import queue
import threading
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.services.history import get_debate, save_message
from backend.graph.builder import build_debate_graph

router = APIRouter()

_SENTINEL = object()


@router.websocket("/ws/debates/{debate_id}")
async def debate_ws(websocket: WebSocket, debate_id: str):
    await websocket.accept()

    try:
        session = get_debate(debate_id)
        if not session:
            await websocket.send_json({"type": "error", "data": {"message": "Debate not found"}})
            await websocket.close()
            return

        if not session.panel:
            await websocket.send_json({"type": "error", "data": {"message": "No panel selected"}})
            await websocket.close()
            return

        graph = build_debate_graph()

        initial_state = {
            "question": session.question,
            "panel": session.panel,
            "num_rounds": session.num_rounds,
            "current_round": 0,
            "llm_provider": session.llm_provider,
            "round_responses": [],
            "all_rounds": [],
            "debate_id": debate_id,
        }

        # Thread-safe queue for streaming chunks from graph thread to async handler
        chunk_queue: queue.Queue = queue.Queue()

        def run_graph():
            try:
                for chunk in graph.stream(initial_state, stream_mode="updates"):
                    chunk_queue.put(chunk)
                chunk_queue.put(_SENTINEL)
            except Exception as e:
                chunk_queue.put(e)

        thread = threading.Thread(target=run_graph, daemon=True)
        thread.start()

        loop = asyncio.get_event_loop()
        while True:
            item = await loop.run_in_executor(None, chunk_queue.get)

            if item is _SENTINEL:
                break

            if isinstance(item, Exception):
                await websocket.send_json({"type": "error", "data": {"message": str(item)}})
                break

            for node_name, node_output in item.items():
                if node_name == "agent_respond":
                    responses = node_output.get("round_responses", [])
                    for resp in responses:
                        save_message(
                            debate_id=debate_id,
                            round_num=resp["round_num"],
                            respondent_id=resp["respondent_id"],
                            agent_name=resp["agent_name"],
                            content=resp["content"],
                        )
                        await websocket.send_json({
                            "type": "agent_response",
                            "data": resp,
                        })
                elif node_name == "collect_round":
                    current_round = node_output.get("current_round", 0)
                    await websocket.send_json({
                        "type": "round_done",
                        "data": {"round_num": current_round},
                    })

        await websocket.send_json({
            "type": "debate_done",
            "data": {"debate_id": debate_id},
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "data": {"message": str(e)}})
        except Exception:
            pass
