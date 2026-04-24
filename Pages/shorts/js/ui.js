/**
 * ui.js - UI 元素初始化和事件綁定
 */

const DOM = {
    // 主容器
    container: () => document.getElementById('capture-area'),
    
    // 圖層
    fg: () => document.getElementById('preview-fg'),
    bg: () => document.getElementById('preview-bg'),
    
    // 畫布
    spectrum: () => document.getElementById('spectrum-canvas'),
    recorder: () => document.getElementById('record-canvas'),
    
    // 按鈕
    playBtn: () => document.getElementById('btn-play'),
    recordBtn: () => document.getElementById('btn-record'),
    soloAudioBtn: () => document.getElementById('btn-solo-audio'),
    soloFreqBtn: () => document.getElementById('btn-solo-freq'),
    
    // 狀態指示
    overlay: () => document.getElementById('export-overlay'),
    status: () => document.getElementById('sys-msg'),
    recStatus: () => document.getElementById('rec-status-bar'),
    timer: () => document.getElementById('rec-timer'),
    
    // 預覽文字元素
    pTopT: () => document.getElementById('p-top-title'),
    pTopS: () => document.getElementById('p-top-sub'),
    pBotT: () => document.getElementById('p-bottom-title'),
    pBotS: () => document.getElementById('p-bottom-sub'),
    
    // 輸入框
    inputs: {
        topTitle: () => document.getElementById('t-top-title'),
        topSub: () => document.getElementById('t-top-sub'),
        botTitle: () => document.getElementById('t-bot-title'),
        botSub: () => document.getElementById('t-bot-sub'),
        
        cTopTitle: () => document.getElementById('c-top-title'),
        cTopSub: () => document.getElementById('c-top-sub'),
        cBotTitle: () => document.getElementById('c-bot-title'),
        cBotSub: () => document.getElementById('c-bot-sub'),
        
        sTopTitle: () => document.getElementById('s-top-title'),
        sTopSub: () => document.getElementById('s-top-sub'),
        sBotTitle: () => document.getElementById('s-bot-title'),
        sBotSub: () => document.getElementById('s-bot-sub'),
        
        oTopOff: () => document.getElementById('o-top-off'),
        oBotOff: () => document.getElementById('o-bot-off'),
        
        ratio: () => document.getElementById('sel-ratio'),
        
        // 音頻控制
        audioFile: () => document.getElementById('in-audio'),
        audioStart: () => document.getElementById('aud-start'),
        audioDur: () => document.getElementById('aud-dur'),
        audioFadeIn: () => document.getElementById('aud-fin'),
        audioFadeOut: () => document.getElementById('aud-fout'),
        
        // BPM 和強度
        bpmVal: () => document.getElementById('i-bpm-val'),
        strVal: () => document.getElementById('i-str-val'),
        
        // 文件上傳
        fgImage: () => document.getElementById('in-fg'),
        bgImage: () => document.getElementById('in-bg'),
        fontFile: () => document.getElementById('in-font'),
        
        // 模式按鈕
        modeBpm: () => document.getElementById('mode-bpm'),
        modeAuto: () => document.getElementById('mode-auto'),
    },
    
    // 標籤顯示值
    labels: {
        vTopOff: () => document.getElementById('v-o-top-off'),
        vBotOff: () => document.getElementById('v-o-bot-off'),
        vTopTitle: () => document.getElementById('v-s-top-title'),
        vTopSub: () => document.getElementById('v-s-top-sub'),
        vBotTitle: () => document.getElementById('v-s-bot-title'),
        vBotSub: () => document.getElementById('v-s-bot-sub'),
        vBpmVal: () => document.getElementById('v-bpm-val'),
        vStrVal: () => document.getElementById('v-str-val'),
        resInfo: () => document.getElementById('current-res-info'),
    }
};

/**
 * 設置輸入綁定
 */
