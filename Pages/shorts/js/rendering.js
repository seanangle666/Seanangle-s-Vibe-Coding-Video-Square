/**
 * rendering.js - 光譜和畫布渲染邏輯
 */

const DOM_rendering = {
    spectrum: () => document.getElementById('spectrum-canvas'),
    recorder: () => document.getElementById('record-canvas'),
    container: () => document.getElementById('capture-area'),
    fg: () => document.getElementById('preview-fg'),
    bg: () => document.getElementById('preview-bg'),
};

let spectrumCtx = null;
let recorderCtx = null;

/**
 * 初始化渲染上下文
 */
function initRenderingContexts() {
    const specCanvas = DOM_rendering.spectrum();
    const recCanvas = DOM_rendering.recorder();
    
    if (specCanvas) spectrumCtx = specCanvas.getContext('2d');
    if (recCanvas) recorderCtx = recCanvas.getContext('2d');
    
    resizeSpectrumCanvas();
    updateResolution();
}

/**
 * 調整頻譜畫布大小
 */
function resizeSpectrumCanvas() {
    const canvas = DOM_rendering.spectrum();
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
}

/**
 * 更新分辨率
 */
function updateResolution() {
    const ratioSelect = document.getElementById('sel-ratio');
    if (!ratioSelect) return;
    
    const ratio = ratioSelect.value;
    const [wr, hr] = ratio.split('/').map(Number);
    const recorder = DOM_rendering.recorder();
    
    if (hr > wr) {
        recorder.width = 1080;
        recorder.height = 1920;
    } else {
        recorder.width = 1920;
        recorder.height = 1080;
    }
    
    const label = document.getElementById('current-res-info');
    if (label) {
        label.innerText = `輸出預設：${recorder.width}x${recorder.height} 高清`;
    }
}

/**
 * 繪製頻譜分析視圖
 */
function drawSpectrum() {
    if (!spectrumCtx) return;
    
    const canvas = DOM_rendering.spectrum();
    const w = canvas.width;
    const h = canvas.height;
    
    // 清空畫布
    spectrumCtx.clearRect(0, 0, w, h);
    
    // 繪製網格線
    spectrumCtx.strokeStyle = '#222';
    spectrumCtx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
        spectrumCtx.beginPath();
        spectrumCtx.moveTo(0, h / 5 * i);
        spectrumCtx.lineTo(w, h / 5 * i);
        spectrumCtx.stroke();
    }
    
    // 繪製選擇範圍
    const sx = window.hz2x(window.AppState.minHz);
    const ex = window.hz2x(window.AppState.maxHz);
    const sy = window.y2l_h(window.AppState.loudMax, h);
    const ey = window.y2l_h(window.AppState.loudMin, h);
    
    spectrumCtx.fillStyle = 'rgba(57, 255, 20, 0.25)';
    spectrumCtx.fillRect(sx, sy, ex - sx, ey - sy);
    spectrumCtx.strokeStyle = 'var(--neon-green)';
    spectrumCtx.lineWidth = 3;
    spectrumCtx.strokeRect(sx, sy, ex - sx, ey - sy);
    
    // 如果沒有音頻分析器，顯示模擬動畫
    if (!window.AppState.analyser) {
        drawSpectrumSimulation(w, h);
        return;
    }
    
    // 繪製實時頻譜
    const ctx = window.AppState.audioCtx;
    const data = window.getFrequencyData();
    const hb = ctx.sampleRate / window.AppState.analyser.fftSize;
    
    for (let i = 0; i < data.length; i++) {
        const hz = i * hb;
        if (hz < 20) continue;
        
        const x = window.hz2x(hz);
        if (x > w) break;
        
        const val = data[i];
        const bh = (val / 255) * h;
        const inRange = hz >= window.AppState.minHz && 
                        hz <= window.AppState.maxHz && 
                        val >= window.AppState.loudMin;
        
        spectrumCtx.fillStyle = inRange ? 'var(--neon-cyan)' : '#333';
        spectrumCtx.fillRect(x, h - bh, 2, bh);
    }
}

/**
 * 繪製頻譜模擬動畫
 */
function drawSpectrumSimulation(w, h) {
    const t = performance.now() / 1000;
    const beatDur = 60 / window.AppState.bpm;
    const simNorm = Math.exp(-((t % beatDur) / beatDur) * 8);
    
    for (let i = 0; i < 80; i++) {
        const hz = i * (20000 / 80);
        if (hz < 20) continue;
        
        const x = window.hz2x(hz);
        if (x > w) break;
        
        let val = Math.random() * 30 + 10;
        
        if (hz >= window.AppState.minHz && hz <= window.AppState.maxHz) {
            val += simNorm * 180;
        }
        
        const bh = (Math.min(255, val) / 255) * h;
        spectrumCtx.fillStyle = (hz >= window.AppState.minHz && 
                                hz <= window.AppState.maxHz && 
                                val >= window.AppState.loudMin) ? 'var(--neon-cyan)' : '#333';
        spectrumCtx.fillRect(x, h - bh, 2, bh);
    }
}

