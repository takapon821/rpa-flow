# ビジュアルレコーダー フロントエンドUI設計書

> **バージョン**: 1.0.0
> **作成日**: 2026-03-01
> **設計フェーズ**: Phase 4 - ビジュアルレコーダー基盤設計

---

## 目次

1. [概要・設計方針](#概要設計方針)
2. [全体レイアウトワイヤーフレーム](#全体レイアウトワイヤーフレーム)
3. [プレビューパネル詳細ワイヤーフレーム](#プレビューパネル詳細ワイヤーフレーム)
4. [アクション選択モーダルワイヤーフレーム](#アクション選択モーダルワイヤーフレーム)
5. [UXフロー（ユーザーインタラクション）](#uxフロー)
6. [コンポーネント設計](#コンポーネント設計)
7. [既存UIとの統合方針](#既存uiとの統合方針)
8. [レスポンシブ対応方針](#レスポンシブ対応方針)
9. [UI工数見積もり](#ui工数見積もり)
10. [実装優先順位](#実装優先順位)

---

## 概要・設計方針

### 背景

現在のロボット編集画面は、**テキストベース設定** を主体としており、対象Webページの実際の外観が見えないため、セレクター（CSS, XPath等）を手入力する必要があります。これにより以下の課題が生じています：

- セレクターの正確性が低い（要素が特定できないリスク）
- ユーザーが複数のウィンドウ・タブを切り替える必要がある
- 初心者ユーザーにとって敷居が高い

### 目的

**ビジュアルレコーダー** を導入し、以下を実現します：

1. **Webページプレビュー**: 編集画面の右半分に対象ページを表示
2. **ビジュアル選択**: ページ上の要素をクリック → 自動セレクター生成
3. **リアルタイム追加**: クリックしたその場でアクションノードが FlowEditor に追加
4. **セレクター検証**: 自動生成セレクターを手動編集・検証可能

### 設計原則

- **デスクトップファースト**: 左右分割レイアウルを優先（大画面推奨）
- **段階的機能追加**: MVP → 拡張機能の段階的実装
- **既存UIへの影響最小化**: FlowEditor、ActionPalette の変更をできるだけ避ける
- **Webプレビュー**: `iframe` または Worker-based スクリーンショットで実装（CORS対応考慮）
- **ステートレス設計**: プレビューパネルの状態は一時的（保存されない）

---

## 全体レイアウトワイヤーフレーム

### 現在のレイアウト（ビジュアルレコーダー なし）

```
┌─────────────────────────────────────────────────────────┐
│ ヘッダー（ロボット名・保存・Execute ボタン）              │
├─────────────────────────────────────────────────────────┤
│                                      │                   │
│  ActionPalette │    FlowEditor      │ SchedulePanel    │
│  （w-56）      │   （flex-1）       │  （w-80）        │
│                │                    │                   │
│  - ブラウザ操作 │  [Node1]          │ 📅 スケジュール  │
│  - 制御フロー   │    │             │ ⏰ 通知設定      │
│  - ファイル操作 │  [Node2]          │ 🔗 Webhook       │
│  - 認証        │    │             │                   │
│                │  [Node3]          │                   │
│                │                    │                   │
└────────────────┴────────────────────┴───────────────────┘
```

**構成:**
- 左: ActionPalette（w-56、ドラッグ可能なアクション一覧）
- 中央: FlowEditor（flex-1、ReactFlow キャンバス）
- 右: SchedulePanel（w-80、スケジュール・通知・Webhook 設定）

---

### 新レイアウト（ビジュアルレコーダー 有効化時）

```
┌────────────────────────────────────────────────────────────────┐
│ ヘッダー（ロボット名・保存・Execute・[ビジュアル編集 ON/OFF]）  │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│   FlowEditor                   │   VisualRecorderPanel         │
│   （左 50%）                    │   （右 50%）                   │
│                                │                                │
│  ActionPalette │ ReactFlow    │  ┌──URL入力────────────────┐  │
│  （w-56）      │ キャンバス   │  │ https://example.com [GO]│  │
│                │             │  ├────────────────────────────┤  │
│  - ブラウザ操作 │ [Node1]     │  │ [◄ | ▶ | ↻]  フルスクリーン  │
│  - 制御フロー   │   │        │  ├────────────────────────────┤  │
│  - ファイル操作 │ [Node2]     │  │                            │  │
│  - 認証        │   │        │  │    Webページプレビュー      │  │
│                │ [Node3]     │  │    (スクリーンショット      │  │
│                │             │  │     またはiframe)          │  │
│  [+ 追加]      │             │  │                            │  │
│                │             │  │  (ホバー: 要素青枠)         │  │
│                │             │  │  (クリック: 要素赤枠)       │  │
│                │             │  │                            │  │
│                │             │  └────────────────────────────┘  │
│                │             │  [クリック] [入力] [抽出] [待機]  │
│                │             │  [キャンセル] [確認]              │
└────────────────┴─────────────┴────────────────────────────────┘
```

**変更点:**
1. ヘッダーに **[ビジュアル編集]** トグルボタンを追加
2. メインエリアを **左右50%分割**
   - **左**: FlowEditor（ActionPalette + ReactFlow キャンバス + StepConfigPanel）
   - **右**: VisualRecorderPanel（新規）
3. SchedulePanel は非表示 or 折りたたみ
4. ビジュアル編集 OFF 時は従来のレイアウトに戻す

---

## プレビューパネル詳細ワイヤーフレーム

### VisualRecorderPanel の主要セクション

```
┌─ VisualRecorderPanel ────────────────────────┐
│                                              │
│ ┌─ URL入力バー ──────────────────────────┐  │
│ │ [◄] [▶] [↻]  https://example.com  [GO] [⛶] │
│ │              (フルスクリーン)          │  │
│ └──────────────────────────────────────────┘  │
│                                              │
│ ┌─ プレビュー表示エリア ──────────────────┐  │
│ │                                        │  │
│ │   ⟳ Loading... (ローディング時)       │  │
│ │                                        │  │
│ │   [Webページのスクリーンショット]      │  │
│ │   または                               │  │
│ │   <iframe> (CORS対応ページの場合)     │  │
│ │                                        │  │
│ │   ホバー時: 要素を青い枠で囲む         │  │
│ │   クリック時: 要素を赤い枠で囲む       │  │
│ │                                        │  │
│ │   [エラー表示エリア]                   │  │
│ │   ❌ 接続失敗: URL が無効です          │  │
│ │   ❌ タイムアウト: ページが応答しません │  │
│ │                                        │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ ┌─ アクション選択ボタン群 ──────────────┐  │
│ │ [🖱️ クリック]  [⌨️ 入力]  [📄 抽出]  │  │
│ │ [⏳ 待機]      [✓ 確認]  [✕ キャンセル] │  │
│ └──────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

### URL 入力バー詳細

```
┌────────────────────────────────────────────────────┐
│  ← │ → │ ↻ │  https://example.com/page?id=123  [GO] │ ⛶ │
│     ↑   ↑   ↑   ↑                             ↑   ↑  │
│     │   │   │   └─ URL 入力フィールド        │   └─ フルスクリーン│
│     │   │   └─────── 更新ボタン              │                │
│     │   └────────── 次へボタン               └─ 実行ボタン      │
│     └─────────────── 前へボタン                                 │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**機能詳細:**
- **[←]**: 戻る（ブラウザ履歴）
- **[→]**: 進む（ブラウザ履歴）
- **[↻]**: 再読み込み
- **URL 入力**: ページ URL（初期値は最後に入力した URL、または `https://` ）
- **[GO]**: URL をナビゲート
- **[⛶]**: フルスクリーンモード

### プレビュー表示エリア詳細

```
┌─ ホバー時（要素未選択） ─────────────────┐
│                                         │
│  <h1>ページタイトル</h1>                │
│  ┌──────────────────────────────────┐  │
│  │ ┌────────────────────────────────┤  │ ← 青い枠
│  │ │ [この要素をクリックしてください]│  │
│  │ │                                │  │
│  │ └────────────────────────────────┘  │
│  └──────────────────────────────────┘  │
│                                         │
│  <button>送信</button>                  │
│  ┌──────────────────────────────────┐  │
│  │       ┌──────────────────┐       │  │ ← 青い枠
│  │       │    送信          │       │  │
│  │       └──────────────────┘       │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─ クリック後（要素選択） ──────────────────┐
│                                          │
│  <button>送信</button>                   │
│  ┌──────────────────────────────────┐   │
│  │       ┌──────────────────┐       │   │ ← 赤い枠
│  │       │    送信          │       │   │
│  │       └──────────────────┘       │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  メッセージ:                              │
│  "✓ 要素が選択されました。               │
│   セレクター: button.submit-btn          │
│   テキスト: '送信'                       │
│   次のアクションを選んでください"        │
│                                          │
└──────────────────────────────────────────┘
```

---

## アクション選択モーダルワイヤーフレーム

クリックした要素に対してアクションを選択するモーダル/サイドパネル：

### オプション A: モーダルダイアログ形式

```
┌─────────────────────────────────────────────┐
│  要素を検出しました                    [✕] │
├─────────────────────────────────────────────┤
│                                             │
│ セレクター情報:                             │
│  CSS Selector: button.submit-btn            │
│  XPath: //button[@class='submit-btn']       │
│  テキスト: "送信"                           │
│  タグ: <button>                             │
│  クラス: submit-btn, large                  │
│                                             │
├─────────────────────────────────────────────┤
│ アクションを選択:                           │
│                                             │
│ ○ [🖱️] クリック (click)                    │
│   「その場で要素をクリック」               │
│                                             │
│ ○ [⌨️] テキスト入力 (type)                 │
│   「テキストフィールドに入力」             │
│   入力値: [________________]                │
│                                             │
│ ○ [📄] テキスト取得 (extract)              │
│   「要素のテキストを取得して変数に保存」   │
│   変数名: [________________]                │
│                                             │
│ ○ [⏳] 待機 (wait)                         │
│   「要素が現れるまで待機」                 │
│   タイムアウト: [____] ms                  │
│                                             │
├─────────────────────────────────────────────┤
│ 追加オプション:                             │
│                                             │
│ ☐ セレクターを確認・編集                   │
│   セレクター種: [CSS ▼]                    │
│   値: [________________________________]    │
│                                             │
│ ☐ 説明を追加                               │
│   [________________________________]        │
│                                             │
├─────────────────────────────────────────────┤
│ [フローに追加] [別の要素を選択] [キャンセル]│
└─────────────────────────────────────────────┘
```

### オプション B: スライドインサイドパネル形式

```
                       ┌─ スライドイン ─────┐
                       │ 要素: <button>      │ ← 右から滑り出す
                       │                     │
                       │ セレクター:         │
                       │ .submit-btn         │
                       │                     │
                       │ テキスト: 送信      │
                       │                     │
                       │ [アクション選択 ▼]  │
                       │  - クリック         │
                       │  - 入力             │
                       │  - 抽出             │
                       │  - 待機             │
                       │                     │
                       │ [フローに追加]      │
                       │ [キャンセル]        │
                       │                     │
                       └─────────────────────┘
```

**推奨**: **オプション A (モーダル)** を採用
- 理由: フォーカスが集中し、複数の入力フィールドに対応可能

---

## UXフロー

### シナリオ A: ページを開いてクリックアクションを追加

```
1. ロボット編集画面を開く
   └─ 現在: 従来のレイアウト（左: ActionPalette, 中: FlowEditor, 右: SchedulePanel）

2. ヘッダーの [ビジュアル編集] トグルをクリック
   └─ 画面が左右分割に変更
   └─ 右: VisualRecorderPanel が展開（アニメーション）

3. VisualRecorderPanel の URL 入力フィールドにフォーカス
   └─ デフォルト URL: 最後に訪問したページ or "https://"

4. URL を入力（例: https://example.com）して [GO] をクリック
   └─ ローディング表示: "⟳ ページを読み込み中..."
   └─ プレビューに対象ページが表示

5. ページ上の要素に cursor をホバー
   └─ 要素が青い枠で囲まれる
   └─ ステータス: "クリックする要素を選択してください"

6. ターゲット要素（例: [送信] ボタン）をクリック
   └─ 要素が赤い枠に変更
   └─ モーダル表示: 要素の詳細（セレクター、テキスト等）

7. モーダルで「クリック」アクションを選択
   └─ オプション設定（必要に応じて）

8. [フローに追加] をクリック
   └─ 左の FlowEditor に新しいノード「click button.submit-btn」が追加
   └─ モーダルが閉じる
   └─ プレビューの枠が解除

9. さらにアクションを追加する場合
   └─ 別の要素をクリック → 手順 6 に戻る
   └─ または [キャンセル] でビジュアルレコーダーを終了

10. 完了後、[ビジュアル編集] トグルをクリック
    └─ 従来のレイアウトに戻る
```

### シナリオ B: テキスト入力アクションを追加

```
1. シナリオ A の手順 1-6 と同様

2. テキスト入力フィールド（例: <input type="text" name="email">）をクリック
   └─ モーダル表示

3. [⌨️] 「テキスト入力」を選択
   └─ 入力値フィールドが表示: [_________________]

4. 入力値を入力（例: "user@example.com"）
   └─ または変数参照: {{variable_name}}

5. [フローに追加]
   └─ ノード: "type {{email_field}} with {{variable_name}}"
```

### シナリオ C: テキスト抽出アクションを追加

```
1. シナリオ A の手順 1-6 と同様

2. テキストを抽出したい要素（例: <span class="price">¥1,980</span>）をクリック
   └─ モーダル表示

3. [📄] 「テキスト取得」を選択
   └─ 変数名フィールドが表示: [_________________]

4. 変数名を入力（例: "product_price"）

5. [フローに追加]
   └─ ノード: "extract text from .price → product_price"
```

### シナリオ D: 既存ステップを選択してプレビューで要素を変更

```
1. ビジュアルレコーダーが有効な状態

2. FlowEditor（左）の既存ノード「click button.submit-btn」をクリック
   └─ StepConfigPanel が開く

3. StepConfigPanel の中に [プレビューで要素を選択] ボタンが表示
   └─ クリック

4. VisualRecorderPanel でホバーが開始
   └─ 現在のセレクター「button.submit-btn」に該当する要素が強調表示

5. 異なる要素をクリック
   └─ セレクターが更新される
   └─ ノードのデータが更新される

6. [確認] で更新を確定
```

---

## コンポーネント設計

### コンポーネント一覧と責務

| # | コンポーネント名 | 親コンポーネント | 責務 | Props | State | API 呼び出し |
|---|---|---|---|---|---|---|
| 1 | `VisualRecorderPanel` | `EditRobotPage` または `FlowEditor` | ビジュアルレコーダー全体の統括・状態管理 | `robotId`, `onNodeAdd`, `onClose` | `isRecording`, `currentUrl`, `selectedElement`, `selectedAction` | `/api/preview` (screenshot) |
| 2 | `PagePreview` | `VisualRecorderPanel` | ページプレビュー（スクリーンショット/iframe）表示・要素ホバー検出 | `url`, `onElementHover`, `onElementClick`, `selectedElementSelector` | `isLoading`, `error`, `screenshot` | - |
| 3 | `ElementHighlight` | `PagePreview` | 要素の青枠/赤枠ハイライト表示（overlay） | `element`, `type` ('hover' \| 'selected') | - | - |
| 4 | `UrlInputBar` | `VisualRecorderPanel` | URL 入力・ナビゲーション | `value`, `onNavigate`, `onUrlChange` | `historyIndex`, `history` | - |
| 5 | `ActionSelector` | `VisualRecorderPanel` | アクション選択モーダル | `element`, `onActionSelect`, `onClose` | - | - |
| 6 | `SelectorEditor` | `ActionSelector` | セレクター確認・編集 | `currentSelector`, `selectorType`, `onSelectorChange` | `editedSelector` | `/api/validate-selector` |
| 7 | `ActionOptionFields` | `ActionSelector` | アクション別の追加オプション | `actionType`, `values`, `onChange` | - | - |

### 各コンポーネントの詳細設計

#### 1. VisualRecorderPanel

**責務**: ビジュアルレコーダー全体の状態管理・調整

```typescript
interface VisualRecorderPanelProps {
  robotId: string;
  onNodeAdd: (nodeData: {
    actionType: string;
    config: Record<string, unknown>;
    selector: string;
    selectorType: 'css' | 'xpath' | 'text';
  }) => void;
  onClose: () => void;
}

interface VisualRecorderState {
  isRecording: boolean;
  currentUrl: string;
  urlHistory: string[];
  historyIndex: number;
  selectedElementInfo: {
    selector: string;
    selectorType: 'css' | 'xpath' | 'text';
    text: string;
    tag: string;
    classes: string[];
  } | null;
  selectedAction: 'click' | 'type' | 'extract' | 'wait' | null;
  actionConfig: Record<string, unknown>;
  isLoading: boolean;
  error: string | null;
}
```

---

#### 2. PagePreview

**責務**: ページプレビュー表示・要素検出

```typescript
interface PagePreviewProps {
  url: string;
  onElementHover: (element: {
    selector: string;
    text: string;
    tag: string;
  }) => void;
  onElementClick: (element: {
    selector: string;
    selectorType: 'css' | 'xpath' | 'text';
    text: string;
    tag: string;
    classes: string[];
  }) => void;
  selectedElementSelector: string | null;
}

// 実装案:
// - Worker-based スクリーンショット取得
// - または iframe（CORS チェック後）
// - または Playwright-based サーバーサイドレンダリング
```

---

#### 3. ActionSelector

**責務**: クリック後のアクション選択・設定

```typescript
interface ActionSelectorProps {
  element: {
    selector: string;
    selectorType: 'css' | 'xpath' | 'text';
    text: string;
    tag: string;
    classes: string[];
  };
  onActionSelect: (action: {
    type: 'click' | 'type' | 'extract' | 'wait';
    config: Record<string, unknown>;
    description?: string;
  }) => void;
  onClose: () => void;
}

// アクションオプション例:
// - click: {}
// - type: { text: string }
// - extract: { variableName: string }
// - wait: { timeoutMs: number }
```

---

#### 4. SelectorEditor

**責務**: セレクター確認・手動編集

```typescript
interface SelectorEditorProps {
  currentSelector: string;
  selectorType: 'css' | 'xpath' | 'text';
  onSelectorChange: (
    newSelector: string,
    newType: 'css' | 'xpath' | 'text'
  ) => void;
  onValidate: () => Promise<boolean>;
}
```

---

### コンポーネント階層図

```
EditRobotPage
├─ Header
│  └─ [ビジュアル編集] トグル
├─ FlowEditorSection（flex: 50% when recording）
│  ├─ ActionPalette
│  └─ FlowEditor (modified)
│     └─ StepConfigPanel (modified)
│        └─ [プレビューで選択] ボタン
└─ VisualRecorderPanel（flex: 50% when recording）
   ├─ UrlInputBar
   │  └─ History/Navigation
   ├─ PagePreview
   │  ├─ screenshot/iframe
   │  └─ ElementHighlight (overlay)
   ├─ ActionSelectorModal（条件付き表示）
   │  ├─ ActionOptionFields
   │  └─ SelectorEditor
   └─ ActionButtonGroup
```

---

## 既存UIとの統合方針

### EditRobotPage の変更

```typescript
// 現在の構造:
<div className="flex h-[calc(100vh-3.5rem)] flex-col">
  <Header />
  <div className="flex flex-1 gap-4 overflow-hidden">
    <FlowEditor />  {/* flex-1 */}
    <SchedulePanel /> {/* w-80 */}
  </div>
</div>

// 変更後:
<div className="flex h-[calc(100vh-3.5rem)] flex-col">
  <Header
    robotId={robot.id}
    isVisualRecording={isVisualRecording}
    onToggleVisualRecorder={() => setIsVisualRecording(!isVisualRecording)}
  />
  <div className="flex flex-1 gap-4 overflow-hidden">
    {/* Conditional Rendering */}
    {isVisualRecording ? (
      <>
        <div className="flex-1 overflow-hidden">
          <FlowEditor {...} />
        </div>
        <div className="flex-1 overflow-hidden">
          <VisualRecorderPanel
            robotId={robot.id}
            onNodeAdd={handleAddNode}
            onClose={() => setIsVisualRecording(false)}
          />
        </div>
      </>
    ) : (
      <>
        <FlowEditor {...} /> {/* flex-1 */}
        <SchedulePanel /> {/* w-80 */}
      </>
    )}
  </div>
</div>
```

### FlowEditor の変更（最小限）

**変更内容:**
- **StepConfigPanel** に `[プレビューで選択]` ボタンを追加
- ビジュアルレコーダーが有効な場合、クリック時に要素選択モードに入る

**実装:**

```typescript
// StepConfigPanel に追加:
{isVisualRecordingActive && (
  <button
    onClick={() => onStartElementSelection(node.id)}
    className="..."
  >
    🖱️ プレビューで選択
  </button>
)}
```

### SchedulePanel の非表示

**方法:**
- CSS: `hidden` クラスで非表示（ビジュアルレコーダー有効時）
- 状態管理: `isVisualRecording` フラグで条件付きレンダリング

---

## レスポンシブ対応方針

| デバイス | ブレークポイント | ビジュアルレコーダー対応 | レイアウト |
|---|---|---|---|
| デスクトップ | 1400px 以上 | ✅ 完全対応 | 左右 50% 分割 |
| ラップトップ | 1024px - 1399px | ⚠️ 制限対応 | 上下分割 / タブ切り替え |
| タブレット (横) | 768px - 1023px | ⚠️ 制限対応 | タブ切り替え（FlowEditor / Preview） |
| タブレット (縦) | 480px - 767px | ❌ 非対応 | 告知メッセージ表示 |
| モバイル | 480px 未満 | ❌ 非対応 | 告知メッセージ表示 |

### 実装手法

#### デスクトップ (1400px+): 左右分割
```
┌─────────────────┬─────────────────┐
│  FlowEditor     │  VisualRecorder │
│  (flex: 50%)    │  (flex: 50%)    │
└─────────────────┴─────────────────┘
```

#### ラップトップ (1024px-1399px): 上下分割 / タブ切り替え

```
オプション A: 上下分割
┌───────────────────────────────────┐
│     FlowEditor                    │
│     (flex: 1)                     │
├───────────────────────────────────┤
│     VisualRecorder                │
│     (h-[40%])                     │
└───────────────────────────────────┘

オプション B: タブ切り替え
┌───────────────────────────────────┐
│ [FlowEditor] [Preview]            │ ← タブ
│                                   │
│     FlowEditor                    │
│     (タブ選択時のみ表示)            │
└───────────────────────────────────┘
```

推奨: **オプション B (タブ切り替え)**
- 理由: 各ツールに十分なスペースを確保でき、UX が良い

#### タブレット / モバイル: 非対応告知

```
┌──────────────────────────────────────┐
│  ⚠️  ビジュアルレコーダー             │
├──────────────────────────────────────┤
│  このデバイスではビジュアルレコーダー │
│  は対応していません。                 │
│                                      │
│  デスクトップまたはラップトップで     │
│  アクセスしてください。               │
│                                      │
│  [閉じる]                            │
└──────────────────────────────────────┘
```

---

## UI工数見積もり

### コンポーネント別工数表

| # | コンポーネント | 難易度 | 工数(足軽×日) | 依存関係 | 備考 |
|---|---|---|---|---|---|
| 1 | VisualRecorderPanel | 中 | 足軽1名 × 2日 | - | 状態管理・アクション調整 |
| 2 | PagePreview | 高 | 足軽1名 × 3日 | subtask_063 | スクリーンショット/iframe 実装 |
| 3 | ElementHighlight | 低 | 足軽1名 × 0.5日 | PagePreview | overlay CSS |
| 4 | UrlInputBar | 低 | 足軽1名 × 0.5日 | - | 入力フィールド・ボタン |
| 5 | ActionSelector | 中 | 足軽1名 × 1.5日 | - | モーダルUI・フォーム |
| 6 | SelectorEditor | 中 | 足軽1名 × 1日 | - | セレクター検証ロジック |
| 7 | ActionOptionFields | 低 | 足軽1名 × 1日 | - | アクション別フォーム |
| 8 | EditRobotPage/Header 変更 | 低 | 足軽1名 × 0.5日 | - | トグルボタン追加 |
| 9 | FlowEditor 統合 | 中 | 足軽1名 × 1日 | - | StepConfigPanel ボタン追加 |
| 10 | E2E テスト・デバッグ | 中 | 足軽1名 × 1.5日 | 1-9 全て | シナリオテスト |

**合計工数**: 足軽1名 × 11.5日 ≈ **12日（1.5 週間）**

### 並行実装の可能性

- **フェーズ 1 (4日)**: UrlInputBar + PagePreview + ElementHighlight
- **フェーズ 2 (4日)**: ActionSelector + SelectorEditor + ActionOptionFields
- **フェーズ 3 (3日)**: VisualRecorderPanel 統合 + EditRobotPage 変更 + テスト

→ **最短実装**: 足軽2名並行で 6日

---

## 実装優先順位

### MVP (Minimum Viable Product)

**目標**: ビジュアルレコーダーの基本機能を最速で実装

#### 優先度 1 (必須)
- [ ] VisualRecorderPanel（状態管理のみ）
- [ ] PagePreview（スクリーンショット表示）
- [ ] ElementHighlight（ホバー検出・青枠）
- [ ] UrlInputBar（URL 入力・[GO]）
- [ ] ActionSelector（click アクションのみ対応）
- [ ] EditRobotPage トグル
- [ ] FlowEditor へのノード追加

**工数**: 足軽1名 × 6日

#### 優先度 2 (拡張機能)
- [ ] ActionSelector（type, extract, wait 対応）
- [ ] SelectorEditor（セレクター手動編集）
- [ ] ブラウザ履歴（[←] [→]）
- [ ] セレクター種切り替え (CSS / XPath)
- [ ] エラーハンドリング・再試行

**工数**: 足軽1名 × 4日

#### 優先度 3 (改善)
- [ ] ページキャッシング
- [ ] 複数ページでのセレクター学習
- [ ] iframe 対応（CORS 制御下）
- [ ] モバイル非対応告知メッセージ改善
- [ ] アクセシビリティ（キーボード操作）

**工数**: 足軽1名 × 2日

### スキル化候補

本ビジュアルレコーダー UI 設計を基に、以下スキル化を推奨：

1. **visual-recorder-component-generator**
   - 概要: ActionSelector, SelectorEditor 等のテンプレート生成
   - 難易度: 低
   - 対象: 他の RPA ツールでの UI 再利用

2. **page-preview-integration**
   - 概要: PagePreview の実装パターン（スクリーンショット/iframe 選択）
   - 難易度: 高
   - 対象: ライブプレビューが必要な UI

---

## 実装時の注意点

### セキュリティ

1. **CORS 対応**:
   - iframe は同一オリジンのみ対応（CORS ヘッダーチェック）
   - クロスオリジンページは Worker-based スクリーンショット利用

2. **XSS 対策**:
   - ユーザー入力（URL, セレクター）は必ず sanitize
   - ElementHighlight の overlay は DOM 操作ではなく Canvas 描画推奨

3. **認証**:
   - 認証が必要なページをプレビューする場合、Cookie/Session を含める
   - トークン更新時の対応（長時間セッション対応）

### パフォーマンス

1. **スクリーンショット**:
   - 大きなページは圧縮・キャッシング
   - 頻繁な再読み込みを避ける（debounce/throttle）

2. **ElementHighlight**:
   - 大量の要素ホバーで Canvas 再描画が重い場合、requestAnimationFrame 活用

3. **VisualRecorderPanel State**:
   - Redux or Zustand で中央管理（複数コンポーネント間の状態同期）

### ブラウザ互換性

- **必須対応**: Chrome, Safari, Firefox（最新版）
- **Canvas API**: 全ブラウザ対応
- **Intersection Observer**: polyfill 検討（古い Safari）

---

## まとめ

本設計書は、rpa-flow にビジュアルレコーダーを導入するための包括的な UI 設計を提供します。

**主な特徴:**
1. **ユーザーフレンドリー**: ページ上の要素をクリック → 自動セレクター生成
2. **段階的実装**: MVP（click アクション）から拡張機能へ
3. **既存 UI への影響最小化**: FlowEditor の変更は最小限
4. **レスポンシブ対応**: デスクトップ優先、ラップトップはタブ切り替え
5. **工数現実的**: 足軽1名 × 11.5日（並行で 6日）

次フェーズ（subtask_063: 技術調査・アーキテクチャ設計）で、スクリーンショット取得・セレクター生成ロジックの詳細を確定後、本実装に進めます。
