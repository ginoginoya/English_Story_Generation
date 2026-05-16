import os
import subprocess
import sys
import time
import threading
import webbrowser
from pystray import Icon, Menu, MenuItem # 引入系統匣圖示庫
from PIL import Image, ImageDraw # 引入圖像處理庫以產生圖示

# --- 核心配置 ---
NODE_SERVER = "server.js" # Node.js 伺服器腳本名稱
TTS_SERVER = "tts_server.py" # Python TTS 伺服器腳本名稱
PORT = 7000 # Web 伺服器監聽的連接埠
URL = f"http://localhost:{PORT}" # 前端網頁的本地連線網址

processes = [] # 用於存儲已啟動進程的列表

def create_image():
    # 建立一個簡單的圖示：藍色圓圈內含一個 "T" 字母
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), (30, 30, 30)) # 建立深灰色底圖
    dc = ImageDraw.Draw(image)
    dc.ellipse([10, 10, 54, 54], fill=(0, 120, 215)) # 繪製 Win11 藍色風格的圓形
    dc.text((25, 20), "T", fill=(255, 255, 255)) # 在中央繪製白色的 T 字
    return image

def launch_processes():
    global processes
    # 1. 啟動 Node.js 伺服器 (後端 API)
    node_proc = subprocess.Popen(
        ["node", NODE_SERVER],
        stdout=subprocess.DEVNULL, # 隱藏標準輸出
        stderr=subprocess.DEVNULL, # 隱藏錯誤輸出
        creationflags=subprocess.CREATE_NO_WINDOW # 在 Windows 上隱藏命令提示字元視窗
    )
    processes.append(node_proc)

    # 2. 啟動 TTS 伺服器 (語音生成)
    # 優先使用虛擬環境 (venv) 中的 python.exe 以確保依賴庫正確
    python_exe = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = sys.executable # 如果沒找到 venv，則回退到系統預設的 python

    tts_proc = subprocess.Popen(
        [python_exe, TTS_SERVER],
        stdout=subprocess.DEVNULL, # 隱藏標準輸出
        stderr=subprocess.DEVNULL, # 隱藏錯誤輸出
        creationflags=subprocess.CREATE_NO_WINDOW # 在 Windows 上隱藏視窗
    )
    processes.append(tts_proc)

def stop_all(icon, item):
    # 完全退出：終止所有後端進程並關閉系統匣圖示
    global processes
    for p in processes:
        p.terminate() # 傳送終止信號給子進程
    icon.stop() # 停止系統匣圖示運行
    sys.exit(0) # 退出主程式

def open_browser(icon, item):
    # 手動從選單開啟瀏覽器
    webbrowser.open(URL)

def setup(icon):
    # 圖示啟動後的初始化動作
    icon.visible = True
    # 等待 2 秒讓伺服器完成啟動，隨後自動開啟瀏覽器頁面
    time.sleep(2)
    webbrowser.open(URL)

def main():
    # 1. 在背景啟動伺服器群組
    launch_processes()

    # 2. 建立系統匣 (System Tray) 圖示與選單
    icon = Icon(
        "TOEIC Helper",
        icon=create_image(),
        menu=Menu(
            MenuItem("開啟多益助手 (Open)", open_browser), # 第一個選單項
            MenuItem("完全退出 (Exit)", stop_all)         # 第二個選單項
        )
    )

    # 3. 運行圖示 (在主執行緒中阻塞運行)
    icon.run(setup=setup)

if __name__ == "__main__":
    # 確保工作路徑為腳本所在的絕對目錄，避免路徑錯誤
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()
