/**
 * Background Service Worker
 * 足軽6 実装
 *
 * 責務:
 * - Content Script からの ACTION_RECORDED メッセージを受信
 * - 記録されたアクションを蓄積
 * - Popup から 録画状態の制御を受ける
 * - RECORDING_STATE メッセージを Content Script に送信
 */

// 操作記録を保持
let recordedActions = [];
let isRecording = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Content Script からのアクション記録
  if (msg.type === 'ACTION_RECORDED' && isRecording) {
    recordedActions.push(msg.action);
    return;
  }

  // Popup からの録画開始
  if (msg.type === 'START_RECORDING') {
    isRecording = true;
    recordedActions = [];
    // 全タブの Content Script に通知
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id,
          { type: 'RECORDING_STATE', isRecording: true });
      }
    });
    sendResponse({ ok: true });
    return;
  }

  // Popup からの録画停止
  if (msg.type === 'STOP_RECORDING') {
    isRecording = false;
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id,
          { type: 'RECORDING_STATE', isRecording: false });
      }
    });
    sendResponse({ ok: true });
    return;
  }

  // Popup からの操作一覧取得
  if (msg.type === 'GET_ACTIONS') {
    sendResponse({ actions: recordedActions, isRecording });
    return true;
  }

  // rpa-flow への送信
  if (msg.type === 'SEND_TO_RPA_FLOW') {
    const { apiKey, apiUrl, robotName } = msg;
    fetch(`${apiUrl}/api/robots/from-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: robotName || '録画ロボット',
        actions: recordedActions
      })
    })
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, robotId: data.robotId }))
    .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // 非同期レスポンスのために必須
  }

  // 操作をクリア
  if (msg.type === 'CLEAR_ACTIONS') {
    recordedActions = [];
    sendResponse({ ok: true });
    return;
  }
});
