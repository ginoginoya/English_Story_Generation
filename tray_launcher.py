import os
import subprocess
import sys
import time
import threading
import webbrowser
from pystray import Icon, Menu, MenuItem
from PIL import Image, ImageDraw

# --- Configuration ---
NODE_SERVER = "server.js"
TTS_SERVER = "tts_server.py"
PORT = 7000
URL = f"http://localhost:{PORT}"

processes = []

def create_image():
    # Create a simple icon: a blue circle with a star
    width = 64
    height = 64
    image = Image.new('RGB', (width, height), (30, 30, 30))
    dc = ImageDraw.Draw(image)
    dc.ellipse([10, 10, 54, 54], fill=(0, 120, 215)) # Win11 Blue
    dc.text((25, 20), "T", fill=(255, 255, 255))
    return image

def launch_processes():
    global processes
    # 1. Start Node.js Server
    node_proc = subprocess.Popen(
        ["node", NODE_SERVER],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW
    )
    processes.append(node_proc)

    # 2. Start TTS Server (using the venv python)
    python_exe = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = sys.executable # Fallback

    tts_proc = subprocess.Popen(
        [python_exe, TTS_SERVER],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW
    )
    processes.append(tts_proc)

def stop_all(icon, item):
    global processes
    for p in processes:
        p.terminate()
    icon.stop()
    sys.exit(0)

def open_browser(icon, item):
    webbrowser.open(URL)

def setup(icon):
    icon.visible = True
    # Wait a bit for server to start, then open browser
    time.sleep(2)
    webbrowser.open(URL)

def main():
    # Launch servers in background
    launch_processes()

    # Create System Tray Icon
    icon = Icon(
        "TOEIC Helper",
        icon=create_image(),
        menu=Menu(
            MenuItem("開啟多益助手 (Open)", open_browser),
            MenuItem("完全退出 (Exit)", stop_all)
        )
    )

    # Run icon in main thread
    icon.run(setup=setup)

if __name__ == "__main__":
    # Ensure we are in the correct directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()
