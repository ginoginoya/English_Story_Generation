/**
 * app.js - Logic for Starry Sea Vocabulary App
 */

let vocabulary = [];
let currentIndex = 0;
let selectedIndices = new Set(); // 儲存選中的單字索引

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    initStars();
    loadData();
    initEventListeners();
    initAIListeners(); // 新增 AI 相關監聽
});

// --- 1. Dynamic Starfield ---
function initStars() {
    const container = document.getElementById('star-container');
    const starCount = 150;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

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

// --- 2. Data Loading ---
async function loadData() {
    try {
        const response = await fetch('/api/vocabulary');
        vocabulary = await response.json();

        // 動態更新列表的總單字數
        const listCountEl = document.getElementById('list-count');
        if (listCountEl) listCountEl.innerText = `(${vocabulary.length})`;

        initVoiceSelectors();
        // 載入先前的狀態，不再強制清空
        loadState();

        if (vocabulary.length > 0) {
            updateUI();
            updateListGrid(); // 初始化清單
        }
    } catch (error) {
        console.error('Failed to load vocabulary data:', error);
        document.getElementById('word-text').innerText = 'Data Error';
    }
}

// --- 3. UI Update ---
function updateUI() {
    const word = vocabulary[currentIndex];
    const card = document.getElementById('word-card');

    card.classList.remove('fade-in');
    void card.offsetWidth;
    card.classList.add('fade-in');

    document.getElementById('category').innerText = word.categories.join(' | ') || 'General';
    document.getElementById('word-text').innerText = word.word;
    document.getElementById('jump-input').value = currentIndex + 1;
    document.getElementById('total-count').innerText = vocabulary.length;

    // 更新主卡片選取按鈕狀態
    const selectBtn = document.getElementById('card-select-btn');
    const icon = selectBtn.querySelector('i');
    if (selectedIndices.has(currentIndex)) {
        selectBtn.classList.add('selected');
        icon.className = 'fas fa-check-square';
    } else {
        selectBtn.classList.remove('selected');
        icon.className = 'far fa-square';
    }

    const sensesContainer = document.getElementById('senses-container');
    sensesContainer.innerHTML = '';

    word.senses.forEach((sense, idx) => {
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

// --- 4. Selection Logic ---
function toggleSelection(index) {
    if (selectedIndices.has(index)) {
        selectedIndices.delete(index);
    } else {
        if (selectedIndices.size >= 20) {
            alert('一次最多選取 20 個單字，以分兩篇獨立故事生成！');
            return;
        }
        selectedIndices.add(index);
    }

    updateUI();
    updateListGrid();
    updateToolbar();
    saveState(); // 每次點選都儲存狀態
}

function updateToolbar() {
    const toolbar = document.getElementById('story-toolbar');
    const countSpan = document.getElementById('selected-count');
    const count = selectedIndices.size;

    countSpan.innerText = `已選取 ${count} / 20 個單字`;

    // 恆常顯示 Toolbar，不再使用 hidden 切換
    toolbar.classList.remove('hidden');

    // 動態控制生成按鈕狀態 (如果選取數為 0 則不允許點擊)
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

function updateListGrid() {
    const wordsGrid = document.getElementById('all-words-grid');
    if (!wordsGrid) return;

    // 如果網格已經生成，只更新選中狀態
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

    // 第一次生成
    wordsGrid.innerHTML = vocabulary.map((item, index) => `
        <div class="grid-item" data-index="${index}">${item.word}</div>
    `).join('');

    wordsGrid.querySelectorAll('.grid-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index);
            toggleSelection(idx);
        });

        // 雙擊跳轉到該單字
        el.addEventListener('dblclick', () => {
            currentIndex = parseInt(el.dataset.index);
            updateUI();
            document.getElementById('list-overlay').classList.add('hidden');
        });
    });
}

// --- 5. Event Listeners ---
function initEventListeners() {
    document.getElementById('next-btn').addEventListener('click', () => {
        currentIndex = (currentIndex < vocabulary.length - 1) ? currentIndex + 1 : 0;
        updateUI();
    });

    document.getElementById('prev-btn').addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : vocabulary.length - 1;
        updateUI();
    });

    document.getElementById('card-select-btn').addEventListener('click', () => {
        toggleSelection(currentIndex);
    });

    document.getElementById('jump-input').addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) return;
        val = Math.max(1, Math.min(val, vocabulary.length));
        currentIndex = val - 1;
        updateUI();
    });

    // Search & List Trigger
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

    document.getElementById('list-trigger').addEventListener('click', () => {
        updateListGrid();
        document.getElementById('list-overlay').classList.remove('hidden');
    });

    // Close overlays
    document.querySelectorAll('.modal, #search-overlay, #list-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });

    document.querySelectorAll('#close-search, #close-list, #close-modal, #close-restore-modal, #close-detail-modal, #close-custom-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.hidden-trigger, #search-overlay, #list-overlay, .modal').classList.add('hidden');

            // UX/UI: Stop TTS whenever a modal is closed
            if (typeof stopKokoroTTS === 'function') {
                stopKokoroTTS();
            }
        });
    });

    document.getElementById('speaker').addEventListener('click', speakWord);

    document.getElementById('detail-speaker').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const text = document.getElementById('detail-word-text').innerText;
        playKokoroTTS(text, btn, true);
    });

    // Restore Story Trigger
    document.getElementById('restore-trigger').addEventListener('click', () => {
        document.getElementById('restore-textarea').value = '';
        document.getElementById('restore-modal').classList.remove('hidden');
    });

    // Custom Story Trigger (不再清空內容)
    document.getElementById('custom-story-trigger').addEventListener('click', () => {
        document.getElementById('custom-story-modal').classList.remove('hidden');
    });

    document.getElementById('convert-restore-btn').addEventListener('click', parseRestoredStory);

    // Drag and Drop for Restore Textarea
    const restoreTextarea = document.getElementById('restore-textarea');

    restoreTextarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        restoreTextarea.classList.add('drag-over');
    });

    restoreTextarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        restoreTextarea.classList.remove('drag-over');
    });

    restoreTextarea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        restoreTextarea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.name.endsWith('.txt') || file.type === 'text/plain') {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const content = event.target.result;
                        const currentVal = restoreTextarea.value;
                        // Append content with a trailing newline, adding a leading newline if there's already text
                        restoreTextarea.value = currentVal + (currentVal ? '\n\n' : '') + content + '\n';
                    };
                    reader.readAsText(file);
                }
            });
        }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') document.getElementById('next-btn').click();
        if (e.key === 'ArrowLeft') document.getElementById('prev-btn').click();
        if (e.key === ' ') { e.preventDefault(); speakWord(); }
    });
}