function setupInput(inputId, stateKey, previewEl, type = 'text') {
    const input = DOM.inputs[inputId] ? DOM.inputs[inputId]() : document.getElementById(inputId);
    if (!input) return;

    input.oninput = (e) => {
        const value = e.target.value;
        window.AppState[stateKey] = value;

        if (type === 'text' && previewEl) {
            const el = typeof previewEl === 'string' ? previewEl : previewEl();
            if (el) el.innerText = value;
        } else if (type === 'color' && previewEl) {
            const el = typeof previewEl === 'string' ? previewEl : previewEl();
            if (el) el.style.color = value;
        } else if (type === 'size' && previewEl) {
            const el = typeof previewEl === 'string' ? previewEl : previewEl();
            if (el) {
                el.style.fontSize = value + 'px';
                updateValueLabel('v-s-' + inputId, value);
            }
        } else if (type === 'offset') {
            updateValueLabel('v-' + inputId, value + '%');
            const offsetKey = inputId.substring(2).replace('-off', '-offset');
            DOM.container().style.setProperty('--' + offsetKey, value + '%');
        }
    };
}

/**
 * 更新標籤顯示值
 */
function updateValueLabel(labelId, value) {
    const label = document.getElementById(labelId);
    if (label) label.innerText = value;
}

/**
 * 初始化所有 UI 事件和綁定
 */
function initUI() {
    // 資產上傳
    DOM.inputs.fgImage().onchange = (e) => {
        const url = URL.createObjectURL(e.target.files[0]);
        DOM.fg().src = url;
        if (!DOM.inputs.bgImage().files[0]) {
            DOM.bg().src = url;
        }
    };

    DOM.inputs.bgImage().onchange = (e) => {
        DOM.bg().src = URL.createObjectURL(e.target.files[0]);
    };

    DOM.inputs.fontFile().onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fontName = 'Custom_' + Date.now();
        try {
            const face = new FontFace(fontName, await file.arrayBuffer());
            await face.load();
            document.fonts.add(face);
            window.AppState.fontName = fontName;
            document.querySelectorAll('.text-group div').forEach(el => {
                el.style.fontFamily = fontName;
            });
        } catch (err) {
            console.error("字體載入錯誤:", err);
        }
    };

    // 比率選擇
    DOM.inputs.ratio().onchange = (e) => {
        DOM.container().style.aspectRatio = e.target.value;
        updateResolution();
    };

    // 格式選擇
    const formatSelect = document.getElementById('sel-format');
    if (formatSelect) {
        formatSelect.onchange = (e) => {
            window.AppState.exportFormat = e.target.value;
            console.log('已選擇匯出格式:', e.target.value);
        };
    }

    // 文字輸入綁定
    setupInput('topTitle', 'topTitle', DOM.pTopT);
    setupInput('topSub', 'topSub', DOM.pTopS);
    setupInput('botTitle', 'botTitle', DOM.pBotT);
    setupInput('botSub', 'botSub', DOM.pBotS);

    // 顏色綁定
    setupInput('cTopTitle', 'cTopT', DOM.pTopT, 'color');
    setupInput('cTopSub', 'cTopS', DOM.pTopS, 'color');
    setupInput('cBotTitle', 'cBotT', DOM.pBotT, 'color');
    setupInput('cBotSub', 'cBotS', DOM.pBotS, 'color');

    // 字體大小綁定
    setupInput('sTopTitle', 'sTopT', DOM.pTopT, 'size');
    setupInput('sTopSub', 'sTopS', DOM.pTopS, 'size');
    setupInput('sBotTitle', 'sBotT', DOM.pBotT, 'size');
    setupInput('sBotSub', 'sBotS', DOM.pBotS, 'size');

    // 位置綁定
    setupInput('oTopOff', 'topOff', DOM.pTopT, 'offset');
    setupInput('oBotOff', 'botOff', DOM.pBotT, 'offset');

    // 模式切換
    DOM.inputs.modeBpm().onclick = () => {
        window.AppState.mode = 'bpm';
        DOM.inputs.modeBpm().classList.add('active');
        DOM.inputs.modeAuto().classList.remove('active');
        const bpmPanel = document.getElementById('panel-bpm');
        if (bpmPanel) bpmPanel.classList.remove('hidden');
    };

    DOM.inputs.modeAuto().onclick = () => {
        window.AppState.mode = 'auto';
        DOM.inputs.modeAuto().classList.add('active');
        DOM.inputs.modeBpm().classList.remove('active');
        const bpmPanel = document.getElementById('panel-bpm');
        if (bpmPanel) bpmPanel.classList.add('hidden');
    };

    // BPM 和強度
    DOM.inputs.bpmVal().oninput = (e) => {
        window.AppState.bpm = parseInt(e.target.value);
        updateValueLabel('v-bpm-val', e.target.value);
    };

    DOM.inputs.strVal().oninput = (e) => {
        window.AppState.pulseStrength = parseFloat(e.target.value);
        updateValueLabel('v-str-val', e.target.value);
    };

    // Solo 功能
    const soloFreq = DOM.soloFreqBtn();
    if (soloFreq) {
        soloFreq.onclick = () => {
            window.AppState.isSolo = !window.AppState.isSolo;
            soloFreq.innerText = `SOLO BAND: ${window.AppState.isSolo ? 'ON' : 'OFF'}`;
            soloFreq.classList.toggle('bg-neon-cyan', window.AppState.isSolo);
            soloFreq.classList.toggle('text-black', window.AppState.isSolo);
        };
    }

    // 播放和錄製按鈕
    DOM.playBtn().onclick = () => {
        if (window.AppState.isPlaying) {
            window.stopPlayback();
        } else {
            window.startPlayback(false);
        }
    };

    DOM.recordBtn().onclick = () => {
        if (window.AppState.isRecording) {
            window.stopPlayback();
        } else {
            window.startPlayback(true);
        }
    };

    const soloAudio = DOM.soloAudioBtn();
    if (soloAudio) {
        soloAudio.onclick = () => {
            if (window.AppState.isPlaying) {
                window.stopPlayback();
            } else {
                window.startPlayback(false);
            }
        };
    }

    // 頻譜畫布事件
    setupSpectrumEvents();

    // 窗口大小調整
    window.addEventListener('resize', resizeSpectrumCanvas);
}

