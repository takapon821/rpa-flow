"use client";

import { NODE_TYPE_CONFIGS, type NodeTypeConfig } from "./node-types";

const categories = [
  { key: "browser", label: "ブラウザ操作" },
  { key: "control", label: "制御フロー" },
  { key: "file", label: "ファイル操作" },
  { key: "auth", label: "認証" },
] as const;

export function ActionPalette() {
  const onDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    nodeType: NodeTypeConfig
  ) => {
    e.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify({
        actionType: nodeType.type,
        label: nodeType.label,
        config: nodeType.defaultConfig,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="h-full w-56 overflow-y-auto border-r border-gray-200 bg-white p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        アクション
      </h3>
      {categories.map(({ key, label }) => {
        const items = NODE_TYPE_CONFIGS.filter((c) => c.category === key);
        if (items.length === 0) return null;
        return (
          <div key={key} className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>
            <div className="space-y-1">
              {items.map((nodeType) => {
                const Icon = nodeType.icon;
                return (
                  <div
                    key={nodeType.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, nodeType)}
                    className={`flex cursor-grab items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:shadow-sm active:cursor-grabbing ${nodeType.bgColor}`}
                  >
                    <Icon size={14} className={nodeType.color} />
                    {nodeType.label}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
