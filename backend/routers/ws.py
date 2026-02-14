import asyncio
import json
import logging
import queue
import threading

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.history import get_survey, save_response
from backend.graph.builder import build_survey_graph, build_debate_graph

logger = logging.getLogger(__name__)

router = APIRouter()

_SENTINEL = object()


@router.websocket("/ws/surveys/{survey_id}")
async def survey_ws(websocket: WebSocket, survey_id: str):
    await websocket.accept()

    try:
        # First message must contain the API keys + config
        init_raw = await websocket.receive_text()
        init_msg = json.loads(init_raw)
        api_keys = init_msg.get("api_keys", {})
        temperatures = init_msg.get("temperatures", {})
        persona_memory = init_msg.get("persona_memory", True)
        chat_mode = init_msg.get("chat_mode", "survey")
        num_rounds = init_msg.get("num_rounds", 3)

        if not api_keys or not any(api_keys.values()):
            await websocket.send_json({"type": "error", "data": {"message": "At least one API key required"}})
            await websocket.close()
            return

        session = get_survey(survey_id)
        if not session:
            await websocket.send_json({"type": "error", "data": {"message": "Survey not found"}})
            await websocket.close()
            return

        if not session.panel:
            await websocket.send_json({"type": "error", "data": {"message": "No panel selected"}})
            await websocket.close()
            return

        if not session.breakdown:
            await websocket.send_json({"type": "error", "data": {"message": "No breakdown configured"}})
            await websocket.close()
            return

        sub_questions_dicts = [sq.model_dump() for sq in session.breakdown.sub_questions]

        if chat_mode == "debate":
            graph = build_debate_graph()
            initial_state = {
                "question": session.question,
                "sub_questions": sub_questions_dicts,
                "panel": session.panel,
                "models": session.models,
                "api_keys": api_keys,
                "temperatures": temperatures,
                "survey_id": survey_id,
                "persona_memory": persona_memory,
                "num_rounds": num_rounds,
                "current_round": 1,
                "prior_round_summary": "",
                "responses": [],
            }
        else:
            graph = build_survey_graph()
            initial_state = {
                "question": session.question,
                "sub_questions": sub_questions_dicts,
                "panel": session.panel,
                "models": session.models,
                "api_keys": api_keys,
                "temperatures": temperatures,
                "survey_id": survey_id,
                "persona_memory": persona_memory,
                "responses": [],
            }

        # Thread-safe queue for streaming chunks from graph thread to async handler
        chunk_queue: queue.Queue = queue.Queue()

        def run_graph():
            try:
                for chunk in graph.stream(initial_state, stream_mode="updates"):
                    chunk_queue.put(chunk)
                chunk_queue.put(_SENTINEL)
            except Exception as exc:
                logger.exception("Graph execution failed")
                chunk_queue.put(exc)

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
                if node_name in ("survey_respond", "debate_respond"):
                    responses = node_output.get("responses", [])
                    for resp in responses:
                        saved = save_response(
                            survey_id=survey_id,
                            respondent_id=resp["respondent_id"],
                            agent_name=resp["agent_name"],
                            model=resp["model"],
                            answers=resp["answers"],
                        )
                        await websocket.send_json({
                            "type": "survey_response",
                            "data": {
                                "id": saved.id,
                                "survey_id": survey_id,
                                "respondent_id": resp["respondent_id"],
                                "agent_name": resp["agent_name"],
                                "model": resp["model"],
                                "answers": resp["answers"],
                                "round": resp.get("round"),
                                "token_usage": resp.get("token_usage"),
                            },
                        })

                elif node_name == "summarize_round":
                    # Notify frontend that a round has completed
                    current_round = node_output.get("current_round", 1)
                    summary = node_output.get("prior_round_summary", "")
                    await websocket.send_json({
                        "type": "round_complete",
                        "data": {
                            "round": current_round - 1,
                            "total_rounds": num_rounds,
                            "summary": summary,
                        },
                    })

        await websocket.send_json({
            "type": "survey_done",
            "data": {"survey_id": survey_id},
        })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for survey %s", survey_id)
    except Exception as exc:
        logger.exception("WebSocket error for survey %s", survey_id)
        try:
            await websocket.send_json({"type": "error", "data": {"message": str(exc)}})
        except Exception:
            pass
