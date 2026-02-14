from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db import init_db, close_db
from backend.routers import respondents, surveys, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    close_db()


app = FastAPI(title="Panel Chat", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(respondents.router)
app.include_router(surveys.router)
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
