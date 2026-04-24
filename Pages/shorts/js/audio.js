/**
 * audio.js - 音頻處理邏輯
 */

/**
 * 初始化音頻上下文
 */
async function initAudioContext() {
    if (!window.AppState.audioCtx) {
        window.AppState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.AppState.audioCtx.state === 'suspended') {
        await window.AppState.audioCtx.resume();
    }
}

/**
 * 載入音頻文件
 */
function loadAudioFile(arrayBuffer) {
    if (!window.AppState.audioCtx) {
        window.AppState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    window.AppState.audioCtx.decodeAudioData(arrayBuffer).then(buffer => {
        window.AppState.audioBuf = buffer;
        const status = document.getElementById('sys-msg');
        if (status) {
            status.innerText = "狀態：音樂已就緒";
        }
    }).catch(err => {
        console.error("音頻解碼失敗:", err);
    });
}

/**
 * 設置音頻源和分析器
 */
function setupAudioNode() {
    const ctx = window.AppState.audioCtx;
    const buf = window.AppState.audioBuf;

    if (!ctx || !buf) return;

    // 創建源
    window.AppState.source = ctx.createBufferSource();
    window.AppState.source.buffer = buf;

    // 創建音量控制
    window.AppState.gain = ctx.createGain();

    // 創建分析器
    window.AppState.analyser = ctx.createAnalyser();
    window.AppState.analyser.fftSize = 2048;
    window.AppState.dataArray = new Uint8Array(window.AppState.analyser.frequencyBinCount);

    // 創建濾波器用於 Solo 模式
    window.AppState.filter = ctx.createBiquadFilter();
    window.AppState.filter.type = "bandpass";
    window.AppState.filter.frequency.value = Math.sqrt(window.AppState.minHz * window.AppState.maxHz);
    window.AppState.filter.Q.value = window.AppState.filter.frequency.value / (window.AppState.maxHz - window.AppState.minHz || 1);
}

/**
 * 設置音量包絡線（淡入淡出）
 */
function setupVolumeEnvelope(sT, dur, fin, fout) {
    const ctx = window.AppState.audioCtx;
    const now = ctx.currentTime;
    
    window.AppState.gain.gain.setValueAtTime(0, now);
    window.AppState.gain.gain.linearRampToValueAtTime(1, now + fin);
    window.AppState.gain.gain.setValueAtTime(1, now + dur - fout);
    window.AppState.gain.gain.linearRampToValueAtTime(0, now + dur);
}

/**
 * 連接音頻節點
 */
function connectAudioNodes() {
    window.AppState.source.connect(window.AppState.analyser);
    
    if (window.AppState.isSolo) {
        window.AppState.analyser.connect(window.AppState.filter);
        window.AppState.filter.connect(window.AppState.gain);
    } else {
        window.AppState.analyser.connect(window.AppState.gain);
    }
    
    window.AppState.gain.connect(window.AppState.audioCtx.destination);
}

/**
 * 開始播放音頻
 */
function playAudio(startTime, duration) {
    if (!window.AppState.source) return;
    window.AppState.source.start(0, startTime, duration);
    window.AppState.startTime = window.AppState.audioCtx.currentTime;
}

/**
 * 停止音頻播放
 */
function stopAudio() {
    if (window.AppState.source) {
        try {
            window.AppState.source.stop();
        } catch (e) {
            // 已經停止或適應異常
        }
    }
}

/**
 * 獲取當前頻率數據
 */
function getFrequencyData() {
    if (!window.AppState.analyser) return null;
    window.AppState.analyser.getByteFrequencyData(window.AppState.dataArray);
    return window.AppState.dataArray;
}

/**
 * 計算給定頻率範圍的平均值
 */
function getFrequencyAverage(minHz, maxHz) {
    if (!window.AppState.analyser) return 0;
    
    const hb = window.AppState.audioCtx.sampleRate / window.AppState.analyser.fftSize;
    const minB = Math.floor(minHz / hb);
    const maxB = Math.floor(maxHz / hb);
    
    let sum = 0, count = 0;
    for (let i = minB; i <= maxB && i < window.AppState.dataArray.length; i++) {
        sum += window.AppState.dataArray[i];
        count++;
    }
    
    return count > 0 ? sum / count : 0;
}

/**
 * 導出音頻函數
 */
window.initAudioContext = initAudioContext;
window.loadAudioFile = loadAudioFile;
window.setupAudioNode = setupAudioNode;
window.setupVolumeEnvelope = setupVolumeEnvelope;
window.connectAudioNodes = connectAudioNodes;
window.playAudio = playAudio;
window.stopAudio = stopAudio;
window.getFrequencyData = getFrequencyData;
window.getFrequencyAverage = getFrequencyAverage;
