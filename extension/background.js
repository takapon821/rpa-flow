/**
 * Background Service Worker
 *
 * 責務:
 * - Content Script からの ACTION_RECORDED メッセージを受信
 * - 記録されたアクションを蓄積
 * - Popup から録画状態の制御を受ける
 * - Content Script を動的に inject
 */

let recordedActions = [];
let isRecording = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Content Script からのアクション記録
  if (msg.type === 'ACTION_RECORDED' && isRecording) {
    recordedActions.push(msg.action);
    sendResponse({ ok: true });
    return false;
  }

  // Popup からの録画開始
  if (msg.type === 'START_RECORDING') {
    isRecording = true;
    recordedActions = [];
    // アクティブタブに Content Script を inject して録画状態を通知
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Content Script を inject（既にあっても問題ない）
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }, () => {
          // inject 後に録画状態を通知
          chrome.tabs.sendMessage(tabs[0].id,
            { type: 'RECORDING_STATE', isRecording: true });
          sendResponse({ ok: true });
        });
      } else {
        sendResponse({ ok: false, error: 'No active tab' });
      }
    });
    return true; // 非同期レスポンス
  }

  // Popup からの録画停止
  if (msg.type === 'STOP_RECORDING') {
    isRecording = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id,
          { type: 'RECORDING_STATE', isRecording: false });
      }
      sendResponse({ ok: true });
    });
    return true; // 非同期レスポンス
  }

  // Popup からの操作一覧取得
  if (msg.type === 'GET_ACTIONS') {
    sendResponse({ actions: recordedActions, isRecording });
    return false;
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
    .then(data => {
      if (data.robotId) {
        sendResponse({ ok: true, robotId: data.robotId });
      } else {
        sendResponse({ ok: false, error: data.error || 'Unknown error' });
      }
    })
    .catch(err => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error: errorMsg });
    });
    return true; // 非同期レスポンス
  }

  // 操作をクリア
  if (msg.type === 'CLEAR_ACTIONS') {
    recordedActions = [];
    sendResponse({ ok: true });
    return false;
  }
});

// タブ更新時に録画中なら Content Script を再 inject
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (isRecording && changeInfo.status === 'complete') {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tabId,
        { type: 'RECORDING_STATE', isRecording: true });
    });
  }
});
