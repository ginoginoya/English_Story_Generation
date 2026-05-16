/**
 * app.js - 星海單字 (Starry Sea Vocabulary) 應用程式邏輯
 * 負責處理前端 UI 交互、資料獲取、AI 故事生成以及語音合成 (TTS) 功能。
 */

let vocabulary = []; // 存儲從伺服器獲取的單字列表
let currentIndex = 0; // 當前正在顯示的單字索引
let selectedIndices = new Set(); // 儲存使用者選中的單字索引

// --- 初始化 App ---
document.addEventListener('DOMContentLoaded', () => {
    initStars(); // 初始化背景星空特效
    loadData(); // 從後端 API 載入單字數據
    initEventListeners(); // 初始化一般按鈕監聽器
    initAIListeners(); // 初始化 AI 相關功能的監聽器
});

// --- 1. 動態星空背景 (Dynamic Starfield) ---
function initStars() {
    const container = document.getElementById('star-container');
    const starCount = 150; // 星星數量

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        // 隨機生成位置、大小與閃爍時間
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 1;
        const duration = Math.random() * 3 + 2;

        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.setProperty('--duration', `${duration}s`);

        container.appendChild(star);
    }
}

// --- 2. 資料載入 (Data Loading) ---
async function loadData() {
    try {
        // 向後端請求單字數據
        const response = await fetch('/api/vocabulary');
        vocabulary = await response.json();

        // 更新列表總數顯示
        const listCountEl = document.getElementById('list-count');
        if (listCountEl) listCountEl.innerText = `(${vocabulary.length})`;

        initVoiceSelectors(); // 初始化語音選擇器
        loadState(); // 從 localStorage 載入先前的應用程式狀態 (如選中的單字、設定等)

        if (vocabulary.length > 0) {
            updateUI(); // 更新主卡片顯示
            updateListGrid(); // 初始化單字列表網格
        }
    } catch (error) {
        console.error('載入單字數據失敗:', error);
        document.getElementById('word-text').innerText = 'Data Error';
    }
}

// --- 3. UI 更新 (UI Update) ---
function updateUI() {
    const word = vocabulary[currentIndex];
    const card = document.getElementById('word-card');

    // 重發淡入動畫
    card.classList.remove('fade-in');
    void card.offsetWidth; // 強制重繪
    card.classList.add('fade-in');

    // 填入單字資訊
    document.getElementById('category').innerText = word.categories.join(' | ') || 'General';
    document.getElementById('word-text').innerText = word.word;
    document.getElementById('jump-input').value = currentIndex + 1;
    document.getElementById('total-count').innerText = vocabulary.length;

    // 更新主卡片選取按鈕的狀態 (勾選/未勾選)
    const selectBtn = document.getElementById('card-select-btn');
    const icon = selectBtn.querySelector('i');
    if (selectedIndices.has(currentIndex)) {
        selectBtn.classList.add('selected');
        icon.className = 'fas fa-check-square';
    } else {
        selectBtn.classList.remove('selected');
        icon.className = 'far fa-square';
    }

    // 渲染所有釋義與例句
    const sensesContainer = document.getElementById('senses-container');
    sensesContainer.innerHTML = '';

    word.senses.forEach((sense, idx) => {
        // 第一個釋義顯示 IPA 與 KK 音標
        if (idx === 0) {
            document.getElementById('ipa').innerText = sense.ipa || 'N/A';
            document.getElementById('kk').innerText = sense.kk || 'N/A';
        }

        const senseDiv = document.createElement('div');
        senseDiv.className = 'sense-section';
        senseDiv.innerHTML = `
            <div class="definition">
                <span class="pos">${sense.pos}</span>${sense.definition_zh}
            </div>
            <div class="example-box">
                <div class="example-en">${sense.example_en}</div>
                <div class="example-zh">${sense.example_zh}</div>
            </div>
        `;
        sensesContainer.appendChild(senseDiv);
    });
}

// --- 4. 選取邏輯 (Selection Logic) ---
function toggleSelection(index) {
    if (selectedIndices.has(index)) {
        selectedIndices.delete(index);
    } else {
        // 限制單次選取上限
        if (selectedIndices.size >= 20) {
            alert('一次最多選取 20 個單字，以分兩篇獨立故事生成！');
            return;
        }
        selectedIndices.add(index);
    }

    updateUI();
    updateListGrid();
    updateToolbar(); // 更新底部工具列
    saveState(); // 每次點選都儲存狀態
}

