import os
import sys

# 處理 pythonw 模式下的輸出重定向
try:
    if sys.stdout is None or not hasattr(sys.stdout, 'write'):
        sys.stdout = open(os.devnull, 'w')
    if sys.stderr is None or not hasattr(sys.stderr, 'write'):
        sys.stderr = open(os.devnull, 'w')
except:
    pass



# 執行檢查 (已由 .bat 處理，此處移除以加快啟動速度)
# ensure_dependencies()

# 建立絕對路徑以確保模型載入成功
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "kokoro-v1.0.onnx")
VOICES_PATH = os.path.join(BASE_DIR, "voices-v1.0.bin")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from kokoro_onnx import Kokoro
import soundfile as sf
import io
import uvicorn
from fastapi.responses import StreamingResponse

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model
try:
    kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
    print("Kokoro model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    kokoro = None

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_sky" # Default female voice
    speed: float = 1.0

@app.post("/v1/audio/speech")
async def generate_speech(request: TTSRequest):
    if not kokoro:
        raise HTTPException(status_code=500, detail="Kokoro model not loaded.")
    
    try:
        samples, sample_rate = kokoro.create(
            request.text,
            voice=request.voice,
            speed=request.speed,
            lang="en-us"
        )
        
        # Convert to WAV byte stream
        wav_io = io.BytesIO()
        sf.write(wav_io, samples, sample_rate, format='WAV')
        wav_io.seek(0)
        
        return StreamingResponse(wav_io, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8888, log_level="error")
