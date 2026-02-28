"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { getNodeTypeConfig } from "./node-types";
import type { Node } from "@xyflow/react";

interface StepConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function StepConfigPanel({
  node,
  onUpdate,
  onClose,
}: StepConfigPanelProps) {
  if (!node) return null;

  const nodeData = node.data as { actionType: string; label: string; config: Record<string, unknown> };
  const typeConfig = getNodeTypeConfig(nodeData.actionType);
  if (!typeConfig) return null;

  const Icon = typeConfig.icon;

  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      onUpdate(node.id, {
        ...nodeData,
        config: { ...nodeData.config, [key]: value },
      });
    },
    [node.id, nodeData, onUpdate]
  );

  const handleLabelChange = useCallback(
    (label: string) => {
      onUpdate(node.id, { ...nodeData, label });
    },
    [node.id, nodeData, onUpdate]
  );

  return (
    <div className="h-full w-72 overflow-y-auto border-l border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className={typeConfig.color} />
          <span className="text-sm font-semibold text-gray-900">
            {typeConfig.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <Field label="ステップ名">
          <input
            type="text"
            value={(nodeData.label as string) || ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder={typeConfig.label}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </Field>

        <ConfigFields
          actionType={nodeData.actionType}
          config={nodeData.config}
          onChange={handleConfigChange}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </Field>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300"
      />
      {label}
    </label>
  );
}

function ConfigFields({
  actionType,
  config,
  onChange,
}: {
  actionType: string;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  switch (actionType) {
    case "navigate":
      return (
        <TextInput
          label="URL"
          value={(config.url as string) || ""}
          onChange={(v) => onChange("url", v)}
          placeholder="https://example.com"
        />
      );

    case "click":
      return (
        <TextInput
          label="セレクター"
          value={(config.selector as string) || ""}
          onChange={(v) => onChange("selector", v)}
          placeholder="#submit-btn, .login-button"
        />
      );

    case "input":
      return (
        <>
          <TextInput
            label="セレクター"
            value={(config.selector as string) || ""}
            onChange={(v) => onChange("selector", v)}
            placeholder="#email, input[name='email']"
          />
          <TextInput
            label="入力値"
            value={(config.value as string) || ""}
            onChange={(v) => onChange("value", v)}
            placeholder="入力するテキスト"
          />
        </>
      );

    case "extract":
      return (
        <>
          <TextInput
            label="セレクター"
            value={(config.selector as string) || ""}
            onChange={(v) => onChange("selector", v)}
            placeholder=".price, h1"
          />
          <SelectInput
            label="取得属性"
            value={(config.attribute as string) || "textContent"}
            onChange={(v) => onChange("attribute", v)}
            options={[
              { value: "textContent", label: "テキスト" },
              { value: "innerHTML", label: "HTML" },
              { value: "href", label: "リンク (href)" },
              { value: "src", label: "画像 (src)" },
              { value: "value", label: "入力値 (value)" },
            ]}
          />
          <TextInput
            label="変数名"
            value={(config.variableName as string) || ""}
            onChange={(v) => onChange("variableName", v)}
            placeholder="extractedData"
          />
        </>
      );

    case "wait":
      return (
        <>
          <SelectInput
            label="待機タイプ"
            value={(config.type as string) || "delay"}
            onChange={(v) => onChange("type", v)}
            options={[
              { value: "delay", label: "時間待機" },
              { value: "selector", label: "要素待機" },
              { value: "navigation", label: "ページ遷移待機" },
            ]}
          />
          {(config.type as string) === "selector" ? (
            <TextInput
              label="セレクター"
              value={(config.value as string) || ""}
              onChange={(v) => onChange("value", v)}
              placeholder="#loaded-element"
            />
          ) : (
            <TextInput
              label="待機時間 (ms)"
              value={String(config.value ?? 1000)}
              onChange={(v) => onChange("value", Number(v) || 0)}
              placeholder="1000"
            />
          )}
        </>
      );

    case "screenshot":
      return (
        <CheckboxInput
          label="フルページ"
          checked={(config.fullPage as boolean) || false}
          onChange={(v) => onChange("fullPage", v)}
        />
      );

    case "loop":
      return (
        <>
          <SelectInput
            label="データソース"
            value={(config.source as string) || "variable"}
            onChange={(v) => onChange("source", v)}
            options={[
              { value: "variable", label: "変数" },
              { value: "count", label: "回数指定" },
            ]}
          />
          <TextInput
            label="変数名 / 回数"
            value={(config.variableName as string) || ""}
            onChange={(v) => onChange("variableName", v)}
            placeholder="items"
          />
          <TextInput
            label="最大反復数"
            value={String(config.maxIterations ?? 100)}
            onChange={(v) => onChange("maxIterations", Number(v) || 100)}
          />
        </>
      );

    case "condition":
      return (
        <>
          <TextInput
            label="左辺"
            value={(config.left as string) || ""}
            onChange={(v) => onChange("left", v)}
            placeholder="{{variable}}"
          />
          <SelectInput
            label="演算子"
            value={(config.operator as string) || "equals"}
            onChange={(v) => onChange("operator", v)}
            options={[
              { value: "equals", label: "等しい (==)" },
              { value: "notEquals", label: "等しくない (!=)" },
              { value: "contains", label: "含む" },
              { value: "greaterThan", label: "より大きい (>)" },
              { value: "lessThan", label: "より小さい (<)" },
            ]}
          />
          <TextInput
            label="右辺"
            value={(config.right as string) || ""}
            onChange={(v) => onChange("right", v)}
          />
        </>
      );

    case "setVariable":
      return (
        <>
          <TextInput
            label="変数名"
            value={(config.variableName as string) || ""}
            onChange={(v) => onChange("variableName", v)}
          />
          <TextInput
            label="値"
            value={(config.value as string) || ""}
            onChange={(v) => onChange("value", v)}
          />
        </>
      );

    case "login":
      return (
        <>
          <TextInput
            label="ログインURL"
            value={(config.url as string) || ""}
            onChange={(v) => onChange("url", v)}
            placeholder="https://example.com/login"
          />
          <TextInput
            label="ユーザー名セレクター"
            value={(config.usernameSelector as string) || ""}
            onChange={(v) => onChange("usernameSelector", v)}
            placeholder="#username"
          />
          <TextInput
            label="パスワードセレクター"
            value={(config.passwordSelector as string) || ""}
            onChange={(v) => onChange("passwordSelector", v)}
            placeholder="#password"
          />
          <TextInput
            label="送信ボタンセレクター"
            value={(config.submitSelector as string) || ""}
            onChange={(v) => onChange("submitSelector", v)}
            placeholder="#login-btn"
          />
          <TextInput
            label="ユーザー名"
            value={(config.username as string) || ""}
            onChange={(v) => onChange("username", v)}
          />
          <TextInput
            label="パスワード"
            value={(config.password as string) || ""}
            onChange={(v) => onChange("password", v)}
          />
        </>
      );

    default:
      return (
        <p className="text-xs text-gray-400">
          このアクションの設定はまだ利用できません。
        </p>
      );
  }
}