// 更新工具列資訊與按鈕狀態
function updateToolbar() {
    const toolbar = document.getElementById('story-toolbar');
    const countSpan = document.getElementById('selected-count');
    const count = selectedIndices.size;

    countSpan.innerText = `已選取 ${count} / 20 個單字`;
    toolbar.classList.remove('hidden');

    // 如果沒有選取單字，則禁用生成按鈕
    const generateBtn = document.getElementById('generate-story');
    if (generateBtn) {
        if (count === 0) {
            generateBtn.style.opacity = '0.5';
            generateBtn.style.cursor = 'not-allowed';
            generateBtn.style.pointerEvents = 'none';
        } else {
            generateBtn.style.opacity = '1';
            generateBtn.style.cursor = 'pointer';
            generateBtn.style.pointerEvents = 'auto';
        }
    }
}

// 更新全單字列表網格
function updateListGrid() {
    const wordsGrid = document.getElementById('all-words-grid');
    if (!wordsGrid) return;

    // 如果網格已經生成，只更新選中狀態的 CSS class
    if (wordsGrid.children.length > 0) {
        wordsGrid.querySelectorAll('.grid-item').forEach((el, idx) => {
            if (selectedIndices.has(idx)) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
        return;
    }

    // 第一次生成完整列表
    wordsGrid.innerHTML = vocabulary.map((item, index) => `
        <div class="grid-item" data-index="${index}">${item.word}</div>
    `).join('');

    wordsGrid.querySelectorAll('.grid-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index);
            toggleSelection(idx);
        });

        // 雙擊列表項目可直接跳轉查看該單字
        el.addEventListener('dblclick', () => {
            currentIndex = parseInt(el.dataset.index);
            updateUI();
            document.getElementById('list-overlay').classList.add('hidden');
        });
    });
}

// --- 5. 事件監聽器初始化 (Event Listeners) ---
function initEventListeners() {
    // 下一個單字
    document.getElementById('next-btn').addEventListener('click', () => {
        currentIndex = (currentIndex < vocabulary.length - 1) ? currentIndex + 1 : 0;
        updateUI();
    });

    // 上一個單字
    document.getElementById('prev-btn').addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : vocabulary.length - 1;
        updateUI();
    });

    // 點擊卡片勾選按鈕
    document.getElementById('card-select-btn').addEventListener('click', () => {
        toggleSelection(currentIndex);
    });

    // 跳轉頁碼輸入
    document.getElementById('jump-input').addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) return;
        val = Math.max(1, Math.min(val, vocabulary.length));
        currentIndex = val - 1;
        updateUI();
    });

    // 搜尋功能
    document.getElementById('search-trigger').addEventListener('click', () => {
        document.getElementById('search-overlay').classList.remove('hidden');
        document.getElementById('search-input').focus();
    });

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        searchResults.innerHTML = '';

        if (query.length === 0) return;

        // 搜尋包含英文單字或中文釋義的項目
        const matches = vocabulary.filter(item =>
            item.word.toLowerCase().includes(query) ||
            item.senses.some(s => s.definition_zh.includes(query))
        );

        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `
                <div class="result-word">${match.word}</div>
                <div class="result-def">${match.senses[0].definition_zh}</div>
            `;
            div.addEventListener('click', () => {
                const actualIndex = vocabulary.findIndex(v => v.word === match.word);
                if (actualIndex !== -1) {
                    currentIndex = actualIndex;
                    updateUI();
                    document.getElementById('search-overlay').classList.add('hidden');
                    searchInput.value = '';
                }
            });
            searchResults.appendChild(div);
        });
    });

    // 開啟全單字列表
    document.getElementById('list-trigger').addEventListener('click', () => {
        updateListGrid();
        document.getElementById('list-overlay').classList.remove('hidden');
    });

    // 點擊 Modal 外部以關閉
    document.querySelectorAll('.modal, #search-overlay, #list-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });

    // 關閉按鈕邏輯
    document.querySelectorAll('#close-search, #close-list, #close-modal, #close-restore-modal, #close-detail-modal, #close-custom-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.hidden-trigger, #search-overlay, #list-overlay, .modal').classList.add('hidden');
            if (typeof stopKokoroTTS === 'function') {
                stopKokoroTTS(); // 關閉 Modal 時停止朗讀
            }
        });
    });

    // 朗讀單字
    document.getElementById('speaker').addEventListener('click', speakWord);

    // 朗讀詳情中的單字
    document.getElementById('detail-speaker').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const text = document.getElementById('detail-word-text').innerText;
        playKokoroTTS(text, btn, true);
    });

    // 開啟還原故事 Modal
    document.getElementById('restore-trigger').addEventListener('click', () => {
        document.getElementById('restore-textarea').value = '';
        document.getElementById('restore-modal').classList.remove('hidden');
    });

    // 開啟自訂單字生成 Modal
    document.getElementById('custom-story-trigger').addEventListener('click', () => {
        document.getElementById('custom-story-modal').classList.remove('hidden');
    });

    document.getElementById('convert-restore-btn').addEventListener('click', parseRestoredStory);

    // 還原區域支援檔案拖放 (Drag and Drop)
    const restoreTextarea = document.getElementById('restore-textarea');

    restoreTextarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        restoreTextarea.classList.add('drag-over');
    });

    restoreTextarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        restoreTextarea.classList.remove('drag-over');
    });

    restoreTextarea.addEventListener('drop', (e) => {
        e.preventDefault();
        restoreTextarea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.name.endsWith('.txt') || file.type === 'text/plain') {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const content = event.target.result;
                        const currentVal = restoreTextarea.value;
                        restoreTextarea.value = currentVal + (currentVal ? '\n\n' : '') + content + '\n';
                    };
                    reader.readAsText(file);
                }
            });
        }
    });

    // 快捷鍵支援
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') document.getElementById('next-btn').click();
        if (e.key === 'ArrowLeft') document.getElementById('prev-btn').click();
        if (e.key === ' ') { e.preventDefault(); speakWord(); }
    });
}

