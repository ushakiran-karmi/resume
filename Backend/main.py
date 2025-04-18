from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import os
import shutil
import requests
import fitz  # PyMuPDF
import logging
from pydantic import BaseModel
from datetime import datetime
import uuid
from dotenv import load_dotenv
import json

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Resume Analysis API",
    version="1.0.0",
    description="API for analyzing and ranking resumes against job descriptions",
    docs_url="/docs",
    redoc_url=None
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FILE_TYPES = ["application/pdf"]
AI_MODEL = "llama3-70b-8192"
TEMPERATURE = 0.7
TIMEOUT = 30  # seconds

# Load environment variables
AI_API_KEY = os.getenv("AI_API_KEY")
if not AI_API_KEY:
    logger.error("AI_API_KEY environment variable not set!")
    raise RuntimeError("AI_API_KEY environment variable is required")

API_ENDPOINT = os.getenv("API_ENDPOINT", "https://api.groq.com/openai/v1/chat/completions")

# Response Models
class Candidate(BaseModel):
    filename: str
    ranking: int
    suitability_score: int
    strengths: List[str]
    weaknesses: List[str]
    summary: str
    recommendation: str

class AnalysisResponse(BaseModel):
    success: bool
    candidates: List[Candidate]
    request_id: str
    timestamp: str
    processed_files: int

class ErrorResponse(BaseModel):
    success: bool
    error: str
    request_id: str
    timestamp: str
    details: Optional[str] = None

# Utility Functions
def generate_request_id() -> str:
    return str(uuid.uuid4())

def get_timestamp() -> str:
    return datetime.now().isoformat()

def validate_file(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Only PDF files are allowed."
        )
    
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset pointer
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{file.filename}' too large ({file_size//1024}KB). Max size is {MAX_FILE_SIZE//(1024*1024)}MB"
        )

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        doc = fitz.open(pdf_path)
        text = "".join([page.get_text() for page in doc])
        logger.debug(f"Extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract text from PDF: {str(e)}"
        )

def analyze_with_ai(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "model": AI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": TEMPERATURE
    }

    try:
        logger.info("Sending request to AI API...")
        response = requests.post(
            API_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        
        response_data = response.json()
        analysis = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        logger.info("Received response from AI API")
        return analysis
    
    except requests.exceptions.RequestException as e:
        logger.error(f"AI API request failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service unavailable: {str(e)}"
        )

# API Endpoints
@app.post(
    "/analyze-resumes",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        502: {"model": ErrorResponse}
    }
)
async def analyze_resumes(
    files: List[UploadFile] = File(...),
    description: str = Form(...)):
    
    request_id = generate_request_id()
    timestamp = get_timestamp()
    
    try:
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files uploaded"
            )
        
        if not description.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job description cannot be empty"
            )

        resume_data = []
        for file in files:
            validate_file(file)
            unique_filename = f"{uuid.uuid4()}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                resume_text = extract_text_from_pdf(file_path)
                resume_data.append({
                    "filename": file.filename,
                    "content": resume_text
                })
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)

        # Structured prompt
        prompt = f"""
You are a resume analysis expert. Analyze the resumes against the job description below.

Return a JSON array where each object includes:
- filename (string)
- ranking (integer)
- suitability_score (integer from 0 to 100)
- strengths (array of strings)
- weaknesses (array of strings)
- summary (string)
- recommendation (string)

Job Description:
{description.strip()}

Resumes:
{resume_data}

ONLY return the JSON array without explanation.
"""

        analysis_text = analyze_with_ai(prompt)

        try:
            candidates = json.loads(analysis_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI JSON: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse AI response into structured format."
            )

        return {
            "success": True,
            "candidates": candidates,
            "request_id": request_id,
            "timestamp": timestamp,
            "processed_files": len(resume_data)
        }

    except HTTPException as he:
        logger.error(f"Request {request_id} failed: {he.detail}")
        raise he
        
    except Exception as e:
        logger.error(f"Unexpected error in request {request_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/api/download/{filename}")
def download_file(filename: str):
    return FileResponse(f"uploads/{filename}", media_type='application/pdf', filename=filename)
