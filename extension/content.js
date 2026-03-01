/**
 * @typedef {Object} RecordedAction
 * @property {'click'|'type'|'navigate'|'select'|'scroll'} type
 * @property {string} [selector]   - click/type/select 時のCSSセレクター
 * @property {string} [value]      - type/select 時の入力値
 * @property {string} [url]        - navigate 時のURL
 * @property {number} [x]          - クリック座標X
 * @property {number} [y]          - クリック座標Y
 * @property {number} timestamp    - 記録時刻 (Date.now())
 */

/**
 * Background への送信メッセージ:
 * { type: 'ACTION_RECORDED', action: RecordedAction }
 *
 * Background からの受信メッセージ:
 * { type: 'RECORDING_STATE', isRecording: boolean }
 */

// ========== グローバル変数 ==========
let isRecording = false;

// ========== セレクター生成関数 ==========
/**
 * 要素に対してユニークなCSSセレクターを生成
 * 優先順位:
 * 1. id属性 (#id)
 * 2. data-testid / data-cy
 * 3. name属性 (form要素)
 * 4. ユニークなclass の組み合わせ
 * 5. nth-child フォールバック
 *
 * @param {Element} el - セレクターを生成する要素
 * @returns {string} CSSセレクター
 */
function generateSelector(el) {
  // 優先度1: id属性
  if (el.id) {
    return '#' + el.id;
  }

  // 優先度2: data-testid / data-cy
  if (el.dataset.testid) {
    return `[data-testid="${el.dataset.testid}"]`;
  }
  if (el.dataset.cy) {
    return `[data-cy="${el.dataset.cy}"]`;
  }

  // 優先度3: name属性（input, select等フォーム要素）
  if (el.name) {
    return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
  }

  // 優先度4: ユニークなclass の組み合わせ
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/)
      .filter(c => c && !c.match(/^(active|hover|focus|selected|disabled)$/));
    if (classes.length > 0) {
      const sel = '.' + classes.join('.');
      // セレクターがユニークか確認
      try {
        if (document.querySelectorAll(sel).length === 1) {
          return sel;
        }
      } catch (e) {
        // セレクターが無効な場合はスキップ
      }
    }
  }

  // 優先度5: nth-child フォールバック
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const idx = siblings.indexOf(el) + 1;
    const parentSel = generateSelector(parent);
    return `${parentSel} > ${el.tagName.toLowerCase()}:nth-child(${idx})`;
  }

  // 最後の手段：タグ名のみ
  return el.tagName.toLowerCase();
}

// ========== メッセージリスナー ==========
/**
 * Background Service Worker からの メッセージを受信
 * RECORDING_STATE: 録画状態の更新通知
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RECORDING_STATE') {
    isRecording = message.isRecording;
  }
});

// ========== イベントリスナー ==========

/**
 * クリックイベント の記録
 * 記録状態の時、クリック された要素の情報を送信
 */
document.addEventListener('click', (e) => {
  if (!isRecording) return;

  const selector = generateSelector(e.target);
  chrome.runtime.sendMessage({
    type: 'ACTION_RECORDED',
    action: {
      type: 'click',
      selector: selector,
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    }
  });
}, true);

/**
 * テキスト入力・選択値の変更イベント を記録
 * INPUT, TEXTAREA, SELECT要素の値が変更された時に送信
 */
document.addEventListener('change', (e) => {
  if (!isRecording) return;

  const el = e.target;
  // INPUT, TEXTAREA, SELECT要素のみ対象
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
    return;
  }

  const selector = generateSelector(el);
  const actionType = el.tagName === 'SELECT' ? 'select' : 'type';

  chrome.runtime.sendMessage({
    type: 'ACTION_RECORDED',
    action: {
      type: actionType,
      selector: selector,
      value: el.value,
      timestamp: Date.now()
    }
  });
}, true);

/**
 * ページロード完了時に navigate アクション を記録
 * URL変更をBackgroundに通知
 */
window.addEventListener('load', () => {
  if (!isRecording) return;

  chrome.runtime.sendMessage({
    type: 'ACTION_RECORDED',
    action: {
      type: 'navigate',
      url: window.location.href,
      timestamp: Date.now()
    }
  });
});