// --- 6. AI 功能整合 (AI Integration) ---
function initAIListeners() {
    // 清除所有選取的單字
    document.getElementById('clear-selection').addEventListener('click', () => {
        selectedIndices.clear();
        updateUI();
        updateListGrid();
        updateToolbar();
        saveState();
    });

    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', saveState);
    }

    // 字體大小控制
    document.getElementById('font-inc').addEventListener('click', () => adjustFontSize(0.1));
    document.getElementById('font-dec').addEventListener('click', () => adjustFontSize(-0.1));

    // AI 引擎設定 Modal 觸發
    const engineModal = document.getElementById('ai-engine-modal');
    const openEngineModal = () => engineModal.classList.remove('hidden');

    document.getElementById('ai-engine-trigger')?.addEventListener('click', openEngineModal);
    document.getElementById('ai-engine-trigger-toolbar')?.addEventListener('click', openEngineModal);
    document.getElementById('ai-engine-trigger-custom')?.addEventListener('click', openEngineModal);

    document.getElementById('close-engine-modal')?.addEventListener('click', () => {
        engineModal.classList.add('hidden');
        saveState();
    });

    document.getElementById('apply-engine-settings')?.addEventListener('click', () => {
        engineModal.classList.add('hidden');
        saveState();
    });

    // 創意程度 (Temperature) 拉條
    const tempSlider = document.getElementById('engine-temp-slider');
    const tempLabel = document.getElementById('temp-value-label');
    if (tempSlider && tempLabel) {
        tempSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value).toFixed(1);
            tempLabel.innerText = val;
            currentAIConfig.temperature = parseFloat(val);
        });
    }

    // 分段控制選項 (故事詳細度、連貫性、考試焦點、翻譯模式)
    const initSegmentControls = (id, configKey) => {
        document.querySelectorAll(`#${id} .segment-option`).forEach(opt => {
            opt.addEventListener('click', (e) => {
                document.querySelectorAll(`#${id} .segment-option`).forEach(o => o.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                currentAIConfig[configKey] = target.getAttribute('data-value');
            });
        });
    };

    initSegmentControls('detail-control', 'storyDetail');
    initSegmentControls('coherence-control', 'coherence');
    initSegmentControls('exam-control', 'examTarget');
    initSegmentControls('translation-control', 'translationMode');

    // 切換寬版模式
    document.getElementById('toggle-wide-mode')?.addEventListener('click', () => {
        const modalContent = document.querySelector('#story-modal .modal-content');
        if (modalContent) {
            modalContent.classList.toggle('wide-mode');
            saveState();
        }
    });

    // 引擎模型選擇
    document.getElementById('engine-model-select')?.addEventListener('change', (e) => {
        currentAIConfig.model = e.target.value;
    });

    // 語速控制按鈕
    document.querySelectorAll('.speed-inc').forEach(btn => btn.addEventListener('click', () => adjustSpeed(0.1)));
    document.querySelectorAll('.speed-dec').forEach(btn => btn.addEventListener('click', () => adjustSpeed(-0.1)));

    // 生成故事按鈕
    document.getElementById('generate-story').addEventListener('click', generateStory);

    // 自訂單字輸入與模式設定
    document.getElementById('custom-gen-mode')?.addEventListener('change', (e) => {
        const hint = document.getElementById('custom-hint');
        if (e.target.value === 'unlimited') {
            hint.innerText = "【長篇無限制模式】最多可輸入 100 個單字。AI 將會嘗試將所有單字編寫進「同一個」長篇故事中。";
        } else {
            hint.innerText = "【標準模式】最多可輸入 20 個單字。單字會被拆分為每 10 個一組，生成多個短篇故事。";
        }
        saveState();
    });

    document.getElementById('custom-words-input')?.addEventListener('input', saveState);

    // 執行自訂故事生成
    document.getElementById('generate-custom-story-btn').addEventListener('click', () => {
        const input = document.getElementById('custom-words-input').value;
        const mode = document.getElementById('custom-gen-mode').value;
        const limit = mode === 'unlimited' ? 100 : 20;

        // 檢查是否只包含英文字母與空格逗號
        if (/[^a-zA-Z\s,-]/.test(input)) {
            alert('出現非規則內的符號！請只輸入英文單字、片語（以逗號分隔）及連字號。');
            return;
        }

        const rawWords = input.split(',');
        const validWords = [];
        for (const w of rawWords) {
            const word = w.trim();
            if (word === '' || word.length > 50) continue;
            validWords.push(word);
            if (validWords.length >= limit) break;
        }

        if (validWords.length === 0) {
            alert('請輸入有效的英文單字！');
            return;
        }

        document.getElementById('custom-story-modal').classList.add('hidden');
        generateStory(validWords, null, mode === 'unlimited');
    });

    // 複製所有故事內容至剪貼簿
    document.getElementById('copy-story').addEventListener('click', () => {
        const storiesContainer = document.getElementById('stories-container');
        const cards = storiesContainer.querySelectorAll('.story-card');

        if (cards.length === 0) return;

        const extractTextWithKeywords = (container) => {
            const clone = container.cloneNode(true);
            clone.querySelectorAll('.keyword-highlight').forEach(span => {
                const text = document.createTextNode(`**${span.textContent}**`);
                span.parentNode.replaceChild(text, span);
            });
            return clone.innerText;
        };

        let fullText = "";
        cards.forEach((card, index) => {
            const wordsArray = Array.from(card.querySelectorAll('.word-tag')).map(t => t.innerText);
            const words = wordsArray.join(', ');
            const enText = extractTextWithKeywords(card.querySelector('.story-en-content'));
            const zhText = card.querySelector('.story-zh-content').innerText;

            fullText += `[STORY ${index + 1}]\n`;
            fullText += `[VOCABULARY]\n${words}\n[/VOCABULARY]\n\n`;
            fullText += `[STORY_EN]\n${enText}\n[/STORY_EN]\n\n`;
            fullText += `[STORY_ZH]\n${zhText}\n[/STORY_ZH]\n\n`;
            fullText += `[/STORY ${index + 1}]\n\n`;
            if (index < cards.length - 1) fullText += `========================================\n\n`;
        });

        navigator.clipboard.writeText(fullText.trim()).then(() => {
            const btn = document.getElementById('copy-story');
            const originalText = btn.innerText;
            btn.innerText = '已複製所有故事！';
            setTimeout(() => btn.innerText = originalText, 2000);
        });
    });
}

