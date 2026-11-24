"""
LNMIIT Smart Healthcare System - FastAPI AI/NLP Service
Runs on port 8000. Provides report summarization and health chat triage.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from summarizer import summarize_report
from chatbot import classify_and_respond

app = FastAPI(
    title="LNMIIT Bio-NLP Healthcare Microservice",
    version="1.0.0",
    description="Campus clinical report summarization and symptom classification service"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SummarizeRequest(BaseModel):
    text: str
    title: Optional[str] = ""

class ChatRequest(BaseModel):
    message: str
    studentId: Optional[str] = None
    latestVitals: Optional[Dict[str, Any]] = None

@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": "LNMIIT Bio-NLP Service",
        "models": {
            "summarizer": "Structured Clinical NLP Extractor (T5 Interface Ready)",
            "urgency_classifier": "BioBERT Clinical Urgency Classifier (Interface Ready)"
        }
    }

@app.post("/api/summarize")
def summarize(req: SummarizeRequest):
    return summarize_report(req.text, req.title)

@app.post("/api/chat")
def chat(req: ChatRequest):
    return classify_and_respond(req.message, req.latestVitals)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
