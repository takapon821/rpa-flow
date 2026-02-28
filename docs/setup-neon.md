# Neon DB セットアップ手順書

このドキュメントは、rpa-flow プロジェクトを Neon PostgreSQL データベースと連携させるための手順を記載しています。

---

## 1. Neon プロジェクト作成

### 1.1 Neon へのアクセス
1. https://neon.tech にアクセスします
2. Google アカウント、GitHub アカウント、またはメールアドレスでログインします
3. ダッシュボードが表示されます

### 1.2 新規プロジェクト作成
1. ダッシュボードで「**New Project**」ボタンをクリック
2. 以下の設定を入力します：
   - **Project name**: `rpa-flow`
   - **Region**: Singapore (`ap-southeast-1`) または Tokyo（ap-northeast-1）
     - ※ アプリケーションをホストするサーバーに近いリージョンを選択すると、レイテンシが低くなります
   - **PostgreSQL version**: `16` （最新の安定版）

### 1.3 プロジェクト作成完了
1. 「**Create Project**」ボタンをクリック
2. プロジェクトが作成されるまで数秒待機
3. Neon Console が開きます

---

## 2. 接続文字列（DATABASE_URL）の取得

### 2.1 Neon Console で接続情報を確認
1. Neon Console の左パネルで、作成したプロジェクト名（`rpa-flow`）をクリック
2. 「**Connection string**」セクションを展開
3. 接続文字列が表示されます：
   ```
   postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### 2.2 接続文字列をコピー
1. 接続文字列の右側にあるコピーボタン（📋）をクリック
2. クリップボードにコピーされます

**例:**
```
postgresql://neondb_owner:xxxxxxxxxxxx@ep-cool-cloud-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

---

## 3. 環境変数設定

### 3.1 .env.local ファイルを編集
プロジェクトルートの `.env.local` ファイルに以下を追加します：

```bash
DATABASE_URL=postgresql://neondb_owner:xxxxxxxxxxxx@ep-cool-cloud-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**⚠️ 重要:**
- `DATABASE_URL` を `.env.local` に設定することで、ローカル開発環境が Neon DB に接続します
- `.env.local` は `.gitignore` に含まれているため、Git に コミットされません
- 本番環境では、Vercel や他のホスティングサービスの環境変数設定で DATABASE_URL を設定してください

### 3.2 設定確認
以下のコマンドで、環境変数が正しく読み込まれていることを確認します：

```bash
cd /mnt/c/Users/SPM伊藤隆史/Antigravity/rpa-flow
echo $DATABASE_URL
```

接続文字列が出力されれば成功です。

---

## 4. Drizzle Migration の実行

### 4.1 マイグレーションファイルの生成（スキーマから）

スキーマ定義（`src/lib/db/schema.ts`）から SQL マイグレーションファイルを生成します：

```bash
cd /mnt/c/Users/SPM伊藤隆史/Antigravity/rpa-flow
npx drizzle-kit generate
```

**出力例:**
```
✓ Your SQL migration file ➜ drizzle/0000_curvy_cerebro.sql 🚀
```

マイグレーションファイルは `drizzle/` ディレクトリに生成されます。

### 4.2 マイグレーションの実行（DB スキーマ適用）

生成されたマイグレーションファイルを Neon DB に適用します：

```bash
npx drizzle-kit migrate
```

**出力例:**
```
✓ Migration complete
```

このコマンドで、以下の 12 テーブルが Neon DB に作成されます：
- `users` - ユーザー情報
- `accounts` - OAuth アカウント情報
- `sessions` - セッション管理
- `verification_tokens` - メール認証トークン
- `robots` - RPA ロボット定義
- `robot_steps` - ロボットのステップ
- `executions` - ロボット実行履歴
- `execution_logs` - 実行ログ
- `output_files` - 出力ファイル
- `api_keys` - API キー
- `webhooks` - Webhook 設定
- `notification_settings` - 通知設定

---

## 5. 接続確認

### 5.1 データベース接続テスト

以下のコマンドで、Neon DB への接続を確認します：

```bash
node -e "const { Pool } = require('@neondatabase/serverless'); const p = new Pool({connectionString: process.env.DATABASE_URL}); p.query('SELECT NOW()').then(r => { console.log('OK:', r.rows[0]); p.end(); }).catch(e => { console.error('Error:', e.message); process.exit(1); });"
```

**成功時の出力:**
```
OK: { now: 2026-02-28T23:00:00.000Z }
```

**失敗時は以下を確認:**
- DATABASE_URL が正しく設定されているか
- ネットワークが Neon サーバーに接続できているか
- ファイアウォール設定で PostgreSQL ポート（5432）がブロックされていないか

### 5.2 テーブル確認（Neon Console）

1. Neon Console の「**SQL Editor**」を開く
2. 以下の SQL を実行して、テーブルが作成されたか確認：

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

**出力例:**
```
table_name
────────────────────────
accounts
api_keys
execution_logs
executions
notification_settings
output_files
robot_steps
robots
sessions
users
verification_tokens
webhooks
```

12 個のテーブルが表示されれば、セットアップ成功です。

---

## 6. アプリケーション起動

データベースセットアップが完了したら、アプリケーションを起動できます：

### 6.1 開発サーバー起動
```bash
npm run dev
```

### 6.2 本番ビルド
```bash
npm run build
npm run start
```

アプリケーションが Neon DB に正常に接続していれば、以下の機能が動作します：
- ユーザー認証
- ロボット管理
- 実行履歴の記録
- API キー管理

---

## 7. トラブルシューティング

### 問題: `connect ENOTFOUND`
**原因:** DATABASE_URL が設定されていない、または不正な形式
**解決:** `echo $DATABASE_URL` で接続文字列を確認

### 問題: `FATAL: role "user" does not exist`
**原因:** Neon 接続文字列に含まれるユーザー名が存在しない
**解決:** Neon Console で正しい接続文字列を確認し、再設定

### 問題: `SSL connection error`
**原因:** SSL モードの設定エラー
**解決:** 接続文字列に `?sslmode=require` が含まれていることを確認

### 問題: マイグレーション実行時エラー
**原因:** テーブルが既に存在する、またはスキーマバージョンミスマッチ
**解決:**
- 既存テーブルを削除：`DROP TABLE IF EXISTS table_name CASCADE;`
- または、マイグレーション履歴をリセット：Neon Console で手動削除

---

## 8. 本番環境への展開

### 8.1 Vercel へのデプロイ（推奨）
1. Vercel プロジェクト設定で環境変数を追加：
   - キー: `DATABASE_URL`
   - 値: Neon 接続文字列（`.env.local` と同じ値）

2. `git push` でデプロイ

### 8.2 他のホスティングサービス
各サービスのドキュメントに従い、環境変数 `DATABASE_URL` を設定してください。

---

## 参考リンク

- [Neon 公式ドキュメント](https://neon.tech/docs)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team)
- [PostgreSQL 16 リリースノート](https://www.postgresql.org/about/release/16)

---

**Last Updated:** 2026-02-28
**Author:** ashigaru2
