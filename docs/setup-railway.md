# Railway への Worker デプロイ設定

## 概要

Worker は Express + Playwright で動作する独立プロセスで、RPA フローを実行します。
このドキュメントでは Railway へのデプロイ方法を説明します。

## 前提条件

- Railway アカウント（https://railway.app）
- GitHub リポジトリへのアクセス（rpa-flow）
- Vercel での Main App のデプロイが完了していること

## Railway でのデプロイ手順

### 1. Railway アカウント作成・ログイン

1. https://railway.app にアクセス
2. GitHub アカウントでログイン
3. Dashboard にアクセス

### 2. 新規プロジェクト作成

1. Dashboard から「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. リポジトリ一覧から `rpa-flow` を選択
4. 「Install」をクリック（初回のみ）

### 3. Worker Service の設定

1. 「Add Service」をクリック
2. 「GitHub Repo」を選択
3. 以下を設定：
   - **Repository**: rpa-flow
   - **Branch**: main（本番環境）
   - **Root Directory**: `worker`
   - **Dockerfile Path**: `worker/Dockerfile`

### 4. ビルド・デプロイの確認

1. Railway が自動的に Dockerfile をビルド
2. ビルドログで進捗を確認
3. デプロイ完了時にサービス URL が発行される

典型的な URL 例：
```
https://rpa-flow-worker.up.railway.app
```

## 環境変数の設定

### Railway Dashboard での設定

1. Worker Service を選択
2. 「Variables」タブをクリック
3. 以下の環境変数を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NODE_ENV` | `production` | Node.js 環境 |
| `PORT` | `3001` | Worker が listening するポート |
| `WORKER_SECRET` | （Vercel と同じ値） | Vercel からのリクエスト認証用シークレット |

### 値の取得方法

#### WORKER_SECRET の取得

1. Vercel Dashboard にアクセス
2. rpa-flow プロジェクトの Settings → Environment Variables
3. `WORKER_SECRET` の値をコピー
4. Railway で同じ値を設定

## Worker が必要とする環境変数

Worker は以下の環境変数を使用します：

| 環境変数 | デフォルト | 用途 | 必須 |
|----------|-----------|------|------|
| `PORT` | `3001` | Express が listen するポート | ❌ |
| `NODE_ENV` | - | Node.js 環境（production/development） | ❌ |
| `WORKER_SECRET` | - | Vercel からのリクエスト認証用トークン | ⚠️ |

**注**: `WORKER_SECRET` が設定されていない場合、Worker はすべてのリクエストを受け付けます（開発環境用）

## デプロイ確認

### ヘルスチェック

デプロイ完了後、ヘルスチェックエンドポイントで動作確認：

```bash
curl https://{RAILWAY_URL}/health
```

期待される応答：
```json
{
  "status": "ok",
  "timestamp": "2026-02-28T23:00:00.000Z",
  "pool": {
    "active": 0,
    "available": 5,
    "total": 5
  }
}
```

### ログの確認

Railway Dashboard で Logs タブからコンテナログを確認：

```
RPA Flow Worker running on port 3001
```

## Vercel との連携

### Worker URL の Vercel への設定

1. Railway のサービス URL を取得（例: `https://rpa-flow-worker.up.railway.app`）
2. Vercel Dashboard → rpa-flow → Settings → Environment Variables
3. 新しい変数を追加：
   - **Name**: `WORKER_URL`
   - **Value**: `https://rpa-flow-worker.up.railway.app`
4. デプロイを再実行

### Vercel から Worker への通信

Vercel の Main App は以下のように Worker を呼び出します：

```typescript
// API ハンドラ内
const response = await fetch(`${process.env.WORKER_URL}/execute`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.WORKER_SECRET}`,
  },
  body: JSON.stringify({
    executionId,
    steps,
    callbackUrl: `${baseUrl}/api/executions/${executionId}/callback`,
  }),
});
```

## トラブルシューティング

### ビルドエラー: "npm ci failed"

**原因**: package-lock.json が古い可能性

**解決方法**:
1. ローカルで `npm install` を実行
2. `package-lock.json` を更新
3. GitHub にプッシュ
4. Railway で再デプロイ

### ヘルスチェック失敗

**原因**: Worker が起動していない、またはポートが異なる

**確認方法**:
1. Logs タブで `RPA Flow Worker running on port` を確認
2. PORT 環境変数が 3001 に設定されているか確認
3. Dockerfile の EXPOSE が 3001 になっているか確認

### Worker が Vercel からのリクエストを受け付けない（401 Unauthorized）

**原因**: WORKER_SECRET が一致していない

**確認方法**:
1. Vercel の WORKER_SECRET をコピー
2. Railway の WORKER_SECRET を同じ値に設定
3. Railway を再デプロイ

## 本番環境での注意点

### セキュリティ

- `WORKER_SECRET` は絶対に public にしない
- Vercel と Railway 両方で同じ値を使用すること
- 定期的に WORKER_SECRET をローテーションすること（要 Vercel・Railway 再デプロイ）

### スケーリング

Worker が多数の実行を処理する場合：

1. Railway → Resources タブで CPU・メモリを調整
2. Worker の Browser Pool サイズを調整（`src/browser-pool.ts`）
3. 複数インスタンスを起動（Railway Pro プラン）

### モニタリング

1. Railway Monitoring タブで CPU・メモリ・レスポンスタイムを監視
2. ヘルスチェックエンドポイント（`/health`）で Worker の状態を定期確認
3. エラーログを確認し、異常を早期発見

## 参考リンク

- Railway ドキュメント: https://docs.railway.app
- Railway GitHub インテグレーション: https://docs.railway.app/guides/github-integration
- Worker ソースコード: `/worker/src/`
- Vercel セットアップガイド: `./setup-vercel.md`