// --- 6. AI Integration ---
function initAIListeners() {
    document.getElementById('clear-selection').addEventListener('click', () => {
        selectedIndices.clear();
        updateUI();
        updateListGrid();
        updateToolbar();
        saveState(); // 清除後儲存
    });

    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', saveState);
    }

    // 字體大小控制
    document.getElementById('font-inc').addEventListener('click', () => adjustFontSize(0.1));
    document.getElementById('font-dec').addEventListener('click', () => adjustFontSize(-0.1));

    // AI Engine Settings Triggers
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

    // Temperature Slider
    const tempSlider = document.getElementById('engine-temp-slider');
    const tempLabel = document.getElementById('temp-value-label');
    if (tempSlider && tempLabel) {
        tempSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value).toFixed(1);
            tempLabel.innerText = val;
            currentAIConfig.temperature = parseFloat(val);
        });
    }

    // Segmented Controls (Story Detail)
    document.querySelectorAll('#detail-control .segment-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('#detail-control .segment-option').forEach(o => o.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentAIConfig.storyDetail = target.getAttribute('data-value');
        });
    });

    // Segmented Controls (Coherence)
    document.querySelectorAll('#coherence-control .segment-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('#coherence-control .segment-option').forEach(o => o.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentAIConfig.coherence = target.getAttribute('data-value');
        });
    });

    // Segmented Controls (Exam Focus)
    document.querySelectorAll('#exam-control .segment-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('#exam-control .segment-option').forEach(o => o.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentAIConfig.examTarget = target.getAttribute('data-value');
        });
    });

    // Segmented Controls (Translation Mode)
    document.querySelectorAll('#translation-control .segment-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('#translation-control .segment-option').forEach(o => o.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentAIConfig.translationMode = target.getAttribute('data-value');
        });
    });

    document.getElementById('toggle-wide-mode')?.addEventListener('click', () => {
        const modalContent = document.querySelector('#story-modal .modal-content');
        if (modalContent) {
            modalContent.classList.toggle('wide-mode');
            saveState();
        }
    });

    // Model Select in AI Engine
    document.getElementById('engine-model-select')?.addEventListener('change', (e) => {
        currentAIConfig.model = e.target.value;
    });

    // 語速控制
    document.querySelectorAll('.speed-inc').forEach(btn => btn.addEventListener('click', () => adjustSpeed(0.1)));
    document.querySelectorAll('.speed-dec').forEach(btn => btn.addEventListener('click', () => adjustSpeed(-0.1)));

    document.getElementById('generate-story').addEventListener('click', generateStory);

    // 自訂故事模式切換提示與儲存
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

    document.getElementById('generate-custom-story-btn').addEventListener('click', () => {
        const input = document.getElementById('custom-words-input').value;
        const mode = document.getElementById('custom-gen-mode').value;
        const limit = mode === 'unlimited' ? 100 : 20;

        if (/[^a-zA-Z\s,]/.test(input)) {
            alert('出現非規則內的符號！請只輸入英文單字。');
            return;
        }

        const rawWords = input.split(/[\s,]+/);
        const validWords = [];
        for (const w of rawWords) {
            const word = w.trim();
            if (word === '' || word.length > 30) continue;
            validWords.push(word);
            if (validWords.length >= limit) break;
        }

        if (validWords.length === 0) {
            alert('請輸入有效的英文單字！');
            return;
        }

        document.getElementById('custom-story-modal').classList.add('hidden');
        // 呼叫更新後的 generateStory 並傳入 isUnlimited 標記
        generateStory(validWords, null, mode === 'unlimited');
    });

    document.getElementById('copy-story').addEventListener('click', () => {
        const storiesContainer = document.getElementById('stories-container');
        const cards = storiesContainer.querySelectorAll('.story-card');

        if (cards.length === 0) return;

        // 輔助函式：提取文字時將高亮單字加上 ** 標記
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
            // 優化單字提取：從標籤中提取並用逗號分隔，避免文字黏連
            const wordsArray = Array.from(card.querySelectorAll('.word-tag')).map(t => t.innerText);
            const words = wordsArray.join(', ');

            // 對於英文故事，使用自訂函式提取以保留 **
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

// 輔助函式：切分陣列
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

    // 如果文字過長 (超過 1000 字元)，進行分段翻譯
    const MAX_CHUNK_LENGTH = 1000;
    if (text.length > MAX_CHUNK_LENGTH) {
        // 按句號或換行符號拆分，盡量保持語意完整
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

        // 並行翻譯所有區塊
        const translatedChunks = await Promise.all(chunks.map(c => googleTranslate(c, retries)));
        return translatedChunks.join('');
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Google Busy');
        const data = await response.json();
        // 處理 Google API 返回的多行結構
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

// 輔助函數：重新翻譯特定的卡片
async function retranslate(btn, forceMode = null) {
    const text = btn.dataset.source;
    const words = btn.dataset.words;
    if (!text) return;

    const contentDiv = btn.closest('.story-card-content').querySelector('.story-zh-content');
    const headerTitle = btn.closest('.story-card-content')?.querySelector('.zh-header h4');

    // 決定翻譯模式：若有傳入 forceMode 則使用，否則使用設定值
    const mode = forceMode || currentAIConfig.translationMode;

    btn.disabled = true;

    try {
        if (mode === 'ai') {
            if (headerTitle) headerTitle.innerText = '中文翻譯 (AI 深度翻譯)';
            contentDiv.innerHTML = '<div class="shimmer-container"><div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line short"></div></div>';

            const selectedModel = currentAIConfig.model;
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    type: 'translate',
                    vocabularyList: words,
                    sourceText: text,
                    temperature: 0.3
                })
            });

            if (!response.ok) throw new Error('AI 翻譯失敗');
            const data = await response.json();
            let translatedContent = data.choices[0].message.content.trim();

            // 淨化字串
            translatedContent = translatedContent.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

            // 處理標籤樣式：隱形星號技術 (確保複製時存在，但視覺隱藏)
            const styledTranslation = translatedContent.replace(/\*\*(.*?)\*\*/g, '<span class="star-marker">**</span><b class="zh-keyword">$1</b><span class="star-marker">**</span>');
            contentDiv.innerHTML = styledTranslation;
        } else {
            if (headerTitle) headerTitle.innerText = '中文翻譯 (Google 翻譯)';
            contentDiv.innerHTML = '<div class="translation-loading"><div class="shimmer-line"></div><div class="shimmer-line short"></div></div>';
            const cleanStory = text.replace(/\*/g, '');
            const translation = await googleTranslate(cleanStory, 1);
            contentDiv.innerText = translation;
        }
    } catch (error) {
        console.error('Retranslate error:', error);
        contentDiv.innerText = '翻譯失敗，請再試一次。';
    } finally {
        btn.disabled = false;
    }
}


