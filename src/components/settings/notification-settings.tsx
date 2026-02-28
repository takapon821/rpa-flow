"use client";

import { useState, useEffect } from "react";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";

interface NotificationSettingsData {
  emailEnabled: boolean;
  email: string;
  onSuccess: boolean;
  onFailure: boolean;
}

export function NotificationSettings() {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [onSuccess, setOnSuccess] = useState(false);
  const [onFailure, setOnFailure] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings/notifications");
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data: NotificationSettingsData = await response.json();
        setEmailEnabled(data.emailEnabled);
        setEmail(data.email);
        setOnSuccess(data.onSuccess);
        setOnFailure(data.onFailure);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (emailEnabled && !email) {
        throw new Error("メールアドレスを入力してください");
      }

      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled,
          email: emailEnabled ? email : "",
          onSuccess,
          onFailure,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">通知設定</h2>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Mail size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">通知設定</h2>
      </div>

      <div className="space-y-5">
        {/* Email Enabled Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            メール通知を有効化
          </label>
          <button
            onClick={() => setEmailEnabled(!emailEnabled)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              emailEnabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                emailEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {emailEnabled && (
          <>
            {/* Email Address Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                通知先メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Success Notification Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                実行完了時に通知
              </label>
              <button
                onClick={() => setOnSuccess(!onSuccess)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  onSuccess ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    onSuccess ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Failure Notification Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                実行失敗時に通知
              </label>
              <button
                onClick={() => setOnFailure(!onFailure)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  onFailure ? "bg-red-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    onFailure ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex gap-2 rounded bg-red-50 p-3">
            <AlertCircle
              size={16}
              className="mt-0.5 flex-shrink-0 text-red-600"
            />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex gap-2 rounded bg-green-50 p-3">
            <CheckCircle
              size={16}
              className="mt-0.5 flex-shrink-0 text-green-600"
            />
            <p className="text-sm text-green-600">設定を保存しました</p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
