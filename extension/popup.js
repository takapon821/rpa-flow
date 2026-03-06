/**
 * Popup JavaScript
 *
 * 責務:
 * - 録画開始/停止ボタンの処理
 * - クリア・送信ボタンの処理
 * - Background Service Worker と通信
 * - 録画中は自動更新
 */

let refreshTimer = null;

// 設定をストレージから復元
chrome.storage.local.get(['apiUrl', 'apiKey', 'robotName'], (data) => {
  if (data.apiUrl) document.getElementById('apiUrl').value = data.apiUrl;
  if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
  if (data.robotName) document.getElementById('robotName').value = data.robotName;
});

// 入力時に即保存
document.getElementById('apiUrl').addEventListener('input', (e) => {
  chrome.storage.local.set({ apiUrl: e.target.value });
});
document.getElementById('apiKey').addEventListener('input', (e) => {
  chrome.storage.local.set({ apiKey: e.target.value });
});
document.getElementById('robotName').addEventListener('input', (e) => {
  chrome.storage.local.set({ robotName: e.target.value });
});

// 現在の状態を取得して表示更新
function refreshUI() {
  chrome.runtime.sendMessage({ type: 'GET_ACTIONS' }, (res) => {
    if (chrome.runtime.lastError || !res) return;
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
        const label = a.type === 'navigate' ? `🌐 ${a.url}`
                    : a.type === 'type'     ? `⌨️ "${a.value}" → ${a.selector}`
                    : a.type === 'select'   ? `📋 "${a.value}" → ${a.selector}`
                    : a.type === 'click'    ? `🖱️ click → ${a.selector}`
                    :                         `${a.type} → ${a.selector || ''}`;
        return `<div class="action-item">${label}</div>`;
      }).join('');
      list.scrollTop = list.scrollHeight;
    }

    // 録画中なら自動更新
    if (isRecording && !refreshTimer) {
      refreshTimer = setInterval(refreshUI, 1000);
    } else if (!isRecording && refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  });
}

refreshUI();

// 録画開始
document.getElementById('startBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }, () => {
    if (chrome.runtime.lastError) return;
    refreshUI();
  });
});

// 録画停止
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => {
    if (chrome.runtime.lastError) return;
    refreshUI();
  });
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
  chrome.storage.local.set({ apiUrl, apiKey, robotName });

  msg.textContent = '送信中...';
  msg.className = '';

  chrome.runtime.sendMessage(
    { type: 'SEND_TO_RPA_FLOW', apiKey, apiUrl, robotName },
    (res) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError?.message || 'Unknown error';
        msg.textContent = `❌ エラー: ${errorMsg}`;
        msg.className = 'err';
        return;
      }
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
  chrome.runtime.sendMessage({ type: 'CLEAR_ACTIONS' }, () => {
    if (chrome.runtime.lastError) return;
    refreshUI();
  });
});
