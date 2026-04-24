/**
 * app.js - 主應用程式邏輯和動畫循環
 */

/**
 * 開始播放或錄製
 */
async function startPlayback(isRecording) {
    try {
        console.log('開始播放，錄製模式:', isRecording);
        
        await window.initAudioContext();
        
        const startTime = parseFloat(document.getElementById('aud-start').value) || 0;
        const duration = parseFloat(document.getElementById('aud-dur').value) || 15;
        const fadeIn = parseFloat(document.getElementById('aud-fin').value) || 0;
        const fadeOut = parseFloat(document.getElementById('aud-fout').value) || 0;
        
        // 設置音頻節點
        if (window.AppState.audioBuf) {
            window.setupAudioNode();
            window.setupVolumeEnvelope(startTime, duration, fadeIn, fadeOut);
            window.connectAudioNodes();
            window.playAudio(startTime, duration);
        }
        
        // 更新 UI 狀態
        window.AppState.simStart = performance.now();
        window.AppState.isPlaying = true;
        
        const playBtn = document.getElementById('btn-play');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>停止預覽';
        }
        
        if (isRecording) {
            window.AppState.isRecording = true;
            
            const recordBtn = document.getElementById('btn-record');
            if (recordBtn) {
                recordBtn.classList.add('recording-active');
                recordBtn.innerHTML = '<i class="fas fa-square mr-2"></i>停止錄製';
            }
            
            window.updateRecStatus(true);
            window.startMediaRecorder();
            console.log('錄製已啟動');
        }
    } catch (err) {
        console.error('啟動播放/錄製失敗:', err);
        window.stopPlayback();
    }
}

/**
 * 停止播放或錄製
 */
function stopPlayback() {
    console.log('停止播放，當前狀態:', { isPlaying: window.AppState.isPlaying, isRecording: window.AppState.isRecording });
    
    window.stopAudio();
    
    if (window.AppState.mediaRecorder && window.AppState.mediaRecorder.state !== 'inactive') {
        window.stopMediaRecorder();
    }
    
    window.AppState.isPlaying = false;
    window.AppState.isRecording = false;
    
    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play mr-2"></i>預覽播放';
    }
    
    const recordBtn = document.getElementById('btn-record');
    if (recordBtn) {
        recordBtn.innerHTML = '<i class="fas fa-video mr-2"></i>錄製影片';
        recordBtn.classList.remove('recording-active');
    }
    
    window.updateRecStatus(false);
    
    // 確保 overlay 被隱藏
    if (window.hideExportOverlay) {
        window.hideExportOverlay();
    } else {
        const overlay = document.getElementById('export-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none'; // 確保一定隱藏
        }
    }
    
    window.updatePreviewBrightness(1);
    window.updateFGScale(1);
    
    // 重置跳動
    window.AppState.pulse = 1;
    
    console.log('播放已停止');
}

/**
 * 計算當前脈衝值
 */
function calculatePulse(currentTime, duration, fadeIn, fadeOut) {
    const beatDur = 60 / window.AppState.bpm;
    let scale = 1;
    
    if (window.AppState.mode === 'bpm') {
        // BPM 模式：基於節拍計算脈衝
        const beatPhase = (currentTime % beatDur) / beatDur;
        const beatIntensity = Math.exp(-beatPhase * 8);
        scale = 1 + (beatIntensity * window.AppState.pulseStrength);
    } else if (window.AppState.analyser) {
        // 頻率響應模式：基於音頻頻率
        const avg = window.getFrequencyAverage(window.AppState.minHz, window.AppState.maxHz);
        let norm = (avg - window.AppState.loudMin) / (window.AppState.loudMax - window.AppState.loudMin || 1);
        scale = 1 + (Math.pow(Math.max(0, Math.min(1, norm)), 1.2) * window.AppState.pulseStrength * 2.5);
    } else if (window.AppState.mode === 'auto' && !window.AppState.analyser) {
        // 無音頻時的自動模式
        const beatPhase = (currentTime % beatDur) / beatDur;
        const beatIntensity = Math.exp(-beatPhase * 8);
        scale = 1 + (beatIntensity * window.AppState.pulseStrength * 1.5);
    }
    
    return scale;
}

/**
 * 計算視覺淡入淡出
 */
function calculateVisualBrightness(currentTime, fadeIn, fadeOut, duration) {
    let b = 1;
    
    if (currentTime < fadeIn) {
        b = currentTime / fadeIn;
    } else if (currentTime > duration - fadeOut) {
        b = Math.max(0, (duration - currentTime) / fadeOut);
    }
    
    return b;
}

/**
 * 主動畫循環
 */
function animationLoop() {
    window.drawSpectrum();
    
    if (window.AppState.isPlaying) {
        const duration = parseFloat(document.getElementById('aud-dur').value) || 15;
        const fadeIn = parseFloat(document.getElementById('aud-fin').value) || 0;
        const fadeOut = parseFloat(document.getElementById('aud-fout').value) || 0;
        
        // 計算當前時間
        let currentTime = 0;
        if (window.AppState.audioCtx && window.AppState.source) {
            currentTime = window.AppState.audioCtx.currentTime - window.AppState.startTime;
        } else {
            currentTime = (performance.now() - window.AppState.simStart) / 1000;
        }
        
        // 計算視覺亮度
        const brightness = calculateVisualBrightness(currentTime, fadeIn, fadeOut, duration);
        window.AppState.visualB = brightness;
        window.updatePreviewBrightness(brightness);
        
        // 更新錄製計時器
        if (window.AppState.isRecording) {
            window.updateRecTimer(currentTime);
        }
        
        // 計算脈衝縮放
        const scale = calculatePulse(currentTime, duration, fadeIn, fadeOut);
        window.AppState.pulse = scale;
        window.updateFGScale(scale);
        
        // 渲染到錄製畫布
        if (window.AppState.isRecording) {
            window.renderToRecorder();
        }
        
        // 檢查是否應該停止
        if (currentTime >= duration) {
            window.stopPlayback();
        }
    }
    
    requestAnimationFrame(animationLoop);
}

/**
 * 初始化應用程式
 */
function initApp() {
    // 初始化音頻文件載入
    const audioInput = document.getElementById('in-audio');
    if (audioInput) {
        audioInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                window.loadAudioFile(arrayBuffer);
            }
        };
    }
    
    // 初始化渲染上下文
    window.initRenderingContexts();
    
    // 初始化 UI 事件
    window.initUI();
    
    // 啟動動畫循環
    animationLoop();
}

/**
 * 在 DOM 完全加載後初始化應用程式
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// 導出到全局作用域
window.startPlayback = startPlayback;
window.stopPlayback = stopPlayback;
window.calculatePulse = calculatePulse;
window.animationLoop = animationLoop;
