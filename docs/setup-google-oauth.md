# Google OAuth 設定ガイド - rpa-flow

**最終更新**: 2026年2月28日
**対象**: rpa-flow（NextAuth.js + Google OAuth）
**所要時間**: 約10～15分

---

## 概要

rpa-flow は NextAuth.js を使用して Google OAuth によるログイン機能を実装しています。このガイドに従い、Google Cloud Console でクライアント ID とシークレットを発行することで、アプリケーションで Google ログインが機能します。

### 前提条件

- ✅ Google アカウント（Gmail等）
- ✅ Google Cloud Console へのアクセス権
- ✅ rpa-flow リポジトリがローカル環境で利用可能
- ✅ `.env.local` ファイルを編集できる権限

---

## Step 1: Google Cloud プロジェクトを作成

### 1.1 Google Cloud Console にアクセス

1. ブラウザで [Google Cloud Console](https://console.cloud.google.com) を開く
2. Google アカウントでログイン（未ログインの場合）

### 1.2 新しいプロジェクトを作成

1. ページ上部の「プロジェクト選択」をクリック

   ```
   ┌─────────────────────────────────┐
   │ プロジェクト選択  ▼             │
   └─────────────────────────────────┘
   ```

2. 右上の「新しいプロジェクト」をクリック

   ```
   ┌──────────────────────────────────────┐
   │ 新しいプロジェクト                    │
   └──────────────────────────────────────┘
   ```

3. 「プロジェクト名」に `rpa-flow` と入力（任意の名前で可）

4. 「組織」は「組織なし」のままで OK

5. 「作成」をクリック

### 1.3 プロジェクトが作成されるまで待機

作成には数十秒かかります。完了すると、作成したプロジェクトが自動的に選択されます。

---

## Step 2: Google API を有効化

### 2.1 Google+ API を有効化

1. 左メニューから「API とサービス」→「ライブラリ」を選択

2. 検索ボックスに「Google+ API」と入力

3. 検索結果から「Google+ API」をクリック

4. 「有効にする」ボタンをクリック

5. API が有効化されるまで数秒待機

**確認**: 「Google+ API」が「有効」と表示されていることを確認

---

## Step 3: OAuth 同意画面を設定

### 3.1 OAuth 同意画面にアクセス

1. 左メニューから「API とサービス」→「OAuth同意画面」を選択

### 3.2 アプリケーション情報を入力

#### ユーザータイプの選択

1. 「ユーザータイプ」セクションで「外部」を選択

   ```
   ◎ 外部（選択）
   ○ 内部
   ```

2. 「作成」をクリック

#### アプリケーション名

| 項目 | 入力値 |
|------|--------|
| **App name** | `RPA Flow` |

#### メールアドレス

1. **User support email（ユーザーサポートメール）**
   - ご自身のメールアドレス（Gmail等）を入力
   - 例: `your-email@gmail.com`

2. **Developer contact information（デベロッパー連絡先情報）**
   - ご自身のメールアドレスを入力（通常はユーザーサポートメールと同じ）

### 3.3 スコープを追加（デフォルトのまま）

- 「スコープ」セクションは **デフォルトのままで OK**
- Google ログインに必要な基本スコープ（email, profile）が自動的に含まれています

### 3.4 テストユーザーを追加

1. 「テストユーザー」セクションで「Add users」をクリック

2. ご自身のメールアドレスを入力（Gmail のメールアドレス）

3. 「追加」をクリック

**重要**: テストユーザーに自分を追加しないと、Google ログイン時に「アクセス拒否」エラーが発生します

### 3.5 確認・保存

1. 入力内容を確認

2. 「保存して次へ」をクリック

3. 以降の画面で「保存して次へ」を続け、最後に「ダッシュボードに戻る」をクリック

---

## Step 4: OAuth クライアント ID を取得

### 4.1 認証情報ページにアクセス

1. 左メニューから「API とサービス」→「認証情報」を選択

### 4.2 OAuthクライアント ID を作成

1. ページ上部の「認証情報を作成」→「OAuthクライアントID」を選択

   ```
   ┌──────────────────────────┐
   │ 認証情報を作成  ▼        │
   │ 【OAuthクライアントID】  │
   └──────────────────────────┘
   ```

2. 「アプリケーションの種類」で「ウェブアプリケーション」を選択

3. 「名前」に `RPA Flow Web Client` と入力

### 4.3 承認済みの JavaScript 生成元を設定

1. 「承認済みの JavaScript 生成元」セクションで「URI を追加」をクリック

2. **開発環境** の場合：

   ```
   http://localhost:3000
   ```

3. **本番環境**（Vercel）の場合、追加で以下も入力：

   ```
   https://your-project.vercel.app
   ```

   ⚠️ **注意**: `your-project` を実際の Vercel プロジェクト名に置き換えてください

**例**:
```
http://localhost:3000
https://rpa-flow-prod.vercel.app
```

### 4.4 承認済みのリダイレクト URI を設定

1. 「承認済みのリダイレクト URI」セクションで「URI を追加」をクリック

2. **開発環境** の場合：

   ```
   http://localhost:3000/api/auth/callback/google
   ```

3. **本番環境**（Vercel）の場合、追加で以下も入力：

   ```
   https://your-project.vercel.app/api/auth/callback/google
   ```

   ⚠️ **注意**: `your-project` を実際の Vercel プロジェクト名に置き換えてください

**例**:
```
http://localhost:3000/api/auth/callback/google
https://rpa-flow-prod.vercel.app/api/auth/callback/google
```

### 4.5 クライアント ID とシークレットをコピー

1. 「作成」をクリック

2. ポップアップウィンドウが表示されます

3. 表示された以下の値を **コピーして保存**：

   - **Client ID** 例: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - **Client Secret** 例: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx`

4. ポップアップを閉じる

**保存方法**:
- メモ帳やパスワードマネージャーに一時保存
- または次の Step 5 でそのまま `.env.local` に入力

---

## Step 5: 環境変数を設定

### 5.1 `.env.local` ファイルを開く

```bash
# rpa-flow プロジェクトルート
cd /path/to/rpa-flow
code .env.local
```

⚠️ **重要**: `.env.local` は `.gitignore` に含まれており、Git で追跡されません（秘密情報の安全性確保）

### 5.2 Google OAuth 関連の環境変数を追加

以下を `.env.local` に追加：

```env
# Google OAuth（Step 4 で取得した値）
AUTH_GOOGLE_ID=YOUR_CLIENT_ID_HERE
AUTH_GOOGLE_SECRET=YOUR_CLIENT_SECRET_HERE

# NextAuth セッション暗号化キー（以下のコマンドで生成）
AUTH_SECRET=YOUR_AUTH_SECRET_HERE

# NextAuth URL（開発環境）
NEXTAUTH_URL=http://localhost:3000
```

### 5.3 AUTH_SECRET を生成

`AUTH_SECRET` は NextAuth.js がセッション JWT を暗号化するために使用します。

**生成コマンド**:

```bash
# Linux / macOS / WSL2 の場合
openssl rand -base64 32

# Windows PowerShell の場合
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

**出力例**:
```
K7Hx9mQ2nR5vP3wL8jT1oY4uZ6dA0bE=
```

### 5.4 値を置き換える

上記コマンドで生成した値を以下のように置き換え：

```env
AUTH_GOOGLE_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_SECRET=K7Hx9mQ2nR5vP3wL8jT1oY4uZ6dA0bE=
NEXTAUTH_URL=http://localhost:3000
```

### 5.5 ファイルを保存

**重要**: 変更を保存してください！（Ctrl+S または Cmd+S）

---

## Step 6: 本番環境設定（Vercel）

本番環境で rpa-flow を Vercel にデプロイする場合、同じ環境変数を Vercel 側にも設定します。

### 6.1 Vercel 環境変数設定

1. [Vercel ダッシュボード](https://vercel.com/dashboard) を開く

2. rpa-flow プロジェクトを選択

3. 「Settings」→「Environment Variables」を選択

4. 以下を追加：

   ```
   AUTH_GOOGLE_ID = (Step 4 で取得した値)
   AUTH_GOOGLE_SECRET = (Step 4 で取得した値)
   AUTH_SECRET = (Step 5 で生成した値)
   NEXTAUTH_URL = https://your-project.vercel.app
   ```

5. 「Save」をクリック

6. Vercel 上で自動的に再デプロイが開始されます

**詳細は [Vercel セットアップガイド](./setup-vercel.md) を参照**

---

## Step 7: 動作確認

### 7.1 開発サーバーを起動

```bash
npm run dev
# 出力: ▲ Next.js 15.x ready on http://localhost:3000
```

### 7.2 アプリケーションにアクセス

1. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

2. **「Google でログイン」ボタンが表示されることを確認**

### 7.3 Google ログインをテスト

1. 「Google でログイン」ボタンをクリック

2. **Google ログインページが表示されることを確認**

   ```
   Google アカウントにログイン
   メールアドレスまたは電話番号を入力
   [______________]
   ```

3. Step 3 で登録したテストユーザーのメールアドレスでログイン

4. 権限許可画面が表示される：

   ```
   RPA Flow がアカウントへのアクセスをリクエストしています
   ☐ メールアドレスの表示
   ☐ プロフィール情報の表示
   ```

5. 「続行」をクリック

6. **ダッシュボードにリダイレクトされることを確認**

   ```
   ✓ ログイン成功
   → http://localhost:3000/dashboard へリダイレクト
   ```

### ✅ テスト完了チェックリスト

- [ ] Google ログインボタンが表示される
- [ ] Google ログインページにアクセスできる
- [ ] テストユーザーでログインできる
- [ ] ダッシュボードにリダイレクトされる
- [ ] 右上にプロフィール情報が表示される

---

## トラブルシューティング

### ❌ エラー: `redirect_uri_mismatch`

**症状**: Google ログイン時に「ログインできませんでした」というエラー

**原因**: リダイレクト URI が Google Console に登録されたものと一致していない

**対処**:
1. Google Console → 「認証情報」を開く
2. 「OAuthクライアント ID」を編集
3. 「承認済みのリダイレクト URI」を確認：
   - 開発環境の場合: `http://localhost:3000/api/auth/callback/google`
   - 本番環境の場合: `https://your-project.vercel.app/api/auth/callback/google`
4. 不足していれば追加して保存

### ❌ エラー: `access_denied`

**症状**: Google ログイン時に「アクセスが拒否されました」というエラー

**原因**: テストユーザーが OAuth 同意画面に登録されていない

**対処**:
1. Google Console → 「OAuth同意画面」を開く
2. 「テストユーザー」セクションを確認
3. ご自身のメールアドレスが登録されていない場合、「ユーザーを追加」から追加
4. 数分待機してから再度ログインを試す

### ❌ エラー: `invalid_client`

**症状**: コンソールに「ClientID や ClientSecret が無効です」というエラー

**原因**: `.env.local` に入力したクライアント ID またはシークレットが誤っている

**対処**:
1. Google Console → 「認証情報」を開く
2. 「OAuthクライアント ID」をクリック
3. クライアント ID とシークレットをコピー
4. `.env.local` に正確に貼り付け（スペースなし）
5. 開発サーバーを再起動

   ```bash
   # ターミナルで Ctrl+C を押して停止
   # その後、再度起動
   npm run dev
   ```

### ❌ エラー: `NEXTAUTH_URL が設定されていません`

**症状**: NextAuth 関連のエラーが出現

**原因**: `NEXTAUTH_URL` が `.env.local` に設定されていない

**対処**:
```env
NEXTAUTH_URL=http://localhost:3000
```
を `.env.local` に追加して、開発サーバーを再起動

### ⚠️ Note: ローカル開発時は `http://localhost` で OK

Google OAuth の設定では、ローカル開発時は `http://localhost:3000` を使用できます（`https` 不要）

---

## よくある質問

### Q. クライアント ID とシークレットを紛失してしまった

**A**: Google Console → 「認証情報」から「OAuthクライアント ID」を再度クリックして表示・コピーできます

### Q. テストユーザーで複数のメールアドレスを登録できますか？

**A**: はい。「OAuth同意画面」→「テストユーザー」で複数追加可能です。チーム内で開発する場合、全メンバーを登録してください

### Q. 本番環境でもテストユーザーの登録が必要ですか？

**A**: いいえ。「OAuth同意画面」で「本番環境に移行」すれば、テストユーザー登録なしで任意の Google アカウントでログイン可能になります（未実装の場合、本番環境でも「テストユーザー」限定です）

### Q. AUTH_SECRET の値を変更するとどうなりますか？

**A**: セッション JWT が無効になり、既存のログイン状態がリセットされます。本番環境では慎重に変更してください

### Q. ローカルと本番で異なるクライアント ID を使用したい

**A**: 可能です。Google Console で複数の OAuthクライアント ID を作成し、開発環境と本番環境で別の認証情報を使用できます

---

## 参考資料

- [Google Cloud Console](https://console.cloud.google.com)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options#environment-variables)
- [rpa-flow Vercel セットアップ](./setup-vercel.md)
- [rpa-flow Neon セットアップ](./setup-neon.md)

---

## 次のステップ

Google OAuth の設定が完了したら：

1. ✅ 本番環境（Vercel）の環境変数を設定 → [setup-vercel.md](./setup-vercel.md) 参照
2. ✅ データベース（Neon）が正しく設定されているか確認 → [setup-neon.md](./setup-neon.md) 参照
3. ✅ `npm run dev` でローカル開発を開始

---

**作成日**: 2026年2月28日
**バージョン**: 1.0.0
