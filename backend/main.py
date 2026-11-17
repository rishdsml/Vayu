from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from auth import get_auth_url, get_flow, handle_callback
from dotenv import load_dotenv
import anthropic
import json
from agent.reporting_agent import stream_reporting_agent
from agent.diagnosis_agent import stream_diagnosis_agent
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI()
client = anthropic.Anthropic()

class ChatRequest(BaseModel):
    message: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

ROUTER_PROMPT = """
You are a routing agent inside Vecto.

You receive a user message and decide whether it is a reporting request or a diagnosis request.

Reporting: the user wants a performance summary, overview, trend or comparison.
Examples: "how did my campaigns do last week", "show me September performance", "compare my ad groups"

Diagnosis: the user wants to understand why something happened or investigate a problem.
Examples: "why did my CPA go up", "what is causing the CPC spike", "investigate the drop in conversions"

Return ONLY valid JSON:
{"type": "reporting" or "diagnosis"}
"""

def route_message(message: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=100,
        system=ROUTER_PROMPT,
        messages=[{"role": "user", "content": message}]
    )
    raw = response.content[0].text.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw)["type"]


@app.get("/")
def root():
    return {"status": "Vecto backend running"}


@app.get("/auth/login")
def login():
    auth_url = get_auth_url()
    return RedirectResponse(auth_url)


@app.get("/auth/callback")
def callback(code: str):
    refresh_token = handle_callback(code)
    return RedirectResponse(
        f"http://localhost:3000/connected?token={refresh_token}"
    )


@app.post("/agent/chat")
def chat(request: ChatRequest):
    def events():
        try:
            route = route_message(request.message)
            yield json.dumps({"type": "route", "route": route}) + "\n"
            agent = stream_reporting_agent if route == "reporting" else stream_diagnosis_agent
            for event in agent(request.message):
                yield json.dumps(event, default=str) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")