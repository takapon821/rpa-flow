'use client';

import { useState, useEffect } from 'react';

interface ElementInfo {
  selector: string;
  altSelectors: string[];
  tag: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  suggestedAction: 'click' | 'type' | 'select';
}

interface ActionConfirmDialogProps {
  elementInfo: ElementInfo;
  onConfirm: (action: {
    type: 'click' | 'type' | 'select' | 'scroll' | 'wait';
    selector: string;
    value?: string;
  }) => void;
  onCancel: () => void;
  onType: (text: string) => void;
}

export function ActionConfirmDialog({
  elementInfo,
  onConfirm,
  onCancel,
  onType,
}: ActionConfirmDialogProps) {
  const [selectedAction, setSelectedAction] = useState<
    'click' | 'type' | 'select' | 'wait'
  >(elementInfo.suggestedAction === 'select' ? 'select' : elementInfo.suggestedAction);
  const [typeValue, setTypeValue] = useState('');
  const [selectedSelector, setSelectedSelector] = useState(elementInfo.selector);

  useEffect(() => {
    setSelectedAction(
      elementInfo.suggestedAction === 'select'
        ? 'select'
        : elementInfo.suggestedAction
    );
    setSelectedSelector(elementInfo.selector);
    setTypeValue('');
  }, [elementInfo]);

  const handleConfirm = () => {
    if (selectedAction === 'type' && typeValue) {
      // Actually type into the field on the worker side
      onType(typeValue);
    }
    onConfirm({
      type: selectedAction,
      selector: selectedSelector,
      value: selectedAction === 'type' ? typeValue : undefined,
    });
  };

  const allSelectors = [
    elementInfo.selector,
    ...elementInfo.altSelectors,
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
      <div className="bg-white rounded-lg shadow-xl p-4 w-96 text-sm max-h-[80vh] overflow-y-auto">
        <h3 className="font-semibold mb-3 text-base">要素を検出しました</h3>

        {/* Element info */}
        <div className="mb-3 space-y-1">
          <div className="text-xs text-gray-500">
            <span className="font-medium">タグ:</span>{' '}
            <code className="bg-gray-100 px-1 rounded">{elementInfo.tag}</code>
          </div>
          {elementInfo.text && (
            <div className="text-xs text-gray-500">
              <span className="font-medium">テキスト:</span> {elementInfo.text}
            </div>
          )}
        </div>

        {/* Selector selection */}
        <div className="mb-3">
          <p className="font-medium mb-1.5 text-xs text-gray-600">セレクター:</p>
          <div className="space-y-1">
            {allSelectors.map((sel, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="selector"
                  checked={selectedSelector === sel}
                  onChange={() => setSelectedSelector(sel)}
                  className="w-3.5 h-3.5 mt-0.5"
                />
                <code className="text-xs break-all bg-gray-50 px-1 py-0.5 rounded">
                  {sel}
                </code>
              </label>
            ))}
          </div>
        </div>

        {/* Action selection */}
        <div className="mb-3">
          <p className="font-medium mb-1.5 text-xs text-gray-600">アクション:</p>
          <div className="space-y-1.5">
            {(['click', 'type', 'select', 'wait'] as const).map((action) => (
              <label key={action} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value={action}
                  checked={selectedAction === action}
                  onChange={() => setSelectedAction(action)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-sm">
                  {action === 'click'
                    ? 'クリック'
                    : action === 'type'
                      ? 'テキスト入力'
                      : action === 'select'
                        ? 'セレクト'
                        : '待機'}
                </span>
                {action === elementInfo.suggestedAction && (
                  <span className="text-xs text-blue-500 font-medium">(推奨)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Type value input */}
        {selectedAction === 'type' && (
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">入力値:</label>
            <input
              type="text"
              value={typeValue}
              onChange={(e) => setTypeValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="入力するテキスト"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={selectedAction === 'type' && !typeValue}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            フローに追加
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