/**
 * 設置頻譜畫布事件
 */
function setupSpectrumEvents() {
    const canvas = DOM.spectrum();
    canvas.onmousedown = (e) => {
        const rect = canvas.getBoundingClientRect();
        window.AppState.drag = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    window.addEventListener('mousemove', (e) => {
        if (!window.AppState.drag) return;
        const rect = canvas.getBoundingClientRect();
        const cx = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
        const cy = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));
        window.AppState.minHz = Math.min(window.x2hz(window.AppState.drag.x), window.x2hz(cx));
        window.AppState.maxHz = Math.max(window.x2hz(window.AppState.drag.x), window.x2hz(cx));
        window.AppState.loudMin = Math.min(window.y2l(window.AppState.drag.y), window.y2l(cy));
        window.AppState.loudMax = Math.max(window.y2l(window.AppState.drag.y), window.y2l(cy));
    });

    window.addEventListener('mouseup', () => {
        window.AppState.drag = null;
    });
}

/**
 * 調整頻譜畫布大小
 */
function resizeSpectrumCanvas() {
    const canvas = DOM.spectrum();
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

/**
 * 更新分辨率
 */
function updateResolution() {
    const ratio = DOM.inputs.ratio().value;
    const [wr, hr] = ratio.split('/').map(Number);
    const recorder = DOM.recorder();
    
    if (hr > wr) {
        recorder.width = 1080;
        recorder.height = 1920;
    } else {
        recorder.width = 1920;
        recorder.height = 1080;
    }
    
    const label = DOM.labels.resInfo();
    if (label) {
        label.innerText = `輸出預設：${recorder.width}x${recorder.height} 高清`;
    }
}

/**
 * 導出 UI 初始化函數
 */
window.initUI = initUI;
window.updateResolution = updateResolution;
window.resizeSpectrumCanvas = resizeSpectrumCanvas;