// 輔助函式：切分陣列為固定大小的區塊
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// --- 免費 Google 翻譯介面 (支援長文分段) ---
async function googleTranslate(text, retries = 1) {
    if (!text || text.trim() === '') return '';

    // 如果文字過長 (超過 1000 字元)，進行分段翻譯以避免 API 限制
    const MAX_CHUNK_LENGTH = 1000;
    if (text.length > MAX_CHUNK_LENGTH) {
        const segments = text.match(/[^.!?\n]+[.!?\n]*|[\n]+/g) || [text];
        let chunks = [];
        let currentChunk = "";

        for (let seg of segments) {
            if ((currentChunk + seg).length > MAX_CHUNK_LENGTH) {
                chunks.push(currentChunk);
                currentChunk = seg;
            } else {
                currentChunk += seg;
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        const translatedChunks = await Promise.all(chunks.map(c => googleTranslate(c, retries)));
        return translatedChunks.join('');
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Google Busy');
        const data = await response.json();
        return data[0].map(item => item[0]).join('');
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return googleTranslate(text, retries - 1);
        }
        console.error('Google 翻譯失敗:', error);
        return '（翻譯服務忙碌中，請點擊按鈕重試）';
    }
}

// 重新翻譯單一故事卡片
async function retranslate(btn, forceMode = null) {
    const text = btn.dataset.source;
    const words = btn.dataset.words;
    if (!text) return;

    const contentDiv = btn.closest('.story-card-content').querySelector('.story-zh-content');
    const headerTitle = btn.closest('.story-card-content')?.querySelector('.zh-header h4');

    const mode = forceMode || currentAIConfig.translationMode;
    btn.disabled = true;

    try {
        if (mode === 'ai') {
            if (headerTitle) headerTitle.innerText = '中文翻譯 (AI 深度翻譯)';
            contentDiv.innerHTML = '<div class="shimmer-container"><div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line short"></div></div>';

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: currentAIConfig.model,
                    type: 'translate',
                    vocabularyList: words,
                    sourceText: text,
                    temperature: 0.3
                })
            });

            if (!response.ok) throw new Error('AI 翻譯失敗');
            const data = await response.json();
            let translatedContent = data.choices[0].message.content.trim();
            translatedContent = translatedContent.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

            const styledTranslation = translatedContent.replace(/\*\*(.*?)\*\*/g, '<span class="star-marker">**</span><b class="zh-keyword">$1</b><span class="star-marker">**</span>');
            contentDiv.innerHTML = styledTranslation;
        } else {
            if (headerTitle) headerTitle.innerText = '中文翻譯 (Google 翻譯)';
            contentDiv.innerHTML = '<div class="translation-loading"><div class="shimmer-line"></div><div class="shimmer-line short"></div></div>';
            const translation = await googleTranslate(text.replace(/\*/g, ''), 1);
            contentDiv.innerText = translation;
        }
    } catch (error) {
        console.error('Retranslate error:', error);
        contentDiv.innerText = '翻譯失敗，請再試一次。';
    } finally {
        btn.disabled = false;
    }
}