async function generateStory(customWordsArray = null, customModel = null, isUnlimited = false) {
    // 判斷是否為事件物件（如果是透過 addEventListener 觸發，第一個參數會是 Event）
    if (customWordsArray && (customWordsArray instanceof Event || customWordsArray.originalEvent)) {
        customWordsArray = null;
        customModel = null;
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

    // --- 自動模型管理邏輯 (Silent) ---
    try {
        const res = await fetch('/api/ai/models');
        if (res.ok) {
            const data = await res.json();
            const loadedModels = data.data || [];

            // 如果需要的模型不在裡面，先把其他的都卸載以釋放 VRAM
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
        console.warn('Failed to check/unload models', e);
    }
    // ---------------------------------

    modal.classList.remove('hidden');
    storiesContainer.innerHTML = '';

    loader.style.setProperty('display', 'flex', 'important');
    loader.classList.remove('hidden');

    const loaderMessage = document.getElementById('loader-message');
    loaderMessage.innerText = isUnlimited ? `AI 正在編寫長篇故事 (共 ${selectedWords.length} 字)...` : `AI 正在同時生成所有故事...`;

    await new Promise(resolve => setTimeout(resolve, 100));

    // 如果是無限制模式，chunk 大小設為總數，確保只有一組
    const chunkSize = isUnlimited ? selectedWords.length : 10;
    const wordChunks = chunkArray(selectedWords, chunkSize);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 長篇模式給 5 分鐘逾時

    try {

        // 併發處理所有組別
        const storyPromises = wordChunks.map(async (chunk, i) => {
            const formattedWords = chunk.map((w, idx) => `${idx + 1}. ${w}`).join('\n');

            // 7. 最終組合 - 交由後端處理 Prompt
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

            // 建立卡片並預先佔位
            const card = document.createElement('div');
            card.className = 'story-card glass animate-in';
            card.dataset.index = i; // 標記索引以便排序（如果需要）

            const cleanText = (t) => t.replace(/\*\*(.*?)\*\*/g, '<span class="keyword-highlight">$1</span>');

            // Build word tags with Tooltip and Click events
            const wordsHtml = chunk.map(w => {
                const dbWord = vocabulary.find(item => item.word.toLowerCase() === w.toLowerCase());
                if (dbWord) {
                    const firstDef = dbWord.senses[0]?.definition_zh || '';
                    // Limit tooltip length
                    const shortDef = firstDef.length > 15 ? firstDef.substring(0, 15) + '...' : firstDef;
                    return `<span class="word-tag word-tag-s" data-tooltip="${shortDef}" onclick="showWordDetail('${w.replace(/'/g, "\\'")}')">${w}</span>`;
                } else {
                    return `<span class="word-tag word-tag-s no-click">${w}</span>`;
                }
            }).join('');

            card.innerHTML = `
                <div class="story-card-header">
                    <div class="vocabulary-header">
                        <i class="fas fa-key"></i>
                        核心單字清單 (組 ${i + 1})
                    </div>
                    <div class="story-card-words words-tags-container">${wordsHtml}</div>
                </div>
                <div class="story-card-content">
                    <div class="story-header-row">
                        <h4>English Story</h4>
                        <button class="tts-btn" title="朗讀英文" onclick="speakStoryText(this)">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                    <div class="story-card-text story-en-content">${cleanText(rawStory)}</div>
                    <div class="story-card-divider"></div>
                    <div class="zh-header">
                        <h4>中文翻譯</h4>
                        <div class="trans-btn-group">
                            <!-- AI 模式按鈕 -->
                            <div class="trans-mode-btn" title="AI 深度翻譯" 
                                 data-source="${rawStory.replace(/"/g, '&quot;')}" 
                                 data-words="${chunk.join(',')}"
                                 onclick="retranslate(this, 'ai')">
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
                                    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="9" font-weight="900" fill="currentColor">AI</text>
                                </svg>
                            </div>
                            <!-- Google 模式按鈕 -->
                            <div class="trans-mode-btn" title="Google 翻譯" 
                                 data-source="${rawStory.replace(/"/g, '&quot;')}" 
                                 data-words="${chunk.join(',')}"
                                 onclick="retranslate(this, 'google')">
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
                                    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">G</text>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div class="story-card-text story-zh-content">
                        <div class="shimmer-container">
                            <div class="shimmer-line"></div>
                            <div class="shimmer-line"></div>
                            <div class="shimmer-line short"></div>
                        </div>
                    </div>
                </div>
            `;

            storiesContainer.appendChild(card);

            // 背景非同步進行翻譯
            (async () => {
                const zhContent = card.querySelector('.story-zh-content');
                if (!zhContent) return;

                if (currentAIConfig.translationMode === 'ai') {
                    // AI 深度翻譯邏輯
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

                        // 淨化字串
                        translatedContent = translatedContent.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

                        // 處理標籤樣式：隱形星號技術
                        const styledTranslation = translatedContent.replace(/\*\*(.*?)\*\*/g, '<span class="star-marker">**</span><b class="zh-keyword">$1</b><span class="star-marker">**</span>');
                        zhContent.innerHTML = styledTranslation;
                    } catch (err) {
                        console.error('AI Translation Error:', err);
                        zhContent.innerText = 'AI 翻譯失敗，請點擊上方按鈕重試。';
                    }
                } else {
                    // 標準 Google 翻譯 (徹底移除星號)
                    const cleanStoryForTranslation = rawStory.replace(/\*/g, '');
                    const translation = await googleTranslate(cleanStoryForTranslation, 1);
                    zhContent.innerText = translation;
                }
            })();
        });

        // 等待所有請求完成
        await Promise.all(storyPromises);

        clearTimeout(timeoutId);
        loader.classList.add('hidden');
        loader.style.display = 'none';

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('AI API Error:', error);
        loader.classList.add('hidden');
        loader.style.display = 'none';
        alert(error.name === 'AbortError' ? '連線超時！' : `連線失敗！：${error.message}`);
    }
}

// --- 7. Text to Speech (Kokoro-82M API Integration) ---
const TTS_API_URL = "/api/tts";
window.currentAudio = null;

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
            if (isWord) {
                voice = femaleVoices[Math.floor(Math.random() * femaleVoices.length)];
            } else {
                const allVoices = [...maleVoices, ...femaleVoices];
                voice = allVoices[Math.floor(Math.random() * allVoices.length)];
            }
        } else {
            voice = selectedSetting;
        }

        const response = await fetch(TTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                voice: voice,
                speed: currentSpeed // 使用目前的語速設定
            })
        });

        if (!response.ok) throw new Error("TTS 伺服器未回應");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        window.currentAudio = new Audio(url);
        btnElement.innerHTML = '<i class="fas fa-stop fa-fade" style="color: #ef4444;"></i>';

        if (btnElement.id === 'detail-speaker' || btnElement.id === 'speaker') {
            window.currentDetailSpeakingBtn = btnElement;
        } else {
            window.currentSpeakingBtn = btnElement;
        }

        window.currentAudio.onended = () => {
            btnElement.innerHTML = originalHtml;
            URL.revokeObjectURL(url);
            if (window.currentSpeakingBtn === btnElement) window.currentSpeakingBtn = null;
            if (window.currentDetailSpeakingBtn === btnElement) window.currentDetailSpeakingBtn = null;
        };

        window.currentAudio.onerror = () => {
            btnElement.innerHTML = originalHtml;
            URL.revokeObjectURL(url);
            if (window.currentSpeakingBtn === btnElement) window.currentSpeakingBtn = null;
            if (window.currentDetailSpeakingBtn === btnElement) window.currentDetailSpeakingBtn = null;
        };

        window.currentAudio.play();
    } catch (e) {
        console.error("TTS Failed:", e);
        btnElement.innerHTML = originalHtml;
        alert("無法連線至本地語音伺服器，請確認 tts_server.py 已啟動！");
    }
}

