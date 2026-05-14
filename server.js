const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 7000;
const DB_PATH = path.join(__dirname, 'toeic_v2.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Step 5: Serve static files (index.html, etc.)

// Database Connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the TOEIC SQLite database.');
    }
});

// Step 4: Vocabulary Data API
app.get('/api/vocabulary', async (req, res) => {
    try {
        const words = await new Promise((resolve, reject) => {
            db.all("SELECT id, text FROM words ORDER BY text ASC", [], (err, rows) => err ? reject(err) : resolve(rows));
        });
        
        const categories = await new Promise((resolve, reject) => {
            db.all("SELECT id, category FROM word_categories", [], (err, rows) => err ? reject(err) : resolve(rows));
        });
        
        const senses = await new Promise((resolve, reject) => {
            db.all("SELECT word_id, pos, ipa, kk, definition_zh, example_en, example_zh FROM senses", [], (err, rows) => err ? reject(err) : resolve(rows));
        });

        // 建立 Hash Map 以提升合併效能
        const catMap = {};
        for (const c of categories) {
            if (!catMap[c.id]) catMap[c.id] = [];
            catMap[c.id].push(c.category);
        }

        const senseMap = {};
        for (const s of senses) {
            if (!senseMap[s.word_id]) senseMap[s.word_id] = [];
            senseMap[s.word_id].push({
                pos: s.pos, ipa: s.ipa, kk: s.kk, 
                definition_zh: s.definition_zh, 
                example_en: s.example_en, 
                example_zh: s.example_zh
            });
        }

        const finalData = words.map(w => ({
            id: w.id,
            word: w.text,
            categories: catMap[w.id] || [],
            senses: senseMap[w.id] || []
        }));

        res.json(finalData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AI Proxy APIs ---
const LM_STUDIO_URL = 'http://localhost:1234';
const TTS_SERVER_URL = 'http://127.0.0.1:8888';

// 獲取模型列表
app.get('/api/ai/models', async (req, res) => {
    try {
        const response = await fetch(`${LM_STUDIO_URL}/v1/models`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: '無法連線至 LM Studio', details: error.message });
    }
});

// 卸載模型
app.post('/api/ai/unload', async (req, res) => {
    try {
        const { modelId } = req.body;
        const response = await fetch(`${LM_STUDIO_URL}/api/v1/models/unload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelId, instance_id: modelId })
        });
        res.json({ success: response.ok });
    } catch (error) {
        res.status(500).json({ error: '卸載失敗', details: error.message });
    }
});

// 核心故事生成與翻譯 API
app.post('/api/ai/chat', async (req, res) => {
    const { model, messages, temperature, examTarget, storyDetail, coherence, type } = req.body;

    // 決定最終使用的 messages
    let finalMessages = messages;

    if (type === 'generate') {
        const { vocabularyList } = req.body;
        console.log(`[AI] Generating story for ${vocabularyList.length} chars...`);
        
        // --- Prompt 組合邏輯 ---
        let role = "";
        let contextRule = "";
        let coherenceRule = "";
        
        switch (examTarget) {
            case 'toeic':
                role = "Role: You are an expert in professional business narrative storytelling. Style: Proactive, positive, and action-oriented.";
                contextRule = "8. CONTEXT: The scenario MUST be related to TOEIC topics: Business, Office, Travel, or Professional Networking.\n";
                break;
            case 'toefl':
            case 'ielts':
                role = `Role: You are an expert in academic narrative storytelling for ${examTarget.toUpperCase()}. Style: Proactive, logical, and evidence-based.`;
                contextRule = "8. CONTEXT: The scenario MUST be academic, involving university life or formal research.\n";
                break;
            default:
                role = "Role: You are an expert in creative narrative storytelling. Style: Proactive, positive, and action-oriented.";
                contextRule = "8. CONTEXT: General daily life scenario.\n";
        }

        switch (coherence) {
            case 'strong':
                coherenceRule = "7. COHERENCE: Create a highly cohesive, logical, and engaging plot. Every word must fit perfectly into a sophisticated narrative.\n";
                break;
            case 'normal':
                coherenceRule = "7. COHERENCE: Write a simple, connected narrative.\n";
                break;
            default:
                coherenceRule = "7. COHERENCE: Maintain a standard, natural narrative flow.\n";
        }

        const methodology = `METHODOLOGY:
1. FLUID SCENE TRANSITIONS: Identify word clusters and select 1-3 "High-Transition" scenes. Drive the plot through logical stage-switching (e.g., from Strategic Planning to Field Execution, and finally to Impact & Results). Ensure the narrative is natural and logically sound.
2. STRUCTURAL TAXONOMY: Categorize vocabulary into functional blocks: Psychological States, Actions, Goals, Events, or Professional Jargon. Use verbs as the engine to trigger behaviors that achieve goals within events, reflecting the character's internal state.
3. PLAUSIBLE MAPPING: For difficult-to-fit nouns, prioritize mapping them to Metaphors, Analogies, Project Names, or Design Elements, ensuring they align with the story’s internal logic and maintain a professional tone.
4. POSITIVE TONE: Focus on overcoming challenges and value creation. Ensure a successful and uplifting outcome.`;

        const taskLevel = storyDetail === 'detailed' ? "comprehensive and detailed" : (storyDetail === 'normal' ? "standard" : "concise");
        const task = `Task: Write a ${taskLevel} English story using EVERY word from the list.`;
        const rule6Text = storyDetail === 'detailed' ? "6. DETAIL & DEPTH: Allow for elaborate descriptions." : (storyDetail === 'normal' ? "6. STANDARD: Balanced narrative." : "6. SIMPLE & CONCISE: Short and punchy.");

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
[STORY_END]`;

        const systemPrompt = `${role}\n\n${methodology}\n\n${task}\n\n${rules}\n\n${coherenceRule}${contextRule}`;
        finalMessages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Vocabulary List:\n${vocabularyList}` }
        ];
    } else if (type === 'translate') {
        const { vocabularyList, sourceText } = req.body;
        console.log(`[AI] Translating story for words: ${vocabularyList}`);

        finalMessages = [
            {
                role: "system",
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
Do NOT include extra explanations, only the translation.`
            },
            {
                role: "user",
                content: `Vocabulary List: ${vocabularyList}\n\nEnglish Story:\n${sourceText}`
            }
        ];
    }

    try {
        const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: finalMessages,
                temperature: temperature || 0.1
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'AI 請求失敗', details: error.message });
    }
});

// TTS 代理 API (轉發給 Python tts_server.py)
app.post('/api/tts', async (req, res) => {
    try {
        const response = await fetch(`${TTS_SERVER_URL}/v1/audio/speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) throw new Error('TTS 伺服器錯誤');

        // 將音訊二進位資料串流回前端
        const arrayBuffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/wav');
        res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        res.status(500).json({ error: 'TTS 代理失敗', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // 自動開啟瀏覽器 (Windows)
    const url = `http://localhost:${PORT}`;
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${start} ${url}`);
});