// 核心故事生成函式
async function generateStory(customWordsArray = null, customModel = null, isUnlimited = false) {
    if (customWordsArray && (customWordsArray instanceof Event)) {
        customWordsArray = null;
        isUnlimited = false;
    }

    const selectedWords = customWordsArray || Array.from(selectedIndices).map(idx => vocabulary[idx].word);
    if (!selectedWords || selectedWords.length === 0) {
        alert("請先選取單字！");
        return;
    }

    const modal = document.getElementById('story-modal');
    const storiesContainer = document.getElementById('stories-container');
    const loader = document.getElementById('story-loader');
    const selectedModel = customModel || currentAIConfig.model;

    // --- 自動模型管理：檢查並清理不必要的模型以節省 VRAM ---
    try {
        const res = await fetch('/api/ai/models');
        if (res.ok) {
            const data = await res.json();
            const loadedModels = data.data || [];
            if (!loadedModels.some(m => m.id === selectedModel)) {
                for (const model of loadedModels) {
                    await fetch('/api/ai/unload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ modelId: model.id })
                    }).catch(e => console.warn(e));
                }
            }
        }
    } catch (e) {
        console.warn('無法檢查/卸載模型', e);
    }

    modal.classList.remove('hidden');
    storiesContainer.innerHTML = '';
    loader.style.setProperty('display', 'flex', 'important');
    loader.classList.remove('hidden');

    const loaderMessage = document.getElementById('loader-message');
    loaderMessage.innerText = isUnlimited ? `AI 正在編寫長篇故事 (共 ${selectedWords.length} 字)...` : `AI 正在同時生成所有故事...`;

    const chunkSize = isUnlimited ? selectedWords.length : 10;
    const wordChunks = chunkArray(selectedWords, chunkSize);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
        const storyPromises = wordChunks.map(async (chunk, i) => {
            const formattedWords = chunk.map((w, idx) => `${idx + 1}. ${w}`).join('\n');

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: selectedModel,
                    type: 'generate',
                    vocabularyList: formattedWords,
                    examTarget: currentAIConfig.examTarget,
                    storyDetail: currentAIConfig.storyDetail,
                    coherence: currentAIConfig.coherence,
                    temperature: currentAIConfig.temperature
                })
            });

            if (!response.ok) throw new Error(`第 ${i + 1} 組請求失敗`);
            const data = await response.json();
            const content = data.choices[0].message.content;
            const storyMatch = content.match(/\[STORY_START\]([\s\S]*?)\[STORY_END\]/);
            const rawStory = storyMatch ? storyMatch[1].trim() : '無法提取故事內容';

            const card = document.createElement('div');
            card.className = 'story-card glass animate-in';
            const cleanText = (t) => t.replace(/\*\*(.*?)\*\*/g, '<span class="keyword-highlight">$1</span>');

            const wordsHtml = chunk.map(w => {
                const dbWord = vocabulary.find(item => item.word.toLowerCase() === w.toLowerCase());
                if (dbWord) {
                    const firstDef = dbWord.senses[0]?.definition_zh || '';
                    const shortDef = firstDef.length > 15 ? firstDef.substring(0, 15) + '...' : firstDef;
                    return `<span class="word-tag word-tag-s" data-tooltip="${shortDef}" onclick="showWordDetail('${w.replace(/'/g, "\\'")}')">${w}</span>`;
                } else {
                    return `<span class="word-tag word-tag-s no-click">${w}</span>`;
                }
            }).join('');

            card.innerHTML = `
                <div class="story-card-header">
                    <div class="vocabulary-header"><i class="fas fa-key"></i> 核心單字清單 (組 ${i + 1})</div>
                    <div class="story-card-words words-tags-container">${wordsHtml}</div>
                </div>
                <div class="story-card-content">
                    <div class="story-header-row">
                        <h4>English Story</h4>
                        <button class="tts-btn" title="朗讀英文" onclick="speakStoryText(this)"><i class="fas fa-volume-up"></i></button>
                    </div>
                    <div class="story-card-text story-en-content">${cleanText(rawStory)}</div>
                    <div class="story-card-divider"></div>
                    <div class="zh-header">
                        <h4>中文翻譯</h4>
                        <div class="trans-btn-group">
                            <div class="trans-mode-btn" title="AI 深度翻譯" data-source="${rawStory.replace(/"/g, '&quot;')}" data-words="${chunk.join(',')}" onclick="retranslate(this, 'ai')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="9" font-weight="900" fill="currentColor">AI</text></svg></div>
                            <div class="trans-mode-btn" title="Google 翻譯" data-source="${rawStory.replace(/"/g, '&quot;')}" data-words="${chunk.join(',')}" onclick="retranslate(this, 'google')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">G</text></svg></div>
                        </div>
                    </div>
                    <div class="story-card-text story-zh-content">
                        <div class="shimmer-container"><div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line short"></div></div>
                    </div>
                </div>
            `;
            storiesContainer.appendChild(card);

            // 背景非同步進行翻譯
            (async () => {
                const zhContent = card.querySelector('.story-zh-content');
                if (!zhContent) return;

                if (currentAIConfig.translationMode === 'ai') {
                    try {
                        const translationResponse = await fetch('/api/ai/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: selectedModel,
                                type: 'translate',
                                vocabularyList: chunk.join(', '),
                                sourceText: rawStory,
                                temperature: 0.3
                            })
                        });
                        if (!translationResponse.ok) throw new Error('AI 翻譯請求失敗');
                        const transData = await translationResponse.json();
                        let translatedContent = transData.choices[0].message.content.trim();
                        translatedContent = translatedContent.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                        zhContent.innerHTML = translatedContent.replace(/\*\*(.*?)\*\*/g, '<span class="star-marker">**</span><b class="zh-keyword">$1</b><span class="star-marker">**</span>');
                    } catch (err) {
                        zhContent.innerText = 'AI 翻譯失敗，請點擊上方按鈕重試。';
                    }
                } else {
                    const translation = await googleTranslate(rawStory.replace(/\*/g, ''), 1);
                    zhContent.innerText = translation;
                }
            })();
        });

        await Promise.all(storyPromises);
        clearTimeout(timeoutId);
        loader.classList.add('hidden');
        loader.style.display = 'none';
    } catch (error) {
        clearTimeout(timeoutId);
        loader.classList.add('hidden');
        loader.style.display = 'none';
        alert(error.name === 'AbortError' ? '連線超時！' : `連線失敗！：${error.message}`);
    }
}