/**
 * 渲染到錄製畫布
 */
function renderToRecorder() {
    if (!recorderCtx) return;
    
    const w = DOM_rendering.recorder().width;
    const h = DOM_rendering.recorder().height;
    
    recorderCtx.clearRect(0, 0, w, h);
    
    // 繪製背景圖層（模糊）
    recorderCtx.save();
    recorderCtx.filter = 'blur(60px) brightness(0.4)';
    recorderCtx.drawImage(DOM_rendering.bg(), 0, 0, w, h);
    recorderCtx.restore();
    
    // 繪製前景圖層（縮放）
    const sc = window.AppState.pulse;
    const fw = w * sc;
    const fh = (DOM_rendering.fg().naturalHeight / DOM_rendering.fg().naturalWidth) * fw;
    recorderCtx.drawImage(DOM_rendering.fg(), (w - fw) / 2, (h - fh) / 2, fw, fh);
    
    // 繪製文字
    drawTextGroup(true, w, h);
    drawTextGroup(false, w, h);
    
    // 應用視覺淡入淡出
    if (window.AppState.visualB < 1) {
        recorderCtx.fillStyle = `rgba(0,0,0,${1 - window.AppState.visualB})`;
        recorderCtx.fillRect(0, 0, w, h);
    }
}

/**
 * 繪製文字組
 */
function drawTextGroup(isTop, w, h) {
    const zoom = w / 400;
    const offset = isTop ? window.AppState.topOff : window.AppState.botOff;
    const yBase = isTop ? (h / 2) - (h * offset / 100) : (h / 2) + (h * offset / 100);
    
    const title = isTop ? window.AppState.topTitle : window.AppState.botTitle;
    const sub = isTop ? window.AppState.topSub : window.AppState.botSub;
    const c1 = isTop ? window.AppState.cTopT : window.AppState.cBotT;
    const c2 = isTop ? window.AppState.cTopS : window.AppState.cBotS;
    const s1 = isTop ? window.AppState.sTopT : window.AppState.sBotT;
    const s2 = isTop ? window.AppState.sTopS : window.AppState.sBotS;
    
    const h1 = s1 * zoom;
    const h2 = s2 * zoom;
    const gap = 6 * zoom;
    const totalH = h1 + h2 + gap;
    const startY = yBase - (totalH / 2);
    
    recorderCtx.textAlign = 'center';
    recorderCtx.shadowColor = 'rgba(0,0,0,0.9)';
    recorderCtx.shadowBlur = 25 * zoom;
    
    // 繪製標題
    recorderCtx.font = `900 ${h1}px ${window.AppState.fontName}`;
    recorderCtx.fillStyle = c1;
    recorderCtx.textBaseline = 'top';
    recorderCtx.fillText(title, w / 2, startY);
    
    // 繪製副標題
    recorderCtx.font = `400 ${h2}px ${window.AppState.fontName}`;
    recorderCtx.fillStyle = c2;
    recorderCtx.fillText(sub, w / 2, startY + h1 + gap);
}

/**
 * 更新預覽容器的亮度
 */
function updatePreviewBrightness(brightness) {
    DOM_rendering.container().style.setProperty('--visual-brightness', brightness);
}

/**
 * 更新前景圖層的縮放
 */
function updateFGScale(scale) {
    DOM_rendering.fg().style.transform = `scale(${scale})`;
}

/**
 * 導出指標
 */
window.hz2x = (hz) => {
    const canvas = DOM_rendering.spectrum();
    return (Math.log10(hz) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * canvas.width;
};

window.x2hz = (x) => {
    const canvas = DOM_rendering.spectrum();
    return Math.pow(10, (x / canvas.width) * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
};

window.y2l = (y) => {
    const canvas = DOM_rendering.spectrum();
    return ((canvas.height - y) / canvas.height) * 255;
};

window.y2l_h = (l, h) => h - (l / 255 * h);

// 導出函數到全局作用域
window.initRenderingContexts = initRenderingContexts;
window.drawSpectrum = drawSpectrum;
window.renderToRecorder = renderToRecorder;
window.updatePreviewBrightness = updatePreviewBrightness;
window.updateFGScale = updateFGScale;
window.resizeSpectrumCanvas = resizeSpectrumCanvas;
window.updateResolution = updateResolution;
