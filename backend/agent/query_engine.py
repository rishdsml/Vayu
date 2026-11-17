import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

load_dotenv()


def run_query(query: str, params: dict) -> dict:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        rows = [dict(row) for row in cur.fetchall()]
        columns = list(rows[0].keys()) if rows else []
        return {
            "columns": columns,
            "rows": rows
        }
    except Exception as e:
        print(f"Query failed: {e}")
        raise
    finally:
        conn.close()


def run_queries(queries: list[dict], workers: int = 4) -> list[dict]:
    """
    queries = [
        {"query": "SELECT ...", "params": {...}},
        {"query": "SELECT ...", "params": {...}},
    ]
    """
    def execute(q):
        result = run_query(q["query"], q["params"])
        result["query_id"] = q.get("query_id")
        return result

    with ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(execute, queries))

    return results