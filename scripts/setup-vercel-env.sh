#!/bin/bash

################################################################################
# Vercel 環境変数設定スクリプト
#
# 説明: ローカルで .env.local に設定した環境変数を Vercel に追加します
# 前提: vercel CLI がインストール済み & vercel login 実行済み
#
# 実行方法:
#   chmod +x scripts/setup-vercel-env.sh
#   ./scripts/setup-vercel-env.sh
#
################################################################################

set -e

echo "=========================================="
echo "Vercel 環境変数設定を開始します"
echo "=========================================="

# ローカル .env.local から環境変数を読み込み
if [ ! -f .env.local ]; then
    echo "❌ エラー: .env.local が見つかりません"
    echo "   先に .env.local を設定してください"
    exit 1
fi

echo ""
echo "📝 ローカル .env.local から環境変数を読み込んでいます..."

# 環境変数リスト（順序は重要）
VARS=(
    "DATABASE_URL"
    "AUTH_SECRET"
    "AUTH_GOOGLE_ID"
    "AUTH_GOOGLE_SECRET"
    "NEXTAUTH_URL"
    "WORKER_URL"
    "WORKER_SECRET"
    "INNGEST_EVENT_KEY"
    "INNGEST_SIGNING_KEY"
    "UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"
    "BLOB_READ_WRITE_TOKEN"
    "RESEND_API_KEY"
    "NOTIFICATION_FROM_EMAIL"
    "NEXT_PUBLIC_APP_URL"
)

# 各環境変数を Vercel に設定
for var in "${VARS[@]}"; do
    # .env.local から値を取得
    value=$(grep "^${var}=" .env.local | cut -d'=' -f2-)

    if [ -z "$value" ]; then
        echo "⚠️  スキップ: $var (値が見つかりません)"
        continue
    fi

    echo "✓ 設定中: $var"

    # Vercel に環境変数を追加（本番環境）
    vercel env add "$var" production <<< "$value" 2>/dev/null || true
done

echo ""
echo "=========================================="
echo "✅ 環境変数の設定が完了しました！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "  1. Vercel Dashboard で環境変数が設定されていることを確認"
echo "  2. デプロイを実行:"
echo "     vercel --prod"
echo ""