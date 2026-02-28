# Vercel デプロイ設定ガイド

> **最終更新**: 2026-02-28
> **対象**: rpa-flow Next.js アプリケーション

---

## 前提条件

- ✅ GitHub リポジトリへの push 完了（subtask_056参照）
- ✅ Node.js 環境に vercel CLI インストール済み
  ```bash
  npm install -g vercel
  ```
- ✅ Vercel アカウント作成済み（https://vercel.com）
- ✅ 以下の外部サービスアカウント準備済み:
  - Neon (PostgreSQL)
  - Google Cloud (OAuth)
  - Inngest
  - Upstash (Redis)
  - Resend (Email)

---

## Step 1: ローカルで Vercel CLI 認証

```bash
cd /mnt/c/Users/SPM伊藤隆史/Antigravity/rpa-flow

# Vercel にログイン
vercel login

# Vercel プロジェクトにリンク（既存プロジェクトまたは新規作成）
vercel link
```

実行後、以下が確認される：
- Vercel アカウント認証
- プロジェクトをリンク（既存 or 新規作成）
- `.vercel/project.json` および `.vercel/README.txt` 生成

---

## Step 2: 環境変数の設定

### 2.1 環境変数一覧と取得先

以下の環境変数を **Vercel Dashboard** で設定してください。
Production と Preview の両方に設定することを推奨します。

| 変数名 | 説明 | 値の取得先 | 例 |
|--------|------|-----------|-----|
| `DATABASE_URL` | PostgreSQL接続文字列 | Neon Console | `postgresql://user:pass@...` |
| `AUTH_SECRET` | NextAuth認証シークレット | `openssl rand -base64 32` で生成 | `abc123...xyz789` |
| `AUTH_GOOGLE_ID` | Google OAuth クライアントID | Google Cloud Console | `12345...xyz.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット | Google Cloud Console | `GOCSPX-abc123...` |
| `NEXTAUTH_URL` | NextAuth URL（本番環境） | Vercel プロジェクト URL | `https://rpa-flow.vercel.app` |
| `WORKER_URL` | Worker エンドポイント URL | Railway デプロイ後 | `https://rpa-flow-worker.railway.app` |
| `WORKER_SECRET` | Worker 認証シークレット | `openssl rand -hex 32` で生成 | `abc123...xyz789` |
| `INNGEST_EVENT_KEY` | Inngest イベントキー | Inngest Dashboard → 設定 | `fnAbc...` |
| `INNGEST_SIGNING_KEY` | Inngest 署名キー | Inngest Dashboard → 設定 | `signKey_abc...` |
| `UPSTASH_REDIS_REST_URL` | Redis REST API URL | Upstash Console → データベース | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST API トークン | Upstash Console | `AXy...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob ストレージトークン | Vercel Blob (後述) | `vercel_blob_rw_...` |
| `RESEND_API_KEY` | Resend メールAPI キー | Resend Dashboard | `re_abc123...` |
| `NOTIFICATION_FROM_EMAIL` | メール送信元アドレス | 任意のメールアドレス | `noreply@yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | アプリケーション本番 URL | Vercel プロジェクト URL | `https://rpa-flow.vercel.app` |

### 2.2 環境変数の設定手順

1. **Vercel Dashboard にログイン**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - 「rpa-flow」プロジェクトをクリック

3. **Settings → Environment Variables**
   - 画面右上の「Settings」をクリック
   - 左メニューから「Environment Variables」を選択

4. **変数を追加**
   - 「Add Environment Variable」をクリック
   - Name: `DATABASE_URL`
   - Value: Neon から取得した接続文字列
   - Select Environments: `Production` と `Preview` をチェック
   - 「Save」をクリック

5. **全変数を繰り返し追加**
   - 上記テーブルの全変数について同じ手順を実行

---

## Step 3: Vercel Blob ストレージの設定

1. **Vercel Dashboard → Storage**
   - 画面左上の「Storage」をクリック

2. **新規データベース作成**
   - 「Create Database」をクリック
   - 「Blob」を選択

3. **プロジェクトに接続**
   - 「Connect to Project」をクリック
   - 「rpa-flow」を選択して確認

4. **BLOB_READ_WRITE_TOKEN の確認**
   - 自動で環境変数 `BLOB_READ_WRITE_TOKEN` が追加される
   - Environment Variables で確認可能

---

## Step 4: Inngest の設定

1. **Inngest Dashboard にログイン**
   - https://app.inngest.com

2. **新しいアプリを作成**
   - 「Apps」 → 「Add App」をクリック