// --- 7. 文字轉語音 (Kokoro-82M TTS 整合) ---
const TTS_API_URL = "/api/tts";
window.currentAudio = null;

// 停止目前正在播放的語音
function stopKokoroTTS() {
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
        window.currentAudio = null;
    }
    if (window.currentSpeakingBtn) {
        window.currentSpeakingBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        window.currentSpeakingBtn = null;
    }
    if (window.currentDetailSpeakingBtn) {
        window.currentDetailSpeakingBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        window.currentDetailSpeakingBtn = null;
    }
}

// 播放語音
async function playKokoroTTS(text, btnElement, isWord = false) {
    if (window.currentSpeakingBtn === btnElement || window.currentDetailSpeakingBtn === btnElement) {
        stopKokoroTTS();
        return;
    }

    stopKokoroTTS();
    const originalHtml = '<i class="fas fa-volume-up"></i>';
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: #fbbf24;"></i>';

    try {
        let voice = 'af_sky';
        const selectedSetting = currentVoice || 'random';

        if (selectedSetting === 'random') {
            const femaleVoices = ['af_sky', 'af_bella', 'af_sarah'];
            const maleVoices = ['am_adam', 'am_michael', 'am_echo'];
            voice = isWord ? femaleVoices[Math.floor(Math.random() * femaleVoices.length)] : [...maleVoices, ...femaleVoices][Math.floor(Math.random() * 6)];
        } else {
            voice = selectedSetting;
        }

        const response = await fetch(TTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice, speed: currentSpeed })
        });

        if (!response.ok) throw new Error("TTS 伺服器未回應");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.currentAudio = new Audio(url);
        btnElement.innerHTML = '<i class="fas fa-stop fa-fade" style="color: #ef4444;"></i>';

        if (btnElement.id === 'detail-speaker' || btnElement.id === 'speaker') window.currentDetailSpeakingBtn = btnElement;
        else window.currentSpeakingBtn = btnElement;

        window.currentAudio.onended = () => {
            btnElement.innerHTML = originalHtml;
            URL.revokeObjectURL(url);
            stopKokoroTTS();
        };
        window.currentAudio.play();
    } catch (e) {
        btnElement.innerHTML = originalHtml;
        alert("無法連線至本地語音伺服器，請確認 tts_server.py 已啟動！");
    }
}

function speakWord() {
    playKokoroTTS(vocabulary[currentIndex].word, document.getElementById('speaker'), true);
}

