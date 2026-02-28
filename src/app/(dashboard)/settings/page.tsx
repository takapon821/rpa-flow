import { auth } from "@/lib/auth";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { ApiKeySection } from "@/components/settings/api-key-section";
import { WebhookSection } from "@/components/settings/webhook-section";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">設定</h1>

      <div className="space-y-6">
        {/* Profile */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            プロフィール
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                名前
              </label>
              <p className="text-sm text-gray-900">
                {session?.user?.name ?? "-"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                メール
              </label>
              <p className="text-sm text-gray-900">
                {session?.user?.email ?? "-"}
              </p>
            </div>
          </div>
        </section>

        {/* Worker status */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            ワーカー接続
          </h2>
          <p className="text-sm text-gray-500">
            Worker URL: {process.env.WORKER_URL || "http://localhost:3001"}
          </p>
        </section>

        {/* API Keys */}
        <ApiKeySection />

        {/* Notifications */}
        <NotificationSettings />

        {/* Webhooks */}
        <WebhookSection />
      </div>
    </div>
  );
}
