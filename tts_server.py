import os
import sys

# 處理 pythonw 模式下的輸出重定向（當在背景運行時，避免因缺少控制台而崩潰）
try:
    if sys.stdout is None or not hasattr(sys.stdout, 'write'):
        sys.stdout = open(os.devnull, 'w') # 將標準輸出重新導向至黑洞
    if sys.stderr is None or not hasattr(sys.stderr, 'write'):
        sys.stderr = open(os.devnull, 'w') # 將錯誤輸出重新導向至黑洞
except:
    pass # 忽略所有重定向錯誤

# 建立絕對路徑以確保模型與語音檔案載入成功
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # 獲取當前腳本所在的目錄
MODEL_PATH = os.path.join(BASE_DIR, "kokoro-v1.0.onnx") # 定義 ONNX 模型檔案路徑
VOICES_PATH = os.path.join(BASE_DIR, "voices-v1.0.bin") # 定義語音特徵檔案路徑

from fastapi import FastAPI, HTTPException # 引入 FastAPI 框架與異常處理模組
from fastapi.middleware.cors import CORSMiddleware # 引入 CORS 中間件支援
from pydantic import BaseModel # 引入數據模型驗證工具
from kokoro_onnx import Kokoro # 引入 Kokoro ONNX 語音引擎
import soundfile as sf # 引入音訊處理庫以寫入音訊檔案格式
import io # 引入 IO 模組處理記憶體緩衝
import uvicorn # 引入 ASGI 伺服器
from fastapi.responses import StreamingResponse # 引入串流響應工具

# 初始化 FastAPI 應用程式
app = FastAPI()

# 設定 CORS 中間件，允許前端跨來源請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 允許所有來源
    allow_credentials=True, # 允許傳送認證資訊
    allow_methods=["*"], # 允許所有 HTTP 方法 (GET, POST 等)
    allow_headers=["*"], # 允許所有標頭內容
)

# 初始化 Kokoro 語音模型
try:
    kokoro = Kokoro(MODEL_PATH, VOICES_PATH) # 建立 Kokoro 實例
    print("Kokoro model loaded successfully!") # 在控制台輸出載入成功訊息
except Exception as e:
    print(f"Error loading model: {e}") # 輸出載入失敗的錯誤原因
    kokoro = None # 若載入失敗，將變數設為 None

# 定義 TTS 請求的數據結構
class TTSRequest(BaseModel):
    text: str # 待轉換的文字內容
    voice: str = "af_sky" # 語音角色（預設為 af_sky 女聲）
    speed: float = 1.0 # 語速（預設為 1.0 倍速）

# 定義語音生成 API 路由
@app.post("/v1/audio/speech")
async def generate_speech(request: TTSRequest):
    if not kokoro: # 如果模型未正確載入
        raise HTTPException(status_code=500, detail="Kokoro model not loaded.") # 拋出伺服器錯誤
    
    try:
        # 使用 Kokoro 引擎生成音訊採樣
        samples, sample_rate = kokoro.create(
            request.text, # 輸入文字
            voice=request.voice, # 指定語音角色
            speed=request.speed, # 指定語速
            lang="en-us" # 固定為美式英語
        )
        
        # 將生成的音訊採樣轉換為 WAV 位元流 (Byte Stream)
        wav_io = io.BytesIO() # 建立記憶體緩衝區
        sf.write(wav_io, samples, sample_rate, format='WAV') # 將數據寫入 WAV 格式
        wav_io.seek(0) # 將指標重設回流的起始位置
        
        # 回傳串流響應，以便前端能直接播放或下載
        return StreamingResponse(wav_io, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) # 捕捉生成過程中的所有錯誤

# 腳本執行入口
if __name__ == "__main__":
    # 啟動伺服器，監聽本機 8888 埠，僅顯示錯誤層級日誌
    uvicorn.run(app, host="127.0.0.1", port=8888, log_level="error")
