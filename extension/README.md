# rpa-flow Recorder Chrome拡張機能

rpa-flow の Chrome拡張レコーダーは、Webサイトでのユーザーの操作を自動的に記録し、RPA フローの自動化スクリプトとして rpa-flow に送信することができます。

---

## インストール方法（開発者モード）

Chrome で拡張機能を読み込むには以下の手順に従ってください。

### Step 1: ビルド

```bash
cd extension
npm install
npm run build
```

実行すると、`dist/` ディレクトリに以下のファイルが生成されます：
- `manifest.json`
- `content.js`
- `background.js`
- `popup.html`
- `popup.js`
- `icons/` (icon16.png, icon48.png, icon128.png)

### Step 2: Chrome で拡張機能を読み込む

1. Chrome を開く
2. アドレスバーに `chrome://extensions/` と入力してアクセス
3. 右上の「デベロッパーモード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `extension/dist/` フォルダを選択
6. 「rpa-flow Recorder」が拡張機能一覧に表示されれば完了

---

## 使い方

### 1. 初回設定

初回使用時に rpa-flow のサーバー情報と APIキーを設定します。

1. Chrome ツールバーで **rpa-flow Recorder のアイコン** をクリック
2. ポップアップウィンドウが表示されます
3. 以下の情報を入力：
   - **rpa-flow URL**: `https://rpa-flow.vercel.app`（本番環境の場合）
   - **APIキー**: rpa-flow の Settings → API Keys で発行したキー
4. ポップアップの入力情報は自動的に保存されます

### 2. 操作を記録

1. ポップアップの **「● 録画開始」** ボタンをクリック
2. 状態表示が「● 録画中」に変わります
3. 任意の Webサイトで以下の操作を実行：
   - **クリック**: ボタン・リンク・入力フィールドのクリック
   - **入力**: テキストボックスへの入力
   - **ドロップダウン選択**: SELECT 要素の選択
   - **ページ遷移**: URL の移動（自動検出）
4. すべての操作が「アクション一覧」に表示されます

### 3. 記録を完了・送信

1. **「■ 録画停止」** ボタンをクリック
2. 記録されたアクションが「アクション一覧」に表示されます
3. **「🚀 rpa-flow に送信」** ボタンをクリック
4. **ロボット名**（例：「Google検索ロボット」）を入力
5. 「rpa-flow に送信」をクリック
6. 成功すると「✅ ロボット作成完了！」と表示されます
7. rpa-flow のロボット一覧に新しいロボットが追加されます

### 4. その他の操作

- **「🗑 クリア」**: 記録されたアクションをリセット
- **アクション一覧から削除**: 特定のアクションを削除（スクロール可能）

---

## アクション記録の詳細

拡張機能が自動的に記録するアクションの種類：

| アクション | 記録内容 | 例 |
|-----------|--------|-----|
| **click** | クリック対象のセレクター・座標（x, y） | ボタンクリック、リンククリック |
| **type** | 入力値・対象セレクター | テキストボックスへの入力 |
| **select** | 選択値・対象セレクター | ドロップダウンの選択 |
| **navigate** | 遷移先 URL | ページ遷移、新規ページへの移動 |
| **scroll** | スクロール位置（オプション） | ページのスクロール（将来機能） |

**セレクター生成ロジック**（優先度順）：
1. `id` 属性（最も確実）
2. `data-testid` または `data-cy` 属性
3. `name` 属性
4. ユニークな `class` 属性の組み合わせ
5. `nth-child()` によるフォールバック

---

## ビルド・パッケージングコマンド

```bash
cd extension

# 依存パッケージをインストール
npm install

# dist/ にビルド（ファイルコピー）
npm run build

# ビルド + Chrome Web Store 提出用 ZIP を生成
npm run package
```

実行後、以下が生成されます：
- `dist/` - Chrome で読み込める拡張ファイル
- `rpa-flow-recorder.zip` - Chrome Web Store 提出用（オプション）

---

## トラブルシューティング

### Q1: ポップアップが表示されない

**A**: 
1. 拡張機能が有効になっているか確認（chrome://extensions/ で確認）
2. rpa-flow Recorder のアイコンが ToolBar に表示されているか確認
3. なければ「拡張機能をピン留め」をクリック

### Q2: 「❌ エラー: ...」と表示される

**A**: 
- **rpa-flow URL が間違っている**: 本番環境は `https://rpa-flow.vercel.app`
- **APIキーが無効**: Settings → API Keys で新規発行
- **ネットワーク接続**: インターネット接続を確認

### Q3: セレクターが信頼できない

**A**: 
- `id` 属性が付いた要素をクリック（最も確実）
- `data-testid` が付いた要素を使用（テスト環境での推奨）
- Webサイトの設計により、セレクターが一時的に変わる場合は、
  rpa-flow でロボット編集時に手動調整可能

### Q4: 複数タブで同時に使用できるか

**A**: 
各タブで独立して録画可能。タブごとに「● 録画開始」をクリックしてください。
ただし、Background Service Worker は全タブで共有されるため、
複数タブの同時録画はサポートされていません。

---

## 対応ブラウザ

- **Chrome** 最新版（Manifest V3 対応）
- **Chromium ベースブラウザ**（Edge, Brave 等）

---

## セキュリティに関する注意

- ⚠️ **APIキーを安全に保管**: ポップアップで入力した APIキー は `chrome.storage.local` に保存されます（そのマシン上のみ）
- ⚠️ **公開パソコンでの使用**: 重要なロボット情報を記録させないでください
- ⚠️ **パスワード入力**: パスワード入力フィールドの操作は、安全のため記録されません

---

## 開発者向け情報

### プロジェクト構造

```
extension/
├── manifest.json       # Manifest V3 定義
├── content.js          # Content Script（ユーザー操作の検出）
├── background.js       # Background Service Worker（操作蓄積・API送信）
├── popup.html          # ポップアップ UI（HTML）
├── popup.js            # ポップアップ UI（ロジック）
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── build.js            # ビルドスクリプト
├── package.js          # パッケージングスクリプト
├── package.json        # 依存パッケージ定義
└── README.md           # このファイル
```

### メッセージプロトコル

拡張機能の内部通信は以下のメッセージプロトコルに従います：

**Content Script → Background Service Worker**:
```javascript
{ 
  type: 'ACTION_RECORDED',
  action: {
    type: 'click' | 'type' | 'select' | 'navigate' | 'scroll',
    selector: '...',
    value: '...',
    url: '...',
    x: 123,
    y: 456,
    timestamp: 1234567890
  }
}
```

**Background ↔ Popup UI**:
```javascript
{ type: 'START_RECORDING' }
{ type: 'STOP_RECORDING' }
{ type: 'GET_ACTIONS' }  // レスポンス: { actions: [...], isRecording: bool }
{ type: 'CLEAR_ACTIONS' }
{ type: 'SEND_TO_RPA_FLOW', apiKey: '...', apiUrl: '...', robotName: '...' }
```

---

## 次のステップ

1. ロボットを記録 → rpa-flow に送信
2. rpa-flow の Dashboard でロボットを確認
3. 必要に応じてロボット定義を手動編集
4. 実行スケジュール設定 → 自動実行

---

**Last Updated**: 2026年3月1日
**Version**: 1.0.0
