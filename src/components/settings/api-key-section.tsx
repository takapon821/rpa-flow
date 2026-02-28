'use client';

import { useEffect, useState } from 'react';
import { Copy, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { InferSelectModel } from 'drizzle-orm';
import type { apiKeys } from '@/lib/db/schema';

type ApiKey = InferSelectModel<typeof apiKeys>;

interface ListApiKeyResponse {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface CreateApiKeyResponse extends ListApiKeyResponse {
  plainKey: string;
  warning: string;
}

export function ApiKeySection() {
  const [keys, setKeys] = useState<ListApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showNewKey, setShowNewKey] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load existing keys
  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/keys');
      if (!response.ok) throw new Error('Failed to load API keys');

      const data = (await response.json()) as { keys: ListApiKeyResponse[] };
      setKeys(data.keys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyLabel.trim()) {
      setError('Key name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyLabel }),
      });

      if (!response.ok) throw new Error('Failed to create API key');

      const newKey = (await response.json()) as CreateApiKeyResponse;
      setShowNewKey(newKey);
      setNewKeyLabel('');
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (showNewKey) {
      await navigator.clipboard.writeText(showNewKey.plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      setDeleting(id);
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      setKeys(keys.filter((k) => k.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">APIキー</h2>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          <Plus size={16} />
          新しいキーを生成
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* New Key Display */}
      {showNewKey && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <p className="text-sm font-medium text-amber-900">{showNewKey.warning}</p>
          </div>
          <div className="mb-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              APIキー
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 break-all">
                {showNewKey.plainKey}
              </code>
              <button
                onClick={handleCopyKey}
                className="inline-flex items-center justify-center rounded-lg bg-white p-2 text-gray-500 hover:bg-gray-50 border border-gray-200"
                title="Copy to clipboard"
              >
                {copied ? (
                  <CheckCircle2 size={18} className="text-green-600" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowNewKey(null)}
            className="inline-block text-sm text-amber-600 hover:text-amber-700"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-500">
          APIキーがまだ作成されていません。
        </p>
      ) : (
        <div className="divide-y divide-gray-100 border-t border-gray-200">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-gray-500">
                    {key.keyPrefix}...
                  </code>
                  <span className="text-sm font-medium text-gray-900">
                    {key.name}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  作成: {new Date(key.createdAt).toLocaleString('ja-JP')}
                  {key.lastUsedAt && (
                    <>
                      {' • '}
                      最終使用: {new Date(key.lastUsedAt).toLocaleString('ja-JP')}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDeleteKey(key.id)}
                disabled={deleting === key.id}
                className="ml-4 inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Delete key"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm mx-auto">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              新しいAPIキーを生成
            </h3>
            <div className="mb-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                キー名（任意）
              </label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="例: 本番環境, GitHub Actions"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewKeyLabel('');
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateKey}
                disabled={creating || !newKeyLabel.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? '生成中...' : '生成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
