/**
 * Popup JavaScript
 * 足軽6 実装
 *
 * 責務:
 * - 録画開始ボタンの処理
 * - 録画停止ボタンの処理
 * - クリア・送信ボタンの処理
 * - Background Service Worker と通信
 */

// 設定をストレージから復元
chrome.storage.local.get(['apiUrl', 'apiKey'], (data) => {
  if (data.apiUrl) document.getElementById('apiUrl').value = data.apiUrl;
  if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
});

// 現在の状態を取得して表示更新
function refreshUI() {
  chrome.runtime.sendMessage({ type: 'GET_ACTIONS' }, (res) => {
    if (!res) return;
    const { actions, isRecording } = res;

    document.getElementById('stateLabel').innerHTML = isRecording
      ? '<span id="recording-badge">● 録画中</span>'
      : `停止中（${actions.length}件）`;

    document.getElementById('startBtn').disabled = isRecording;
    document.getElementById('stopBtn').disabled  = !isRecording;
    document.getElementById('sendBtn').disabled  = isRecording || actions.length === 0;
    document.getElementById('clearBtn').disabled = isRecording || actions.length === 0;

    // アクション一覧表示
    const list = document.getElementById('actionList');
    if (actions.length === 0) {
      list.innerHTML = '<div style="color:#aaa;font-size:11px">操作がここに表示されます</div>';
    } else {
      list.innerHTML = actions.map(a => {
        const label = a.type === 'navigate' ? `navigate → ${a.url}`
                    : a.type === 'type'     ? `type "${a.value}" → ${a.selector}`
                    : a.type === 'select'   ? `select "${a.value}" → ${a.selector}`
                    :                         `${a.type} → ${a.selector}`;
        return `<div class="action-item">${label}</div>`;
      }).join('');
      list.scrollTop = list.scrollHeight;
    }
  });
}

refreshUI();

// 録画開始
document.getElementById('startBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }, () => refreshUI());
});

// 録画停止
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => refreshUI());
});

// rpa-flow に送信
document.getElementById('sendBtn').addEventListener('click', () => {
  const apiKey    = document.getElementById('apiKey').value.trim();
  const apiUrl    = document.getElementById('apiUrl').value.trim();
  const robotName = document.getElementById('robotName').value.trim();
  const msg       = document.getElementById('msg');

  if (!apiKey || !apiUrl) {
    msg.textContent = 'APIキーとURLを入力してください';
    msg.className = 'err';
    return;
  }

  // 設定を保存
  chrome.storage.local.set({ apiUrl, apiKey });

  msg.textContent = '送信中...';
  msg.className = '';

  chrome.runtime.sendMessage(
    { type: 'SEND_TO_RPA_FLOW', apiKey, apiUrl, robotName },
    (res) => {
      if (res && res.ok) {
        msg.textContent = `✅ ロボット作成完了！ ID: ${res.robotId}`;
        msg.className = 'ok';
      } else {
        msg.textContent = `❌ エラー: ${res?.error || '不明なエラー'}`;
        msg.className = 'err';
      }
    }
  );
});

// クリア
document.getElementById('clearBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_ACTIONS' }, () => refreshUI());
});
