import os
import psycopg2
from google_auth_oauthlib.flow import Flow
from dotenv import load_dotenv
import secrets
import hashlib
import base64
import requests

load_dotenv()

code_verifier = None 

SCOPES = ["https://www.googleapis.com/auth/adwords"]
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

def get_flow():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")],
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    return flow

def get_auth_url():

    global code_verifier
    code_verifier = secrets.token_urlsafe(32)

    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode()
    flow = get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        code_challenge=code_challenge,
        code_challenge_method="S256"
    )
    return auth_url

def save_token(email: str, refresh_token: str):
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO connected_accounts (email, refresh_token, customer_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (email)
        DO UPDATE SET 
            refresh_token = EXCLUDED.refresh_token,
            customer_id = EXCLUDED.customer_id
    """, (email, refresh_token, "5506504133"))
    conn.commit()
    cur.close()
    conn.close()

def list_accessible_accounts(access_token: str):
    url = "https://googleads.googleapis.com/v26/customers:listAccessibleCustomers"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    response = requests.get(url, headers=headers)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text)
    return response.json()

def handle_callback(code: str):
    global code_verifier
    flow = get_flow()
    flow.fetch_token(code=code, code_verifier=code_verifier )
    credentials = flow.credentials

    print("ACCESS TOKEN:", credentials.token)      
    print("REFRESH TOKEN:", credentials.refresh_token)

    access_token = credentials.token
    refresh_token = credentials.refresh_token

    accounts = list_accessible_accounts(access_token)
    print("ACCOUNTS:", accounts)

    email = "rishavmitra21@gmail.com"
    save_token(email, refresh_token)
    return refresh_token

