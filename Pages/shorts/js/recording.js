/**
 * recording.js - 錄製和導出邏輯
 */

/**
 * 獲取合適的 MIME type 和格式信息
 */
function getMediaRecorderOptions() {
    const format = window.AppState.exportFormat || 'mp4';
    console.log('嘗試使用格式:', format);
    
    // MP4 選項
    const mp4Options = {
        mimeType: 'video/mp4;codecs=h264,aac',
        videoBitsPerSecond: 18000000
    };
    
    // WebM 選項（備用）
    const webmOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 18000000
    };
    
    // 如果瀏覽器支持指定格式，使用該格式
    if (format === 'mp4' && MediaRecorder.isTypeSupported(mp4Options.mimeType)) {
        console.log('瀏覽器支持 MP4');
        return { ...mp4Options, format: 'mp4', ext: '.mp4' };
    } else if (format === 'webm' && MediaRecorder.isTypeSupported(webmOptions.mimeType)) {
        console.log('瀏覽器支持 WebM');
        return { ...webmOptions, format: 'webm', ext: '.webm' };
    } else {
        // 嘗試 MP4
        if (MediaRecorder.isTypeSupported(mp4Options.mimeType)) {
            console.log('回退到 MP4');
            return { ...mp4Options, format: 'mp4', ext: '.mp4' };
        }
        // 回退到 WebM
        console.log('回退到 WebM');
        return { ...webmOptions, format: 'webm', ext: '.webm' };
    }
}

/**
 * 啟動 MediaRecorder
 */
function startMediaRecorder() {
    console.log('開始 MediaRecorder...');
    const recordCanvas = document.getElementById('record-canvas');
    
    if (!recordCanvas) {
        console.error('錯誤：找不到錄製畫布');
        return;
    }
    
    window.AppState.recordedChunks = [];
    
    try {
        const stream = recordCanvas.captureStream(60);
        let combined = stream;
        
        // 如果有音頻上下文，將音頻混合到視頻中
        if (window.AppState.audioCtx && window.AppState.gain) {
            const dest = window.AppState.audioCtx.createMediaStreamDestination();
            window.AppState.gain.connect(dest);
            combined = new MediaStream([
                ...stream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ]);
        }
        
        const options = getMediaRecorderOptions();
        window.AppState.recordingFormat = options;
        console.log('使用格式:', options.format, '擴展名:', options.ext);
        
        const recordOptions = {
            mimeType: options.mimeType,
            videoBitsPerSecond: options.videoBitsPerSecond
        };
        
        window.AppState.mediaRecorder = new MediaRecorder(combined, recordOptions);
        console.log('MediaRecorder 已創建');
        
        window.AppState.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                console.log('接收錄製數據塊:', e.data.size, 'bytes');
                window.AppState.recordedChunks.push(e.data);
            }
        };
        
        window.AppState.mediaRecorder.onstop = () => {
            console.log('MediaRecorder 停止，總錄製塊數:', window.AppState.recordedChunks.length);
            handleRecordingComplete();
        };
        
        window.AppState.mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder 錯誤:', e.error);
            window.stopPlayback();
        };
        
        window.AppState.mediaRecorder.start();
        console.log('MediaRecorder 已啟動');
    } catch (err) {
        console.error('啟動 MediaRecorder 失敗:', err);
        window.stopPlayback();
    }
}

/**
 * 強制關閉 overlay
 */
function forceCloseOverlay() {
    console.log('用戶強制關閉 overlay');
    const overlay = document.getElementById('export-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none'; // 確保一定隱藏
    }
    
    // 確保停止錄製
    if (window.AppState.isRecording || window.AppState.isPlaying) {
        window.stopPlayback();
    }
}

/**
 * 停止 MediaRecorder 並處理完成
 */