3. **URL を入力**
   - API URL: `https://{YOUR_VERCEL_URL}/api/inngest`
   - 例: `https://rpa-flow.vercel.app/api/inngest`

4. **キーをコピー**
   - Event Key: `fnAbc...` → `INNGEST_EVENT_KEY` 環境変数に設定
   - Signing Key: `signKey_abc...` → `INNGEST_SIGNING_KEY` 環境変数に設定

---

## Step 5: Cron Jobs の設定

`vercel.json` に定義済み：
```json
"crons": [
  {
    "path": "/api/cron/scheduled-robots",
    "schedule": "0 * * * *"
  }
]
```

このスケジュールは **毎時 0 分**（毎時間の最初）に `/api/cron/scheduled-robots` をトリガーします。

---

## Step 6: デプロイの実行

### オプション A: Vercel CLI でデプロイ

```bash
cd /mnt/c/Users/SPM伊藤隆史/Antigravity/rpa-flow

# 本番環境にデプロイ
vercel --prod
```

### オプション B: GitHub 自動デプロイ

1. **Vercel Dashboard → Settings → Git**
   - 「Production Branch」を「main」に設定
   - GitHub へのpush で自動デプロイ

---

## Step 7: デプロイ後の確認

### ✅ ビルドとデプロイが成功したか確認

1. **Vercel Dashboard → Deployments**
   - 最新デプロイのステータスが「Ready」になっているか確認

2. **アプリケーション URL にアクセス**
   - https://rpa-flow.vercel.app
   - ログインページが表示されるか確認

3. **ログイン機能を確認**
   - Google OAuth でログイン可能か確認
   - ダッシュボード表示確認

### 📊 ヘルスチェック エンドポイント

```bash
curl https://rpa-flow.vercel.app/api/health

# 期待される応答:
# { "status": "ok" }
```

### 📝 ログを確認

1. **Vercel Dashboard → Deployments → 最新デプロイ**
   - 「Function Logs」をクリック
   - エラーがないか確認

2. **ローカルで Inngest 実行状況確認**
   - https://app.inngest.com → Apps → rpa-flow
   - Recent function runs を確認

---

## トラブルシューティング

### ❌ ビルド失敗: "Cannot find module"

**原因**: 環境変数が不足している
**解決**: Environment Variables が全て設定されているか確認

```bash
# ローカルで確認
vercel env pull  # 環境変数をダウンロード
npm run build
```

### ❌ ログイン失敗: "Invalid OAuth callback URL"

**原因**: NEXTAUTH_URL と実際のドメインが一致していない
**解決**:
1. Vercel Dashboard で確認されたドメインを取得
   - 例: `https://rpa-flow-xyz123.vercel.app`
2. 環境変数を更新:
   - `NEXTAUTH_URL` = 実際のVercelドメイン
   - `NEXT_PUBLIC_APP_URL` = 同じURL
3. Google Cloud Console でも OAuth リダイレクト URI を更新

### ❌ Inngest 関数が実行されない

**原因**: Inngest URL が誤っている
**解決**:
1. Vercel実際のドメインを確認
2. Inngest Dashboard で App URL を更新
   - 正: `https://rpa-flow.vercel.app/api/inngest`
   - (誤: localhost や staging URL のままになっていないか)

### ❌ データベース接続エラー

**原因**: DATABASE_URL が無効
**解決**:
1. Neon Console で接続文字列を再度取得
2. Vercel 環境変数を更新
3. ローカルで接続確認:
   ```bash
   npm run db:push
   ```

---

## 参考リソース

| リソース | URL |
|---------|-----|
| Vercel ドキュメント | https://vercel.com/docs |
| Next.js デプロイ | https://nextjs.org/docs/deployment/vercel |
| Inngest + Vercel | https://www.inngest.com/docs/platforms/vercel |
| Neon PostgreSQL | https://neon.tech/docs |
| Upstash Redis | https://upstash.com/docs |
| Resend Email | https://resend.com/docs |

---

## デプロイ完了チェックリスト

- [ ] vercel.json が作成されている
- [ ] Vercel CLI でプロジェクトにリンク済み（`.vercel/project.json` 存在）
- [ ] 環境変数が全て設定済み（16個）
- [ ] Blob ストレージが設定済み
- [ ] Inngest App が作成済み
- [ ] ビルドが成功している
- [ ] アプリケーション URL にアクセス可能
- [ ] ログイン機能が動作している
- [ ] Cron Jobs が実行中（Vercel Crons で確認可能）

---

**デプロイ完了！🎉**