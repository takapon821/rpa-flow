"use client";

import { useState, useEffect } from "react";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface CreateWebhookPayload {
  url: string;
  events: string[];
  label?: string;
}

const EVENT_OPTIONS = [
  { value: "execution.completed", label: "実行完了" },
  { value: "execution.failed", label: "実行失敗" },
];

export function WebhookSection() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([
    "execution.completed",
    "execution.failed",
  ]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch webhooks on mount
  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWebhooks(data.webhooks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebhook = async () => {
    if (!formUrl.trim() || formEvents.length === 0) {
      setError("URL and at least one event are required");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          events: formEvents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create webhook");
      }

      const data = await res.json();
      setNewSecret(data.secret);
      setFormUrl("");
      setFormEvents(["execution.completed", "execution.failed"]);

      // Fetch updated list
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Fetch updated list
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("このWebhookを削除してよろしいですか？")) return;

    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      // Fetch updated list
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewSecret(null);
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Webhooks</h2>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">読み込み中...</div>
      ) : (
        <>
          {/* Webhook List */}
          {webhooks.length > 0 ? (
            <div className="mb-6 space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono text-sm text-gray-700">
                      {webhook.url}
                    </p>
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {webhook.events.map((evt) => (
                        <span
                          key={evt}
                          className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      作成: {new Date(webhook.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <div className="ml-3 flex gap-2">
                    {/* Active Toggle */}
                    <button
                      onClick={() =>
                        handleToggleWebhook(webhook.id, webhook.isActive)
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        webhook.isActive ? "bg-green-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          webhook.isActive ? "translate-x-5" : ""
                        }`}
                      />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="rounded bg-red-100 px-2 py-1 text-sm text-red-700 hover:bg-red-200"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-6 text-sm text-gray-500">
              Webhookはまだ登録されていません
            </p>
          )}

          {/* Add Button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Webhookを追加
          </button>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            {newSecret ? (
              <>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  ⚠️ Webhookシークレットを保存してください
                </h3>
                <p className="mb-3 text-sm text-gray-600">
                  このシークレットは二度と表示されません。安全な場所に保存してください。
                </p>
                <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 break-all">
                  {newSecret}
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Webhookを追加
                </h3>

                {/* URL Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                {/* Events Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    イベント
                  </label>
                  <div className="space-y-2">
                    {EVENT_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formEvents.includes(opt.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormEvents([...formEvents, opt.value]);
                            } else {
                              setFormEvents(
                                formEvents.filter((v) => v !== opt.value)
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddWebhook}
                    disabled={formSubmitting}
                    className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formSubmitting ? "追加中..." : "追加"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
