"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createRobot } from "../actions";

interface Template {
  id: string;
  name: string;
  description: string;
}

export function TemplateSelector() {
  const [activeTab, setActiveTab] = useState<"blank" | "template">("blank");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [robotName, setRobotName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (activeTab === "template") {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/robots/templates");
      if (!response.ok) throw new Error("テンプレート取得に失敗");
      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "テンプレート取得に失敗"
      );
    }
  };

  const handleCreateBlank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createRobot(formData);
  };

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      setError("テンプレートを選択してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/robots/from-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          name: robotName || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "作成に失敗しました");
      }

      const data = await response.json();
      router.push(data.editorUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "作成に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        新規ロボット作成
      </h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("blank")}
          className={`px-4 py-2 font-medium transition ${
            activeTab === "blank"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          空白から作成
        </button>
        <button
          onClick={() => setActiveTab("template")}
          className={`px-4 py-2 font-medium transition ${
            activeTab === "template"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          テンプレートから作成
        </button>
      </div>

      {/* Blank Tab */}
      {activeTab === "blank" && (
        <form onSubmit={handleCreateBlank} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              ロボット名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="例: 毎日のデータ収集"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              説明
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="ロボットの説明を入力"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              作成してエディタを開く
            </button>
            <a
              href="/robots"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              キャンセル
            </a>
          </div>
        </form>
      )}

      {/* Template Tab */}
      {activeTab === "template" && (
        <div>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Template Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  setRobotName("");
                }}
                className={`rounded-lg border-2 p-4 text-left transition ${
                  selectedTemplate === template.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {template.description}
                </p>
              </button>
            ))}
          </div>

          {selectedTemplate && (
            <form onSubmit={handleCreateFromTemplate} className="space-y-4">
              <div>
                <label
                  htmlFor="template-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  ロボット名（オプション）
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={robotName}
                  onChange={(e) => setRobotName(e.target.value)}
                  placeholder={
                    templates.find((t) => t.id === selectedTemplate)?.name
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "作成中..." : "作成してエディタを開く"}
                </button>
                <a
                  href="/robots"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  キャンセル
                </a>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
