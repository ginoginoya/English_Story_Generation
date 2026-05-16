const express = require('express'); // 引入 Express 框架以建立 Web 伺服器
const sqlite3 = require('sqlite3').verbose(); // 引入 SQLite3 並開啟詳細日誌模式以進行資料庫操作
const cors = require('cors'); // 引入 CORS 中間件以處理跨來源資源共用請求
const path = require('path'); // 引入 Path 模組以處理與轉換檔案路徑
const { exec } = require('child_process'); // 引入 exec 函式以執行系統外部指令
// --------------------------------------------------------------------------------
const app = express(); // 初始化 Express 應用程式實例
const PORT = 7000; // 定義伺服器監聽的連接埠號碼為 7000
const DB_PATH = path.join(__dirname, 'toeic_v2.db'); // 設定資料庫檔案的絕對路徑
// --------------------------------------------------------------------------------
// 中間件 (Middleware) 設定
app.use(cors()); // 在應用程式層級啟用 CORS 支援
app.use(express.json()); // 啟用 JSON 解析器以讀取 POST 請求中的 JSON 內容
app.use(express.static(__dirname)); // 將當前目錄設為靜態檔案服務的根目錄
// --------------------------------------------------------------------------------
// 資料庫連線設定
const db = new sqlite3.Database(DB_PATH, (err) => { // 嘗試連接至指定的 SQLite 資料庫檔案
    if (err) { // 如果連線過程中發生錯誤
        console.error('資料庫連線錯誤:', err.message); // 在控制台輸出錯誤訊息
    } else { // 如果成功連線
        console.log('已成功連線至 TOEIC SQLite 資料庫。'); // 在控制台輸出成功訊息
    } // 結束條件判斷
}); // 結束資料庫建構函式呼叫
// --------------------------------------------------------------------------------
// 單詞數據 API：從資料庫獲取單詞、類別和詳細釋義
app.get('/api/vocabulary', async (req, res) => { // 定義 GET 路由以獲取所有單字數據
    try { // 開始錯誤處理區塊
        // 獲取所有單詞
        const words = await new Promise((resolve, reject) => { // 建立 Promise 以非同步方式查詢單字表
            db.all("SELECT id, text FROM words ORDER BY text ASC", [], (err, rows) => err ? reject(err) : resolve(rows)); // 執行 SQL 查詢並返回結果
        }); // 結束單字查詢 Promise
        // ----------------------------------------------------------------------------
        // 獲取所有單詞類別
        const categories = await new Promise((resolve, reject) => { // 建立 Promise 以非同步方式查詢類別表
            db.all("SELECT id, category FROM word_categories", [], (err, rows) => err ? reject(err) : resolve(rows)); // 執行查詢並獲取類別數據
        }); // 結束類別查詢 Promise
        // ----------------------------------------------------------------------------
        // 獲取所有釋義與例句
        const senses = await new Promise((resolve, reject) => { // 建立 Promise 以非同步方式查詢釋義表
            db.all("SELECT word_id, pos, ipa, kk, definition_zh, example_en, example_zh FROM senses", [], (err, rows) => err ? reject(err) : resolve(rows)); // 執行查詢獲取詳細解釋
        }); // 結束釋義查詢 Promise
        // ----------------------------------------------------------------------------
        // 建立 Hash Map 以提升數據合併效能 (O(1) 查找)
        const catMap = {}; // 初始化空的類別對照表
        for (const c of categories) { // 遍歷獲取到的所有類別數據
            if (!catMap[c.id]) catMap[c.id] = []; // 如果 ID 尚不在對照表中，則初始化空陣列
            catMap[c.id].push(c.category); // 將類別名稱加入對應 ID 的陣列中
        } // 結束類別遍歷
        // ----------------------------------------------------------------------------
        const senseMap = {}; // 初始化空的釋義對照表
        for (const s of senses) { // 遍歷獲取到的所有釋義數據
            if (!senseMap[s.word_id]) senseMap[s.word_id] = []; // 如果單字 ID 尚不在對照表中，則初始化
            senseMap[s.word_id].push({ // 將詳細數據物件存入對應單字 ID 的陣列
                pos: s.pos, ipa: s.ipa, kk: s.kk, // 包含詞性與音標數據
                definition_zh: s.definition_zh, // 包含中文定義
                example_en: s.example_en, // 包含英文例句
                example_zh: s.example_zh // 包含例句中文翻譯
            }); // 結束釋義物件推送
        } // 結束釋義遍歷
        // ----------------------------------------------------------------------------
        // 將單詞與其對應的類別和釋義組合在一起
        const finalData = words.map(w => ({ // 使用 map 方法重新構造回傳的單字物件陣列
            id: w.id, // 保留單字 ID
            word: w.text, // 取得單字文字
            categories: catMap[w.id] || [], // 從對照表中取得對應類別，若無則傳回空陣列
            senses: senseMap[w.id] || [] // 從對照表中取得對應釋義，若無則傳回空陣列
        })); // 結束單字物件映射
        // ----------------------------------------------------------------------------
        res.json(finalData); // 將最終組合好的數據以 JSON 格式發送給客戶端
    } catch (err) { // 如果過程中捕捉到任何錯誤
        res.status(500).json({ "error": err.message }); // 返回 500 狀態碼並附帶錯誤訊息
    } // 結束錯誤處理
}); // 結束單字數據 API 路由
// --------------------------------------------------------------------------------
// --- AI 代理 API (轉發至 LM Studio) ---
const LM_STUDIO_URL = 'http://localhost:1234'; // 定義 LM Studio 的伺服器基礎網址
const TTS_SERVER_URL = 'http://127.0.0.1:8888'; // 定義 Python TTS 伺服器的基礎網址
// --------------------------------------------------------------------------------
// 獲取 LM Studio 當前可用的模型列表
app.get('/api/ai/models', async (req, res) => { // 定義 GET 路由以列出所有 AI 模型
    try { // 開始異常處理
        const response = await fetch(`${LM_STUDIO_URL}/v1/models`); // 向 LM Studio 發送 API 請求以獲取模型清單
        const data = await response.json(); // 解析返回的 JSON 數據轉成JavaScript 物件
        res.json(data); // 將結果直接傳送回前端
    } catch (error) { // 若連線或處理失敗
        res.status(500).json({ error: '無法連線至 LM Studio', details: error.message }); // 回傳錯誤通知
    } // 結束 catch 區塊
}); // 結束模型列表路由
// --------------------------------------------------------------------------------
// 卸載 LM Studio 中的特定模型
app.post('/api/ai/unload', async (req, res) => { // 定義 POST 路由以卸載指定模型
    try { // 開始異常處理
        const { modelId } = req.body; // 從請求主體中提取要卸載的模型 ID
        const response = await fetch(`${LM_STUDIO_URL}/api/v1/models/unload`, { // 發送卸載請求至 LM Studio
            method: 'POST', // 使用 POST 方法
            headers: { 'Content-Type': 'application/json' }, // 指定內容類型為 JSON
            body: JSON.stringify({ model: modelId, instance_id: modelId }) // 傳送包含模型 ID 的 JSON 字串
        }); // 結束 fetch 呼叫
        res.json({ success: response.ok }); // 傳回卸載是否成功的布林值
    } catch (error) { // 若卸載失敗
        res.status(500).json({ error: '卸載失敗', details: error.message }); // 返回詳細錯誤資訊
    } // 結束 catch 區塊
}); // 結束卸載路由
// --------------------------------------------------------------------------------
// 核心功能：故事生成與翻譯 API
app.post('/api/ai/chat', async (req, res) => { // 定義 POST 路由處理與 AI 的對話請求
    const { model, messages, temperature, examTarget, storyDetail, coherence, type } = req.body; // 解構請求參數
    // ----------------------------------------------------------------------------
    let finalMessages = messages; // 初始化最終發送給 AI 的訊息列表
    // ----------------------------------------------------------------------------
    // 如果是「故事生成」模式
    if (type === 'generate') { // 判斷請求類型是否為生成故事
        const { vocabularyList } = req.body; // 從請求中提取要使用的單字清單
        console.log(`[AI] 正在為 ${vocabularyList.length} 個單詞生成故事...`); // 在伺服器日誌輸出狀態訊息
        // ------------------------------------------------------------------------
        // --- 動態 Prompt 組合邏輯 ---
        let role = ""; // 初始化 AI 角色提示詞
        let contextRule = ""; // 初始化場景規則提示詞
        let coherenceRule = ""; // 初始化連貫性規則提示詞
        // ------------------------------------------------------------------------
        // 根據考試目標設定角色與場景規則
        switch (examTarget) { // 根據用戶選擇的考試類型進行切換
            case 'toeic': // 如果是多益考試
                role = "Role: You are an expert in professional business narrative storytelling. Style: Proactive, positive, and action-oriented."; // 設定商務敘事專家角色
                contextRule = "8. CONTEXT: The scenario MUST be related to TOEIC topics: Business, Office, Travel, or Professional Networking.\n"; // 限定商務場景
                break; // 結束該 case
            case 'toefl': // 如果是托福考試
            case 'ielts': // 或者是雅思考試
                role = `Role: You are an expert in academic narrative storytelling for ${examTarget.toUpperCase()}. Style: Proactive, logical, and evidence-based.`; // 設定學術敘事專家角色
                contextRule = "8. CONTEXT: The scenario MUST be academic, involving university life or formal research.\n"; // 限定學術場景
                break; // 結束該 case
            default: // 預設情況
                role = "Role: You are an expert in creative narrative storytelling. Style: Proactive, positive, and action-oriented."; // 設定一般創意敘事角色
                contextRule = "8. CONTEXT: General daily life scenario.\n"; // 使用一般生活場景
        } // 結束 switch
        // ------------------------------------------------------------------------
        // 設定敘事連貫性要求
        switch (coherence) { // 根據連貫性參數設定規則
            case 'strong': // 強連貫性
                coherenceRule = "7. COHERENCE: Create a highly cohesive, logical, and engaging plot. Every word must fit perfectly into a sophisticated narrative.\n"; // 要求嚴密情節
                break; // 結束該 case
            case 'normal': // 一般連貫性
                coherenceRule = "7. COHERENCE: Write a simple, connected narrative.\n"; // 要求簡單串連
                break; // 結束該 case
            default: // 預設/無
                coherenceRule = "7. COHERENCE: Maintain a standard, natural narrative flow.\n"; // 要求自然流程
        } // 結束 switch
        // ------------------------------------------------------------------------
        // 設定 AI 的寫作方法論
        const methodology = `METHODOLOGY:
1. FLUID SCENE TRANSITIONS: Identify word clusters and select 1-3 "High-Transition" scenes. Drive the plot through logical stage-switching (e.g., from Strategic Planning to Field Execution, and finally to Impact & Results). Ensure the narrative is natural and logically sound.
2. STRUCTURAL TAXONOMY: Categorize vocabulary into functional blocks: Psychological States, Actions, Goals, Events, or Professional Jargon. Use verbs as the engine to trigger behaviors that achieve goals within events, reflecting the character's internal state.
3. PLAUSIBLE MAPPING: For difficult-to-fit nouns, prioritize mapping them to Metaphors, Analogies, Project Names, or Design Elements, ensuring they align with the story’s internal logic and maintain a professional tone.
4. POSITIVE TONE: Focus on overcoming challenges and value creation. Ensure a successful and uplifting outcome.`; // 定義 AI 如何構思故事的方法論文字
        // ------------------------------------------------------------------------
        const taskLevel = storyDetail === 'detailed' ? "comprehensive and detailed" : (storyDetail === 'normal' ? "standard" : "concise"); // 決定任務詳細程度的描述
        const task = `Task: Write a ${taskLevel} English story using EVERY word from the list.`; // 組合任務目標字串
        const rule6Text = storyDetail === 'detailed' ? "6. DETAIL & DEPTH: Allow for elaborate descriptions." : (storyDetail === 'normal' ? "6. STANDARD: Balanced narrative." : "6. SIMPLE & CONCISE: Short and punchy."); // 組合詳細程度規則文字
        // ------------------------------------------------------------------------
        // 核心規則：確保所有單詞都被使用並標記
        const rules = `CRITICAL RULES:
1. 100% COVERAGE: Use EVERY SINGLE WORD from the list.
2. INTERNAL ANCHORING: Wrap EVERY target word in **double asterisks**.
3. EXCLUSIVITY: ONLY mark provided words.
4. STRING INTEGRITY: 100% match only.
5. NO SUBSTITUTION.
${rule6Text}
6. LANGUAGE: Write in ENGLISH ONLY.

Output Template:
[STORY_START]
(Your story paragraph here)
[STORY_END]`; // 定義 AI 必須遵守的格式與輸出規則
        // ------------------------------------------------------------------------
        const systemPrompt = `${role}\n\n${methodology}\n\n${task}\n\n${rules}\n\n${coherenceRule}${contextRule}`; // 將所有部分組合成最終的系統 Prompt
        finalMessages = [ // 設定發送給 AI 的訊息內容
            { role: "system", content: systemPrompt }, // 傳入系統指令
            { role: "user", content: `Vocabulary List:\n${vocabularyList}` } // 傳入用戶單字清單
        ]; // 結束陣列賦值
    } else if (type === 'translate') { // 如果判斷請求類型為翻譯故事
        // 如果是「翻譯」模式
        const { vocabularyList, sourceText } = req.body; // 提取單字列表與待翻譯的故事原文
        console.log(`[AI] 正在為單詞翻譯故事: ${vocabularyList}`); // 紀錄翻譯任務日誌
        // ------------------------------------------------------------------------
        finalMessages = [ // 定義翻譯模式的對話列表
            { // 系統角色定義
                role: "system", // 設定為系統指令
                content: `You are a professional literary translator. Translate the given English story into natural Traditional Chinese.
STRICT RULE 1: ONLY apply the formatting rule to English words marked with ** in the source.
STRICT RULE 2: ALWAYS provide the Chinese meaning. DO NOT output the English word alone in parentheses without its Chinese translation.

Formatting Rule:
1. Translate the story into natural Chinese. For each marked word in the source text, use this exact pattern: ChineseMeaning (**English word**).
2. Correct vs Wrong Order:
   - CORRECT: 同事 (**colleague**)
   - WRONG: (**colleague**) 同事
3. Example: 今天的菜色很自然 (**nature**), 令人感到很放鬆 (**relaxed**).
4. Ensure the English word is enclosed in double asterisks inside the parentheses.
Do NOT include extra explanations, only the translation.` // 包含翻譯準則與格式要求
            }, // 結束系統角色物件
            { // 用戶角色輸入
                role: "user", // 設定為用戶輸入
                content: `Vocabulary List: ${vocabularyList}\n\nEnglish Story:\n${sourceText}` // 提供單字清單與英文原文
            } // 結束用戶角色物件
        ]; // 結束陣列賦值
    } // 結束 else if 區塊
    // ----------------------------------------------------------------------------
    try { // 開始發送 AI 請求的異常處理
        // 發送請求至 LM Studio
        const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, { // 調用 LM Studio 的聊天 API
            method: 'POST', // 使用 POST 傳送數據
            headers: { 'Content-Type': 'application/json' }, // 設定為 JSON 格式
            body: JSON.stringify({ // 序列化請求參數
                model, // 使用的模型名稱
                messages: finalMessages, // 傳送對話歷史
                temperature: temperature || 0.1 // 設定模型生成的隨機性（創意度）
            }) // 結束 JSON 字串化
        }); // 結束 fetch 呼叫
        // ------------------------------------------------------------------------
        const data = await response.json(); // 解析 AI 回傳的 JSON 結果
        res.json(data); // 將結果傳回給前端介面
    } catch (error) { // 如果 API 呼叫過程出錯
        res.status(500).json({ error: 'AI 請求失敗', details: error.message }); // 回報錯誤訊息給前端
    } // 結束異常處理區塊
}); // 結束 AI 對話 API 路由
// --------------------------------------------------------------------------------
// TTS (文字轉語音) 代理 API：轉發給 Python 執行的 tts_server.py
app.post('/api/tts', async (req, res) => { // 定義 POST 路由處理文字轉語音請求
    try { // 開始異常處理
        const response = await fetch(`${TTS_SERVER_URL}/v1/audio/speech`, { // 向 Python TTS 伺服器轉發請求
            method: 'POST', // 使用 POST 方法
            headers: { 'Content-Type': 'application/json' }, // 指定內容格式
            body: JSON.stringify(req.body) // 直接轉發前端傳來的參數主體
        }); // 結束 fetch 呼叫
        // ------------------------------------------------------------------------
        if (!response.ok) throw new Error('TTS 伺服器錯誤'); // 如果 Python 端回報錯誤則丟出異常
        // ------------------------------------------------------------------------
        // 將音訊二進位數據 (Binary Data) 串流回前端
        const arrayBuffer = await response.arrayBuffer(); // 讀取回傳的音訊二進位數據
        res.set('Content-Type', 'audio/wav'); // 設定回應標頭為 WAV 音訊格式
        // ------------------------------------------------------------------------
        // 1. ArrayBuffer 是最原始的「二進位數據」(生肉)，內容是 0~255 的數字陣列。
        // 2. Buffer.from() 是將其轉為 Node.js 專用的「Buffer」(熟食)，具備更強大的處理能力。
        // 3. 這種二進位格式適用於聲音、圖片、PDF 等「非文字」檔案。
        res.send(Buffer.from(arrayBuffer)); // 將數據轉換為 Buffer 並發送回前端
    } catch (error) { // 如果 TTS 處理失敗
        res.status(500).json({ error: 'TTS 代理失敗', details: error.message }); // 回報代理錯誤
    } // 結束異常處理
}); // 結束 TTS API 路由
// --------------------------------------------------------------------------------
// 啟動伺服器
app.listen(PORT, () => { // 讓伺服器開始在指定連接埠監聽請求
    console.log(`伺服器正在運行於 http://localhost:${PORT}`); // 在控制台輸出伺服器啟動完成的網址訊息
}); // 結束監聽呼叫
// --------------------------------------------------------------------------------
// 結束檔案內容
