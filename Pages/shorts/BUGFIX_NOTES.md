# 錄製卡住問題修復

## 問題描述
頁面啟動時或錄製導出時頁面可能卡住，導出overlay無法自動隱藏。

## 修復內容

### 1. 改進 `recording.js`

#### 新增：錯誤檢查和日誌
- `startMediaRecorder()` 現在會檢查 `record-canvas` 元素是否存在
- 添加 try-catch 錯誤處理
- 新增 `onerror` 回調，在 MediaRecorder 錯誤時自動停止
- 詳細的 console 日誌用於調試

#### 新增：超時保護機制
- `handleRecordingComplete()` 現在有 5 秒超時保護
- 如果導出超時，會自動關閉 overlay 並停止播放
- 檢查 `recordedChunks` 是否為空

#### 改進的錯誤處理
```javascript
// 新增檢查
if (!window.AppState.recordedChunks || window.AppState.recordedChunks.length === 0) {
    console.error('錯誤：沒有錄製數據');
    // 清理並退出
}

// 新增超時保護
const exportTimeout = setTimeout(() => {
    console.error('警告：導出超時，強制關閉overlay');
    // 強制清理
}, 5000);
```

### 2. 改進 `app.js`

#### 強化 `stopPlayback()` 函數
- 添加詳細的 console 日誌
- 確保 overlay 一定會被隱藏（即使在異常情況下）
- 添加狀態檢查

#### 改進 `startPlayback()` 函數
- 整個函數用 try-catch 包裝
- 添加啟動日誌
- 改進的錯誤恢復

### 3. 新增日誌系統

現在可以在瀏覽器控制台（F12）看到詳細的日誌，包括：
- 錄製開始/停止
- MediaRecorder 狀態變化
- 導出進度
- 任何錯誤信息

## 測試步驟

### 基本測試
1. 打開頁面 - 應該正常加載，沒有任何 overlay
2. 點擊「預覽播放」- 應該可以播放
3. 點擊「停止預覽」- 應該停止播放
4. 打開瀏覽器開發者工具（F12）並查看 Console 標籤

### 錄製測試（推薦先上傳音樂）
1. 上傳一個音樂文件（MP3 或其他格式）
2. 點擊「錄製影片」按鈕
3. 觀察：
   - 應該顯示「影片導出中...」overlay（黑色遮罩）
   - Console 應該有日誌輸出
   - 15 秒後（或您設置的時長），應該自動開始下載視頻
   - Overlay 應該自動隱藏
4. 檢查 Console 是否有任何錯誤

### 故障排查

**如果 overlay 卡住：**
- 打開 Console（F12），查看是否有錯誤信息
- 檢查 `recordedChunks` 是否為空
- 刷新頁面

**如果錄製沒有下載：**
- 檢查瀏覽器是否阻止了下載
- 查看 Console 是否有 "導出失敗" 信息
- 確保上傳了有效的音樂文件

**如果有超時錯誤：**
- 這是正常的，overlay 應該在 5 秒後自動隱藏
- 檢查您的音樂時長設置（`總時長` 字段）

## 關鍵改進總結

| 改進項 | 詳情 |
|--------|------|
| 錯誤處理 | 添加 try-catch 和狀態檢查 |
| 超時保護 | 5 秒超時機制防止無限等待 |
| 日誌系統 | 詳細的 console 日誌用於調試 |
| 狀態驗證 | 檢查 recordedChunks 和 canvas 存在性 |
| 清理機制 | 確保 Blob URL 和資源被正確清理 |

## 瀏覽器相容性

修復使用的 API：
- `MediaRecorder` API（Chrome 49+, Firefox 25+, Safari 14.1+）
- `Canvas.captureStream()`（Chrome 51+, Firefox 43+, Safari 15+）
- `MediaStream` API

## 後續建議

1. **監控**: 繼續監控 Console 日誌，看是否有其他潛在問題
2. **性能**: 如果錄製視頻超過 1 分鐘，可能需要優化性能
3. **降級方案**: 考慮為不支持 MediaRecorder 的瀏覽器添加降級方案

---

**修復日期**: 2026 年 4 月 24 日
**修復工程師**: GitHub Copilot
