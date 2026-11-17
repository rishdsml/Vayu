import json
import os
from dotenv import load_dotenv
import anthropic

from agent.query_engine import run_queries
from agent.diagnosis_prompts import ANALYSIS_AGENT_PROMPT, DIAGNOSIS_EXPLAIN_PROMPT

load_dotenv()

CLIENT_ID = "d1e2971e-e7c9-4bfe-8594-e73cf2ddb927"
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000
MAX_ROUNDS = 3
MAX_QUERIES = 8
MAX_ROWS_PER_QUERY = 60

client = anthropic.Anthropic()

with open("agent/diagnosis_arsenal.json") as f:
    DIAGNOSIS_ARSENAL = json.load(f)


def parse_json(raw: str) -> dict:
    text = raw.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        return json.loads(text[start:end + 1])


def call_analysis(messages: list) -> tuple[str, dict]:
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=ANALYSIS_AGENT_PROMPT,
        messages=messages,
    )
    raw = response.content[0].text
    return raw, parse_json(raw)


def print_round(step: dict):
    print(f"\n--- Round {step.get('round', '?')} ---")
    for h in step.get("hypotheses", []):
        print(f"  {h['id']} [{h['lever']}] weight {h['weight']} ({h['status']}): {h['statement']}")
    print(f"  Reason: {step.get('reason', '')}")


def execute_step(step: dict, already_run: set, budget_left: int) -> tuple[str, int]:
    date_range = step["date_range"]
    params = {
        "client_id": CLIENT_ID,
        "start_date": date_range["start_date"],
        "end_date": date_range["end_date"],
    }

    to_run, skipped = [], []
    for q in step.get("queries", []):
        level, query_id = q["level"], q["query_id"]
        if query_id in already_run:
            skipped.append(f"{query_id} (already run)")
            continue
        if query_id not in DIAGNOSIS_ARSENAL.get(level, {}):
            skipped.append(f"{query_id} (unknown)")
            continue
        if len(to_run) >= budget_left:
            skipped.append(f"{query_id} (query budget reached)")
            continue
        to_run.append({
            "query_id": query_id,
            "query": DIAGNOSIS_ARSENAL[level][query_id]["query"],
            "params": params,
        })

    for q in to_run:
        print(f"  Running {q['query_id']}")

    results = run_queries(to_run) if to_run else []

    payload = {}
    for r in results:
        already_run.add(r["query_id"])
        rows = r["rows"]
        payload[r["query_id"]] = {
            "columns": r["columns"],
            "row_count": len(rows),
            "rows": rows[:MAX_ROWS_PER_QUERY],
        }

    budget_left -= len(results)
    message = (
        f"Query results:\n{json.dumps(payload, default=str)}\n\n"
        f"Skipped: {skipped if skipped else 'none'}\n"
        f"Queries remaining: {budget_left}. Rounds remaining: "
    )
    return message, budget_left


def run_analysis(symptom: str) -> dict:
    messages = [{"role": "user", "content": symptom}]
    already_run = set()
    budget_left = MAX_QUERIES

    for round_no in range(1, MAX_ROUNDS + 1):
        raw, step = call_analysis(messages)
        messages.append({"role": "assistant", "content": raw})

        if step.get("action") == "final":
            return step

        print_round(step)
        result_message, budget_left = execute_step(step, already_run, budget_left)
        rounds_left = MAX_ROUNDS - round_no
        result_message += str(rounds_left)
        if rounds_left == 0 or budget_left == 0:
            result_message += "\n\nBudget exhausted. Return the final JSON now."
        messages.append({"role": "user", "content": result_message})

    raw, step = call_analysis(messages)
    return step


def run_explain(analysis: dict):
    print("\n" + "=" * 60 + "\n")
    with client.messages.stream(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=DIAGNOSIS_EXPLAIN_PROMPT,
        messages=[{"role": "user", "content": json.dumps(analysis, default=str)}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
    print("\n")


def run_diagnosis_agent(symptom: str):
    print("Investigating...")
    analysis = run_analysis(symptom)
    if analysis.get("action") != "final":
        print("Analysis did not finish cleanly. Last state:")
        print(json.dumps(analysis, indent=2))
        return
    print(f"\nPath: {' → '.join(analysis.get('path', []))}")
    run_explain(analysis)

def stream_diagnosis_agent(symptom: str):
    messages = [{"role": "user", "content": symptom}]
    already_run = set()
    budget_left = MAX_QUERIES
    final = None

    yield {"type": "step", "text": "Forming hypotheses"}

    for round_no in range(1, MAX_ROUNDS + 1):
        raw, step = call_analysis(messages)
        messages.append({"role": "assistant", "content": raw})

        if step.get("action") == "final":
            final = step
            break

        yield {
            "type": "round",
            "round": step.get("round", round_no),
            "hypotheses": step.get("hypotheses", []),
            "reason": step.get("reason", ""),
            "queries": [q["query_id"] for q in step.get("queries", [])],
        }

        result_message, budget_left = execute_step(step, already_run, budget_left)
        rounds_left = MAX_ROUNDS - round_no
        result_message += str(rounds_left)
        if rounds_left == 0 or budget_left == 0:
            result_message += "\n\nBudget exhausted. Return the final JSON now."
        messages.append({"role": "user", "content": result_message})

        yield {"type": "step", "text": "Weighing the evidence"}

    if final is None:
        raw, final = call_analysis(messages)

    if final.get("action") != "final":
        yield {"type": "error", "message": "The investigation didn't finish. Ask again or narrow the question."}
        return

    yield {
        "type": "conclusion",
        "hypotheses": final.get("hypotheses", []),
        "conclusion": final.get("conclusion", {}),
        "path": final.get("path", []),
    }
    yield {"type": "step", "text": "Writing the diagnosis"}

    with client.messages.stream(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=DIAGNOSIS_EXPLAIN_PROMPT,
        messages=[{"role": "user", "content": json.dumps(final, default=str)}],
    ) as stream:
        for text in stream.text_stream:
            yield {"type": "answer_chunk", "text": text}


if __name__ == "__main__":
    symptom = "Why did the CPC for Btech Admissions 2026 jump from ₹16.63 on 4 Sep to over ₹30 on 6 and 7 Sep?"
    run_diagnosis_agent(symptom)