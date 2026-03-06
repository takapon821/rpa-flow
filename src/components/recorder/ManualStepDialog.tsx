'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { VisualStep } from '@/hooks/useVisualEditor';

type StepType = VisualStep['type'];

interface ManualStepDialogProps {
  onAdd: (step: Omit<VisualStep, 'id'>) => void;
  onClose: () => void;
}

const ACTION_OPTIONS: { value: StepType; label: string }[] = [
  { value: 'navigate', label: 'URLを開く' },
  { value: 'click', label: 'クリック' },
  { value: 'type', label: 'テキスト入力' },
  { value: 'select', label: '選択' },
  { value: 'wait', label: '待機' },
  { value: 'scroll', label: 'スクロール' },
];

export function ManualStepDialog({ onAdd, onClose }: ManualStepDialogProps) {
  const [actionType, setActionType] = useState<StepType>('navigate');
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  const needsSelector = actionType === 'click' || actionType === 'type' || actionType === 'select' || actionType === 'scroll';
  const needsUrl = actionType === 'navigate';
  const needsValue = actionType === 'type' || actionType === 'select' || actionType === 'wait';

  const canSubmit = () => {
    if (needsUrl && !url.trim()) return false;
    if (needsSelector && !selector.trim()) return false;
    if (actionType === 'type' && !value.trim()) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;

    const step: Omit<VisualStep, 'id'> = {
      type: actionType,
      ...(needsSelector && { selector: selector.trim() }),
      ...(needsValue && value.trim() && { value: value.trim() }),
      ...(needsUrl && { url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}` }),
      description: description.trim() || undefined,
    };

    onAdd(step);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded-lg shadow-xl p-5 w-96 text-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">ステップを追加</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action type */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">アクション</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as StepType)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* URL (navigate) */}
        {needsUrl && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Selector */}
        {needsSelector && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">セレクター</label>
            <input
              type="text"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              placeholder="#submit-btn, .form-input, [data-testid='login']"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Value */}
        {needsValue && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {actionType === 'wait' ? 'タイムアウト (ms)' : actionType === 'select' ? '選択値' : '入力値'}
            </label>
            <input
              type={actionType === 'wait' ? 'number' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={actionType === 'wait' ? '3000' : actionType === 'select' ? 'option-value' : '入力テキスト'}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Description (optional) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">説明 (任意)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ログインボタンをクリック"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            追加
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
