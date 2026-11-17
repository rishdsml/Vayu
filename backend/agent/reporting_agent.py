import json
import anthropic
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from agent.query_engine import run_queries
from agent.reporting_prompts import INTENT_AGENT_PROMPT, EXPLAIN_AGENT_PROMPT

CLIENT_ID = "d1e2971e-e7c9-4bfe-8594-e73cf2ddb927"
client = anthropic.Anthropic()

with open("agent/reporting_arsenal.json") as f:
    REPORTING_ARSENAL = json.load(f)


def run_intent_agent(user_message: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=INTENT_AGENT_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )
    raw = response.content[0].text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def run_explain_agent(entity_level: str, date_range: dict,
                      trend_result: dict, comparison_result: dict) -> str:
    user_message = f"""
Entity level: {entity_level}
Date range: {date_range['start_date']} to {date_range['end_date']}

Daily dataset:
{json.dumps(trend_result['rows'], indent=2, default=str)}

Aggregated dataset:
{json.dumps(comparison_result['rows'], indent=2, default=str)}
"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=EXPLAIN_AGENT_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )
    return response.content[0].text.strip()


def run_reporting_agent(user_message: str) -> str:

    print("Running intent agent...")
    intent = run_intent_agent(user_message)
    print(f"Intent: {json.dumps(intent, indent=2)}")

    entity_level = intent["entity_level"]
    date_range = intent["date_range"]
    query_ids = intent["query_ids"]

    params = {
        "client_id": CLIENT_ID,
        "start_date": date_range["start_date"],
        "end_date": date_range["end_date"]
    }

    queries = []
    for query_id in query_ids:
        query_def = REPORTING_ARSENAL[entity_level][query_id]
        queries.append({
            "query_id": query_id,
            "query": query_def["query"],
            "params": params
        })

    print(f"Running {len(queries)} queries in parallel...")
    results = run_queries(queries)

    results_by_id = {r["query_id"]: r for r in results}

    trend_id = query_ids[0]
    comparison_id = query_ids[1]
    trend_result = results_by_id[trend_id]
    comparison_result = results_by_id[comparison_id]

    print(f"Trend rows: {len(trend_result['rows'])}")
    print(f"Comparison rows: {len(comparison_result['rows'])}")

    print("Running explain agent...")
    report = run_explain_agent(entity_level, date_range, trend_result, comparison_result)

    return report

def stream_reporting_agent(user_message: str):
    yield {"type": "step", "text": "Understanding your request"}
    intent = run_intent_agent(user_message)

    entity_level = intent["entity_level"]
    date_range = intent["date_range"]
    query_ids = intent["query_ids"]

    yield {
        "type": "intent",
        "entity_level": entity_level,
        "date_range": date_range,
        "reasoning": intent.get("reasoning", ""),
    }

    params = {
        "client_id": CLIENT_ID,
        "start_date": date_range["start_date"],
        "end_date": date_range["end_date"],
    }
    queries = [
        {"query_id": qid, "query": REPORTING_ARSENAL[entity_level][qid]["query"], "params": params}
        for qid in query_ids
    ]

    yield {"type": "queries", "ids": query_ids}
    results = run_queries(queries)
    by_id = {r["query_id"]: r for r in results}
    trend, comparison = by_id[query_ids[0]], by_id[query_ids[1]]

    yield {"type": "step", "text": f"Read {len(trend['rows'])} daily rows and {len(comparison['rows'])} totals. Writing the report"}

    content = f"""
Entity level: {entity_level}
Date range: {date_range['start_date']} to {date_range['end_date']}

Daily dataset:
{json.dumps(trend['rows'], default=str)}

Aggregated dataset:
{json.dumps(comparison['rows'], default=str)}
"""
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=EXPLAIN_AGENT_PROMPT,
        messages=[{"role": "user", "content": content}],
    ) as stream:
        for text in stream.text_stream:
            yield {"type": "answer_chunk", "text": text}


if __name__ == "__main__":
    user_message = "Give me a campaign performance report last 7 days"
    report = run_reporting_agent(user_message)
    print("\n" + "="*60)
    print(report)