# LM Studio (v0.4.12) 安裝、設定與 AI 測試全攻略

> [!IMPORTANT]
> **導讀建議**：本手冊僅供基礎環境安裝與 API 連線測試使用。
> 關於目前開發環境所建議使用的**最佳模型清單與參數配置**，請務必優先參考：
> [LM_Studio_目前硬體_設定與模型選擇.md](file:///d:/user/Desktop/AI/Antigravity/%E5%A4%9A%E7%9B%8A%E5%96%AE%E5%AD%97%E5%BD%99%E6%95%B4%E7%B6%B2%E9%A0%81/LM%20Studio/LM_Studio_%E7%9B%AE%E5%89%8D%E7%A1%AC%E9%AB%94_%E8%A8%AD%E5%AE%9A%E8%88%87%E6%A8%A1%E5%9E%8B%E9%81%B8%E6%93%87.md)

---

## 一、 軟體安裝與初始設定
1.  **下載**：從 [lmstudio.ai](https://lmstudio.ai/) 下載 Windows 版本並安裝。
2.  **初始畫面**：安裝後會看到 "Your first model" 畫面，推薦 Gemma 等模型，可點擊 **Skip for now** 進入主程式。
3.  **進階設定 (Advanced Settings)**：
    *   建議開啟 **Developer Mode (開發者模式)**。
    *   可選擇是否開啟 **Start local LLM service on login** (隨開機啟動)。

## 二、 模型搜尋與下載 (重要步驟)
1.  **進入搜尋**：點擊左側導覽列第四個圖示 **「放大鏡 (Model Search)」**。
2.  **關鍵字**：搜尋 `Llama 3 8B Instruct`。目前選擇的是 **「lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF」**
3.  **版本選擇**：在右側下載清單中，針對 **16GB 顯存 (VRAM)** 的設備，強烈建議選擇 **`Q8_0`** 版本 (約 8.5 GB)，這能提供近乎完美的智商與精確度。
4.  **下載**：點擊藍色的 **Download** 按鈕，等待進度條完成。

## 三、 模型加載與硬體優化
1.  **加載模型**：點擊 **Load Model** 按鈕。或者到左側導覽列點選My Models按鈕(由上往下數第三個圖示)，然後選中剛剛下載的Model並點擊設定按鈕，並於右側出現的視窗中點擊Load Model按鈕。
2.  **加載參數**：
    *   **Auto Unload (TTL)**：開發期間建議關閉，避免 AI 因為閒置而自動卸載。
    *   **Context Length**：設定為 `8192` 或 `4096`，功能是決定AI一次可以處理多少資訊，包含輸入與輸出的總字數。例如：產生單字故事。
    *   **GPU Offload**：確保設定為最高值 (32)，讓 AI 完全由顯卡執行。
    *   **GPU Threads**：建議設定為 6，功能是設定AI在產生內容時，可以動用幾個核心去算圖。
    *   **Evaluation Batch Size**：設定為 `512`，功能是一次處理的輸入 Token 數量。提高此數值可以提升效能（速度），但代價是增加記憶體的使用量。
    *   **Max Concurrent requests**：設定為 4~8，功能是決定在同一時間，AI可以同時處理幾個請求。
3.  **確認狀態**：視窗頂部出現模型名稱，且按鈕變為 **Unload Model** 即代表加載成功。

## 四、 本地伺服器啟動 (Developer 模式)
1.  **切換分頁**：點擊左側導覽列的 **「Developer (開發者)」** 圖示 (由上往下數第二個)。
2.  **啟動 Server**：在 **Local Server** 子分頁中，將頂部的 **Status** 開關切換為 **Running (綠色)**。
3.  **關鍵設定**：
    *   確認伺服器監聽於 `http://localhost:1234`。
    *   **CORS 設定**：在 Server Settings 中將 **CORS 設為 Enabled**，這是讓網頁能夠連線 AI 的必要條件。

## 五、 AI 效能與功能測試
1.  **進入 AI Chat**：點擊左側第一個圖示 **「紫色外星人 (AI Chat)」**。
2.  **新增一個聊天室**：點選 New Chat按鈕。並且將上方的模型點開選擇，目前已經Load的模型。
3.  **設定 System Prompt**：在右側欄位輸入以下指令，這能確保 AI 回傳格式正確的雙語故事：
    ```text
Role: You are a bilingual TOEIC vocabulary tutor.
Task: Write a short story (50-100 words) using the vocabulary provided in the user prompt.

Output Structure Requirements:
1. Wrap the English story with <en_story> tags.
2. Wrap the Traditional Chinese translation with <zh_story> tags.
3. IMPORTANT: No introductory text, no conversational filler, and no closing remarks. Only output the tags and their content.

Content Rules:
- Language Level: Use simple English suitable for high school freshmen (CEFR A2).
- Keyword Highlight: You MUST wrap the provided vocabulary words in **double asterisks** (e.g., **schedule**) within both English and Chinese versions.
- Context: Ensure the story is logical and helpful for learning TOEIC vocabulary.

Example Output Format:
<en_story>
Lily had a busy **schedule** today because of her **interview**.
</en_story>
<zh_story>
莉莉今天因為**面試**而有很忙的**行程**。
</zh_story>
    ```
4.  **執行測試**：在對話框輸入單字清單 (例如：`purchase, receipt, refund`)。
5.  **成功指標**：AI 應直接產出包含 `<en_story>` 與 `<zh_story>` 標籤的內容，且關鍵字被 `**` 包圍，無任何多餘廢話。

---

## 💡 備註：針對 5070 Ti (16GB VRAM) 的評價
根據測試，此配備在跑 Llama 3 8B Q8_0 時，生成速度極快 (約 80+ tokens/sec)，且能同時支援多個併發請求 (Concurrent Predictions 可設為 4-8)，是非常理想的本地 AI 開發環境。
