from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from phishing_detection import analyze_url

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage — resets when the server restarts.
# (Later you could swap this for a real database like SQLite.)
scan_history: list[dict] = []

class ScanRequest(BaseModel):
    url: str

@app.post("/api/scan")
def scan(request: ScanRequest):
    result = analyze_url(request.url)
    result["scannedAt"] = datetime.now(timezone.utc).isoformat()
    scan_history.insert(0, result)  # newest scan goes first
    return result

@app.get("/api/history")
def get_history():
    return scan_history

@app.get("/api/stats")
def get_stats():
    total = len(scan_history)
    safe = sum(1 for r in scan_history if r["status"] == "safe")
    return {"total": total, "safe": safe, "risk": total - safe}