function speakWord() {
    const wordText = vocabulary[currentIndex].word;
    const btn = document.getElementById('speaker');
    playKokoroTTS(wordText, btn, true);
}

// --- 8. Persistence (localStorage) ---
let currentVoice = 'random'; // 全域語音設定

function initVoiceSelectors() {
    const selectors = document.querySelectorAll('.voice-selector-custom');

    selectors.forEach(selector => {
        const trigger = selector.querySelector('.voice-trigger');
        const menu = selector.querySelector('.voice-menu');
        const options = selector.querySelectorAll('.voice-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.voice-menu').forEach(m => m.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        });

        options.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = opt.getAttribute('data-value');
                const text = opt.innerText;
                updateVoiceSelection(value, text);
                menu.classList.add('hidden');
                saveState();
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.voice-menu').forEach(m => m.classList.add('hidden'));
    });
}

function updateVoiceSelection(value, text) {
    currentVoice = value;
    document.querySelectorAll('.voice-selector-custom').forEach(selector => {
        const nameLabel = selector.querySelector('.selected-voice-name');
        const options = selector.querySelectorAll('.voice-option');
        if (nameLabel) nameLabel.innerText = text;
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === value) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
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

let currentSpeed = 1.0;
let currentAIConfig = {
    model: 'gemma-4-e4b-5.3gb-q4_k_m',
    temperature: 0.1,
    coherence: 'none',
    examTarget: 'toeic',
    storyDetail: 'concise', // 預設精簡
    translationMode: 'google' // 預設使用 Google 翻譯
};

function adjustSpeed(delta) {
    currentSpeed = Math.max(0.5, Math.min(2.0, parseFloat((currentSpeed + delta).toFixed(1))));
    updateSpeedUI();
    saveState();
}

function updateSpeedUI() {
    // 更新所有語速標籤
    document.querySelectorAll('.speed-label').forEach(el => {
        el.innerText = `${currentSpeed.toFixed(1)}x`;
    });

    // 計算指針旋轉角度 (0.5x -> -45deg, 1.0x -> 0deg, 2.0x -> 90deg)
    // 簡單線性映射： (speed - 1.0) * 90
    const rotation = (currentSpeed - 1.0) * 90;
    document.querySelectorAll('.speed-needle').forEach(needle => {
        needle.style.transform = `rotate(${rotation}deg)`;
    });
}

// Add listeners for dropdown changes to auto-save
document.getElementById('model-select')?.addEventListener('change', saveState);

let currentFontScale = 1.0;

function adjustFontSize(delta) {
    currentFontScale = Math.max(0.5, Math.min(2.0, currentFontScale + delta));
    document.documentElement.style.setProperty('--story-font-scale', currentFontScale);
    document.getElementById('font-size-label').innerText = `${Math.round(currentFontScale * 100)}%`;
    saveState();
}

function loadState() {
    const saved = localStorage.getItem('toeic_app_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);

            // 恢復引擎設定 UI
            if (state.aiConfig) {
                currentAIConfig = state.aiConfig;
                // 更新 UI 狀態
                document.getElementById('engine-model-select').value = currentAIConfig.model;
                document.getElementById('engine-temp-slider').value = currentAIConfig.temperature;
                document.getElementById('temp-value-label').innerText = currentAIConfig.temperature;

                // 更新 Segmented Controls
                const updateSegments = (id, val) => {
                    document.querySelectorAll(`#${id} .segment-option`).forEach(opt => {
                        if (opt.getAttribute('data-value') === val) opt.classList.add('active');
                        else opt.classList.remove('active');
                    });
                };
                updateSegments('coherence-control', currentAIConfig.coherence);
                updateSegments('exam-control', currentAIConfig.examTarget);
                updateSegments('detail-control', currentAIConfig.storyDetail || 'concise');
                updateSegments('translation-control', currentAIConfig.translationMode || 'google');
            }

            // 恢復語音選擇
            if (state.selectedVoice) {
                const tempOption = document.querySelector(`.voice-option[data-value="${state.selectedVoice}"]`);
                if (tempOption) {
                    updateVoiceSelection(state.selectedVoice, tempOption.innerText);
                }
            }

            // 恢復自訂故事內容與模式
            if (state.customWords !== undefined) {
                const customInput = document.getElementById('custom-words-input');
                if (customInput) customInput.value = state.customWords;
            }
            if (state.customMode !== undefined) {
                const customModeSelect = document.getElementById('custom-gen-mode');
                if (customModeSelect) {
                    customModeSelect.value = state.customMode;
                    // 觸發變更事件以更新提示文字
                    customModeSelect.dispatchEvent(new Event('change'));
                }
            }

            // 恢復字體大小
            if (state.fontScale) {
                currentFontScale = state.fontScale;
                adjustFontSize(0); // 應用樣式
            }

            if (Array.isArray(state.selectedIndices)) {
                selectedIndices.clear();
                state.selectedIndices.forEach(idx => {
                    if (idx < vocabulary.length) {
                        selectedIndices.add(idx);
                    }
                });
                updateToolbar(); // 確保工具列狀態正確
            }

            // 恢復寬版模式
            if (state.isWideMode) {
                const storyModalContent = document.querySelector('#story-modal .modal-content');
                if (storyModalContent) storyModalContent.classList.add('wide-mode');
            }
        } catch (e) {
            console.error('載入存檔失敗:', e);
        }
    }
}

// --- 9. Word Detail & AI Story TTS ---
function showWordDetail(wordString) {
    const dbWord = vocabulary.find(item => item.word.toLowerCase() === wordString.toLowerCase());
    if (!dbWord) return;

    document.getElementById('detail-word-text').innerText = dbWord.word;

    const sensesContainer = document.getElementById('detail-senses-container');
    sensesContainer.innerHTML = '';

    dbWord.senses.forEach((sense, idx) => {
        if (idx === 0) {
            document.getElementById('detail-ipa').innerText = sense.ipa || 'N/A';
            document.getElementById('detail-kk').innerText = sense.kk || 'N/A';
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

    document.getElementById('word-detail-modal').classList.remove('hidden');
}

function speakStoryText(btnElement) {
    const storyContainer = btnElement.parentElement.nextElementSibling; // .story-en-content
    if (!storyContainer) return;

    // Remove asterisks if they exist in text
    const textToSpeak = storyContainer.innerText.replace(/\*/g, '');
    playKokoroTTS(textToSpeak, btnElement, false);
}

// --- 10. Restore Story from Clipboard ---
function parseRestoredStory() {
    const text = document.getElementById('restore-textarea').value.trim();
    if (!text) {
        alert("請貼上故事內容！");
        return;
    }

    // 使用更強大的正則表達式，支援超長篇文本與各種換行符
    const storyBlocks = [];
    // 增加對 \d+ 的不嚴格限制，並確保能抓取大區塊
    const blockRegex = /\[STORY\s+\d+\]([\s\S]*?)\[\/STORY\s+\d+\]/gi;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
        const blockContent = match[1];

        // 使用非貪婪模式抓取內部標籤
        const vocabMatch = blockContent.match(/\[VOCABULARY\]([\s\S]*?)\[\/VOCABULARY\]/i);
        const enMatch = blockContent.match(/\[STORY_EN\]([\s\S]*?)\[\/STORY_EN\]/i);
        const zhMatch = blockContent.match(/\[STORY_ZH\]([\s\S]*?)\[\/STORY_ZH\]/i);

        if (vocabMatch && enMatch) {
            storyBlocks.push({
                vocabText: vocabMatch[1].trim(),
                enText: enMatch[1].trim(),
                zhText: zhMatch ? zhMatch[1].trim() : "" // 容錯處理：如果還沒翻譯完就備份
            });
        }
    }

    if (storyBlocks.length === 0) {
        alert("格式錯誤！無法解析任何故事卡片，請確認是否有完整的 [STORY n] ... [/STORY n] 標籤結構。");
        return;
    }

    // Close restore modal, open AI story modal
    document.getElementById('restore-modal').classList.add('hidden');

    const modal = document.getElementById('story-modal');
    const storiesContainer = document.getElementById('stories-container');
    const loader = document.getElementById('story-loader');

    modal.classList.remove('hidden');
    loader.classList.add('hidden');
    loader.style.display = 'none';

    storiesContainer.innerHTML = '';

    // Rebuild story cards
    storyBlocks.forEach((block, i) => {
        const card = document.createElement('div');
        card.className = 'story-card glass animate-in';

        // Parse words from vocabText
        const wordsArray = block.vocabText.split(/[\s,]+/).filter(w => w.trim().length > 0);

        const wordsHtml = wordsArray.map(w => {
            const dbWord = vocabulary.find(item => item.word.toLowerCase() === w.toLowerCase());
            if (dbWord) {
                const firstDef = dbWord.senses[0]?.definition_zh || '';
                const shortDef = firstDef.length > 15 ? firstDef.substring(0, 15) + '...' : firstDef;
                return `<span class="word-tag word-tag-s" data-tooltip="${shortDef}" onclick="showWordDetail('${w.replace(/'/g, "\\'")}')">${w}</span>`;
            } else {
                return `<span class="word-tag word-tag-s no-click">${w}</span>`;
            }
        }).join('');

        const cleanText = (t) => t.replace(/\*\*(.*?)\*\*/g, '<span class="keyword-highlight">$1</span>');

        card.innerHTML = `
            <div class="story-card-header">
                <div class="vocabulary-header">
                    <i class="fas fa-history"></i>
                    已還原故事 (組 ${i + 1})
                </div>
                <div class="story-card-words words-tags-container">${wordsHtml}</div>
            </div>
            <div class="story-card-content">
                <div class="story-header-row">
                    <h4>English Story</h4>
                    <button class="tts-btn" title="朗讀英文" onclick="speakStoryText(this)">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="story-card-text story-en-content">${cleanText(block.enText)}</div>
                <div class="story-card-divider"></div>
                <div class="zh-header">
                    <h4>中文翻譯</h4>
                    <div class="trans-btn-group">
                        <!-- AI 模式按鈕 -->
                        <div class="trans-mode-btn" title="AI 深度翻譯" 
                             data-source="${block.enText.replace(/"/g, '&quot;')}" 
                             data-words="${wordsArray.join(',')}"
                             onclick="retranslate(this, 'ai')">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
                                <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="9" font-weight="900" fill="currentColor">AI</text>
                            </svg>
                        </div>
                        <!-- Google 模式按鈕 -->
                        <div class="trans-mode-btn" title="Google 翻譯" 
                             data-source="${block.enText.replace(/"/g, '&quot;')}" 
                             data-words="${wordsArray.join(',')}"
                             onclick="retranslate(this, 'google')">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
                                <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">G</text>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class="story-card-text story-zh-content">${(block.zhText || '').replace(/\*\*(.*?)\*\*/g, '<span class="star-marker">**</span><b class="zh-keyword">$1</b><span class="star-marker">**</span>') || '（無翻譯紀錄，請點擊上方按鈕手動翻譯）'}</div>
            </div>
        `;
        storiesContainer.appendChild(card);
    });
}
