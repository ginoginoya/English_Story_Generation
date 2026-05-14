# 星辰大海 | 多益單字探索系統 (TOEIC Helper)

這是一個基於 Node.js 與 Python 混合架構的專業多益單字學習與 AI 故事生成系統。

## 👤 開發者資訊
- **開發者**: Gino
- **Email**: ginoginoya@gmail.com

## 🚀 核心功能
- **單字探索**: 基於 SQLite 數據庫的高效單字查詢與瀏覽。
- **AI 故事生成**: 串接 LM Studio (Gemma/Llama 模型)，根據選定單字生成情境故事。
- **AI 深度翻譯**: 透過 AI 進行符合文學語感的英翻中，並自動標註重點單字。
- **TTS 語音合成**: 整合 Kokoro ONNX 語音引擎，提供高品質的離線美語發音，支持多種音色與語速調節。

## 🛠️ 技術棧
- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Backend**: Node.js (Express)
- **AI Backend**: LM Studio (OpenAI Compatible API)
- **TTS Engine**: Python (FastAPI + Kokoro-ONNX)
- **Database**: SQLite3

## 📦 安裝與啟動

### 1. 前置需求
- 安裝 [Node.js](https://nodejs.org/)
- 安裝 [Python 3.10+](https://www.python.org/)
- 安裝 [LM Studio](https://lmstudio.ai/) 並載入推薦模型 (如 `Gemma 2 9B` 或 `Gemma 4 E4B`)

### 2. 快速啟動
直接雙擊執行目錄下的：
```bash
啟動多益助手.bat
```
該腳本會自動完成以下動作：
- 檢查並建立 Python 虛擬環境 (`venv`)
- 安裝 Python 與 Node.js 必要依賴
- 啟動 TTS 語音引擎 (背景執行)
- 啟動 Node.js 網頁伺服器
- 自動開啟瀏覽器進入系統

## 📂 專案結構
- `app.js`: 前端 UI 互動邏輯。
- `server.js`: Node.js 後端，負責資料庫讀取與 AI 代理請求。
- `tts_server.py`: Python 語音伺服器，負責 Kokoro TTS 生成。
- `toeic_v2.db`: 核心單字數據庫。
- `style.css`: 現代化毛玻璃質感 (Glassmorphism) 樣式。

---
*Powered by AI Coding Assistant Antigravity*