// --- 8. 狀態持久化 (Persistence) ---
let currentVoice = 'random';
let currentSpeed = 1.0;
let currentFontScale = 1.0;
let currentAIConfig = {
    model: 'gemma-4-e4b-5.3gb-q4_k_m',
    temperature: 0.1,
    coherence: 'none',
    examTarget: 'toeic',
    storyDetail: 'concise',
    translationMode: 'google'
};

function initVoiceSelectors() {
    document.querySelectorAll('.voice-selector-custom').forEach(selector => {
        const trigger = selector.querySelector('.voice-trigger');
        const menu = selector.querySelector('.voice-menu');
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });
        selector.querySelectorAll('.voice-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                updateVoiceSelection(opt.getAttribute('data-value'), opt.innerText);
                menu.classList.add('hidden');
                saveState();
            });
        });
    });
    document.addEventListener('click', () => document.querySelectorAll('.voice-menu').forEach(m => m.classList.add('hidden')));
}

function updateVoiceSelection(value, text) {
    currentVoice = value;
    document.querySelectorAll('.voice-selector-custom').forEach(selector => {
        const label = selector.querySelector('.selected-voice-name');
        if (label) label.innerText = text;
        selector.querySelectorAll('.voice-option').forEach(opt => opt.classList.toggle('active', opt.getAttribute('data-value') === value));
    });
}

function saveState() {
    const state = {
        selectedIndices: Array.from(selectedIndices),
        selectedVoice: currentVoice,
        fontScale: currentFontScale,
        speed: currentSpeed,
        aiConfig: currentAIConfig,
        customWords: document.getElementById('custom-words-input')?.value || '',
        customMode: document.getElementById('custom-gen-mode')?.value || 'standard',
        isWideMode: document.querySelector('#story-modal .modal-content')?.classList.contains('wide-mode') || false
    };
    localStorage.setItem('toeic_app_state', JSON.stringify(state));
}

function adjustSpeed(delta) {
    currentSpeed = Math.max(0.5, Math.min(2.0, parseFloat((currentSpeed + delta).toFixed(1))));
    updateSpeedUI();
    saveState();
}

function updateSpeedUI() {
    document.querySelectorAll('.speed-label').forEach(el => el.innerText = `${currentSpeed.toFixed(1)}x`);
    const rotation = (currentSpeed - 1.0) * 90;
    document.querySelectorAll('.speed-needle').forEach(needle => needle.style.transform = `rotate(${rotation}deg)`);
}

function adjustFontSize(delta) {
    currentFontScale = Math.max(0.5, Math.min(2.0, currentFontScale + delta));
    document.documentElement.style.setProperty('--story-font-scale', currentFontScale);
    document.getElementById('font-size-label').innerText = `${Math.round(currentFontScale * 100)}%`;
    saveState();
}

function loadState() {
    const saved = localStorage.getItem('toeic_app_state');
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state.aiConfig) {
            currentAIConfig = state.aiConfig;
            document.getElementById('engine-model-select').value = currentAIConfig.model;
            document.getElementById('engine-temp-slider').value = currentAIConfig.temperature;
            document.getElementById('temp-value-label').innerText = currentAIConfig.temperature;
            const updateSegments = (id, val) => document.querySelectorAll(`#${id} .segment-option`).forEach(opt => opt.classList.toggle('active', opt.getAttribute('data-value') === val));
            updateSegments('coherence-control', currentAIConfig.coherence);
            updateSegments('exam-control', currentAIConfig.examTarget);
            updateSegments('detail-control', currentAIConfig.storyDetail || 'concise');
            updateSegments('translation-control', currentAIConfig.translationMode || 'google');
        }
        if (state.selectedVoice) {
            const opt = document.querySelector(`.voice-option[data-value="${state.selectedVoice}"]`);
            if (opt) updateVoiceSelection(state.selectedVoice, opt.innerText);
        }
        if (state.customWords) document.getElementById('custom-words-input').value = state.customWords;
        if (state.customMode) {
            const select = document.getElementById('custom-gen-mode');
            select.value = state.customMode;
            select.dispatchEvent(new Event('change'));
        }
        if (state.fontScale) { currentFontScale = state.fontScale; adjustFontSize(0); }
        if (Array.isArray(state.selectedIndices)) {
            selectedIndices = new Set(state.selectedIndices.filter(idx => idx < vocabulary.length));
            updateToolbar();
        }
        if (state.isWideMode) document.querySelector('#story-modal .modal-content')?.classList.add('wide-mode');
        if (state.speed) { currentSpeed = state.speed; updateSpeedUI(); }
    } catch (e) { console.error('載入存檔失敗:', e); }
}

