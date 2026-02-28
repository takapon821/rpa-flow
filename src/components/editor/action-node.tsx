"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeTypeConfig } from "./node-types";

interface ActionNodeData {
  actionType: string;
  label: string;
  config: Record<string, unknown>;
}

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const typeConfig = getNodeTypeConfig(nodeData.actionType);
  if (!typeConfig) return null;

  const Icon = typeConfig.icon;

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 px-3 py-2 shadow-sm transition ${
        typeConfig.bgColor
      } ${selected ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-gray-400"
      />
      <div className="flex items-center gap-2">
        <Icon size={16} className={typeConfig.color} />
        <span className="text-xs font-medium text-gray-700">
          {nodeData.label || typeConfig.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-gray-400"
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