function stopMediaRecorder() {
    console.log('停止 MediaRecorder...');
    if (window.AppState.mediaRecorder) {
        const state = window.AppState.mediaRecorder.state;
        console.log('當前 MediaRecorder 狀態:', state);
        
        if (state !== 'inactive') {
            try {
                window.AppState.mediaRecorder.stop();
                console.log('MediaRecorder 已停止請求');
            } catch (err) {
                console.error('停止 MediaRecorder 時出錯:', err);
            }
        } else {
            console.warn('MediaRecorder 已經是 inactive 狀態');
        }
    } else {
        console.warn('警告：mediaRecorder 不存在');
    }
}

/**
 * 處理 overlay 點擊（可選的快速關閉）
 */
function handleOverlayClick() {
    // 目前只在按按鈕時關閉
    // 如果要允許點擊 overlay 關閉，取消注釋下面的行
    // forceCloseOverlay();
}

/**
 * 隱藏 overlay
 */
function hideExportOverlay() {
    const overlay = document.getElementById('export-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none'; // 確保一定隱藏
    }
}

/**
 * 顯示 overlay
 */
function showExportOverlay() {
    const overlay = document.getElementById('export-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex'; // 確保顯示為flex
    }
}

/**
 * 處理錄製完成
 */
function handleRecordingComplete() {
    console.log('錄製完成，開始處理...');
    showExportOverlay();
    
    // 檢查是否有錄製數據
    if (!window.AppState.recordedChunks || window.AppState.recordedChunks.length === 0) {
        console.error('錯誤：沒有錄製數據');
        setTimeout(() => {
            hideExportOverlay();
            window.stopPlayback();
        }, 2000);
        return;
    }
    
    // 設置超時保護，防止卡住
    const exportTimeout = setTimeout(() => {
        console.error('警告：導出超時，強制關閉overlay');
        hideExportOverlay();
        window.stopPlayback();
    }, 5000); // 5秒超時
    
    setTimeout(() => {
        try {
            const format = window.AppState.recordingFormat || { format: 'webm', ext: '.webm', mimeType: 'video/webm' };
            const mimeType = format.mimeType || 'video/webm';
            const ext = format.ext || '.webm';
            
            const blob = new Blob(window.AppState.recordedChunks, { type: mimeType });
            console.log('Blob 大小:', blob.size, 'bytes, 格式:', format.format);
            
            if (blob.size === 0) {
                console.error('錯誤：Blob 大小為 0');
                throw new Error('視頻數據為空');
            }
            
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `PRO_VIDEO_${Date.now()}${ext}`;
            a.click();
            
            // 清理
            setTimeout(() => URL.revokeObjectURL(a.href), 100);
            clearTimeout(exportTimeout);
            
            console.log('下載已觸發:', a.download);
        } catch (err) {
            console.error('導出失敗:', err);
            clearTimeout(exportTimeout);
        }
        
        hideExportOverlay();
        window.stopPlayback();
    }, 1200);
}

/**
 * 更新錄製計時器
 */
function updateRecTimer(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('rec-timer');
    if (timerEl) {
        timerEl.innerText = `${m}:${s}`;
    }
}

/**
 * 更新錄製狀態指示
 */
function updateRecStatus(isRecording) {
    const statusBar = document.getElementById('rec-status-bar');
    if (!statusBar) return;
    
    if (isRecording) {
        statusBar.classList.remove('hidden');
        statusBar.classList.add('flex');
    } else {
        statusBar.classList.remove('flex');
        statusBar.classList.add('hidden');
    }
}

/**
 * 導出函數到全局作用域
 */
window.startMediaRecorder = startMediaRecorder;
window.stopMediaRecorder = stopMediaRecorder;
window.updateRecTimer = updateRecTimer;
window.updateRecStatus = updateRecStatus;
window.forceCloseOverlay = forceCloseOverlay;
window.handleOverlayClick = handleOverlayClick;
window.hideExportOverlay = hideExportOverlay;
window.showExportOverlay = showExportOverlay;
