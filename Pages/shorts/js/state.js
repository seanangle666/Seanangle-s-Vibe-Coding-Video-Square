/**
 * state.js - 應用程式全局狀態管理
 */

const state = {
    // 文字內容
    topTitle: '主標題',
    topSub: '頂部子標題內容',
    botTitle: '主標題',
    botSub: '底部子標題內容',

    // 顏色
    cTopT: '#ffffff',
    cTopS: '#ffffff',
    cBotT: '#ffffff',
    cBotS: '#ffffff',

    // 字體大小
    sTopT: 32,
    sTopS: 18,
    sBotT: 32,
    sBotS: 18,

    // 垂直位置
    topOff: 35,
    botOff: 35,

    // 音頻相關
    bpm: 120,
    pulseStrength: 0.2,
    mode: 'bpm',
    minHz: 20,
    maxHz: 20000,
    loudMin: 50,
    loudMax: 200,
    isSolo: false,

    // 播放和錄製狀態
    isPlaying: false,
    isRecording: false,
    simStart: 0,
    startTime: 0,
    pulse: 1,
    visualB: 1,

    // 音頻上下文
    audioCtx: null,
    audioBuf: null,
    source: null,
    gain: null,
    analyser: null,
    filter: null,
    dataArray: null,

    // MediaRecorder
    mediaRecorder: null,
    recordedChunks: [],

    // 拖動狀態
    drag: null,

    // 字體名稱
    fontName: "'Noto Sans TC', sans-serif",

    // 匯出格式
    exportFormat: 'mp4',
};

// 導出以供其他模塊使用
window.AppState = state;
