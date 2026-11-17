import json
import psycopg2
from dotenv import load_dotenv
from psycopg2 import OperationalError
import os

load_dotenv()

def test_connect():

    conn_string = os.getenv("CONN_STRING_POSTGRES")

    try:

        with psycopg2.connect(conn_string) as conn:
          with conn.cursor() as cursor:
            
            cursor.execute("SELECT version();")
            db_version = cursor.fetchone()
            print(f"Connected successfully! Server version: {db_version}")

    except OperationalError as err:
            print(f"Database connection error: {err}")

if __name__ == "__main__":
    test_connect()
    print("Connection success")