// --- 9. 單字詳情與故事朗讀 ---
function showWordDetail(wordString) {
    const dbWord = vocabulary.find(item => item.word.toLowerCase() === wordString.toLowerCase());
    if (!dbWord) return;
    document.getElementById('detail-word-text').innerText = dbWord.word;
    const container = document.getElementById('detail-senses-container');
    container.innerHTML = '';
    dbWord.senses.forEach((sense, idx) => {
        if (idx === 0) {
            document.getElementById('detail-ipa').innerText = sense.ipa || 'N/A';
            document.getElementById('detail-kk').innerText = sense.kk || 'N/A';
        }
        const div = document.createElement('div');
        div.className = 'sense-section';
        div.innerHTML = `<div class="definition"><span class="pos">${sense.pos}</span>${sense.definition_zh}</div><div class="example-box"><div class="example-en">${sense.example_en}</div><div class="example-zh">${sense.example_zh}</div></div>`;
        container.appendChild(div);
    });
    document.getElementById('word-detail-modal').classList.remove('hidden');
}

function speakStoryText(btnElement) {
    const container = btnElement.parentElement.nextElementSibling;
    if (container) playKokoroTTS(container.innerText.replace(/\*/g, ''), btnElement, false);
}

// --- 10. 從剪貼簿還原故事 (Restore Story) ---
function parseRestoredStory() {
    const text = document.getElementById('restore-textarea').value.trim();
    if (!text) return;
    const storyBlocks = [];
    const blockRegex = /\[STORY\s+\d+\]([\s\S]*?)\[\/STORY\s+\d+\]/gi;
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
        const content = match[1];
        const vocabMatch = content.match(/\[VOCABULARY\]([\s\S]*?)\[\/VOCABULARY\]/i);
        const enMatch = content.match(/\[STORY_EN\]([\s\S]*?)\[\/STORY_EN\]/i);
        const zhMatch = content.match(/\[STORY_ZH\]([\s\S]*?)\[\/STORY_ZH\]/i);
        if (vocabMatch && enMatch) storyBlocks.push({ vocabText: vocabMatch[1].trim(), enText: enMatch[1].trim(), zhText: zhMatch ? zhMatch[1].trim() : "" });
    }
    if (storyBlocks.length === 0) { alert("格式錯誤！無法解析任何故事。"); return; }
    document.getElementById('restore-modal').classList.add('hidden');
    const storiesContainer = document.getElementById('stories-container');
    document.getElementById('story-modal').classList.remove('hidden');
    document.getElementById('story-loader').classList.add('hidden');
    document.getElementById('story-loader').style.display = 'none';
    storiesContainer.innerHTML = '';
    storyBlocks.forEach((block, i) => {
        const card = document.createElement('div');
        card.className = 'story-card glass animate-in';
        const wordsArray = block.vocabText.split(/[\s,]+/).filter(w => w.trim().length > 0);
        const wordsHtml = wordsArray.map(w => {
            const dbWord = vocabulary.find(item => item.word.toLowerCase() === w.toLowerCase());
            const def = dbWord ? dbWord.senses[0]?.definition_zh || '' : '';
            return `<span class="word-tag word-tag-s ${dbWord ? '' : 'no-click'}" data-tooltip="${def}" onclick="${dbWord ? `showWordDetail('${w.replace(/'/g, "\\'")}')` : ''}">${w}</span>`;
        }).join('');
        card.innerHTML = `
            <div class="story-card-header"><div class="vocabulary-header"><i class="fas fa-history"></i> 已還原故事 (組 ${i + 1})</div><div class="story-card-words words-tags-container">${wordsHtml}</div></div>
            <div class="story-card-content">
                <div class="story-header-row"><h4>English Story</h4><button class="tts-btn" title="朗讀英文" onclick="speakStoryText(this)"><i class="fas fa-volume-up"></i></button></div>
                <div class="story-card-text story-en-content">${block.enText.replace(/\*\*(.*?)\*\*/g, '<span class="keyword-highlight">$1</span>')}</div>
                <div class="story-card-divider"></div>
                <div class="zh-header">
                    <h4>中文翻譯</h4>
                    <div class="trans-btn-group">
                        <div class="trans-mode-btn" title="AI 深度翻譯" data-source="${block.enText.replace(/"/g, '&quot;')}" data-words="${wordsArray.join(',')}" onclick="retranslate(this, 'ai')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="9" font-weight="900" fill="currentColor">AI</text></svg></div>
                        <div class="trans-mode-btn" title="Google 翻譯" data-source="${block.enText.replace(/"/g, '&quot;')}" data-words="${wordsArray.join(',')}" onclick="retranslate(this, 'google')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">G</text></svg></div>
                    </div>
                </div>
                <div class="story-card-text story-zh-content">${(block.zhText || '').replace(/\*\*(.*?)\*\*/g, '<span class="star-marker">**</span><b class="zh-keyword">$1</b><span class="star-marker">**</span>') || '（無翻譯紀錄，請手動翻譯）'}</div>
            </div>
        `;
        storiesContainer.appendChild(card);
    });
}
