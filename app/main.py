import os, re, base64, httpx
from fastapi import FastAPI, File, UploadFile, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

API_KEY = os.getenv("DOC_AI_API_KEY", "dev-key")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

app = FastAPI()
key_header = APIKeyHeader(name="X-API-Key")

def verify(key: str = Security(key_header)):
    if key != API_KEY:
        raise HTTPException(403, "Invalid API key")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/extract")
async def extract(file: UploadFile = File(...), _=Security(verify)):
    data = await file.read()
    base64_image = base64.b64encode(data).decode()

    # Exact prompt from parent repo (process.routes.ts)
    prompt = """You are an OCR assistant. Extract information from this Indian identity document and return ONLY a valid JSON object with these fields:
{ "name": "", "dob": "", "gender": "", "id_number": "", "address": "", "father_name": "", "expiry": "" }
Rules:
- Fill only fields visible in the document. Leave others as empty string.
- dob format: DD/MM/YYYY
- id_number: Aadhaar (12 digits), PAN (10 chars), Passport number, Voter ID etc.
- Do NOT include any explanation, only the JSON object."""

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [{"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]}],
                "max_tokens": 300,
            }
        )

    text = r.json()["choices"][0]["message"]["content"]
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise HTTPException(500, f"Could not parse AI response: {text[:200]}")

    import json
    return json.loads(match.group())
