import type { ActionType } from "@/types";
import {
  Globe,
  MousePointerClick,
  Keyboard,
  FileText,
  Clock,
  Camera,
  Repeat,
  GitBranch,
  Variable,
  FileSpreadsheet,
  FileDown,
  LogIn,
  type LucideIcon,
} from "lucide-react";

export interface NodeTypeConfig {
  type: ActionType;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  category: "browser" | "control" | "file" | "auth";
  defaultConfig: Record<string, unknown>;
}

export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
  // Browser actions
  {
    type: "navigate",
    label: "ページ遷移",
    icon: Globe,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    category: "browser",
    defaultConfig: { url: "" },
  },
  {
    type: "click",
    label: "クリック",
    icon: MousePointerClick,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    category: "browser",
    defaultConfig: { selector: "" },
  },
  {
    type: "input",
    label: "入力",
    icon: Keyboard,
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    category: "browser",
    defaultConfig: { selector: "", value: "" },
  },
  {
    type: "extract",
    label: "データ抽出",
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    category: "browser",
    defaultConfig: { selector: "", attribute: "textContent", variableName: "" },
  },
  {
    type: "wait",
    label: "待機",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    category: "browser",
    defaultConfig: { type: "delay", value: 1000 },
  },
  {
    type: "screenshot",
    label: "スクリーンショット",
    icon: Camera,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
    category: "browser",
    defaultConfig: { fullPage: false },
  },

  // Control flow
  {
    type: "loop",
    label: "ループ",
    icon: Repeat,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
    category: "control",
    defaultConfig: { source: "variable", variableName: "", maxIterations: 100 },
  },
  {
    type: "condition",
    label: "条件分岐",
    icon: GitBranch,
    color: "text-teal-600",
    bgColor: "bg-teal-50 border-teal-200",
    category: "control",
    defaultConfig: { left: "", operator: "equals", right: "" },
  },
  {
    type: "setVariable",
    label: "変数セット",
    icon: Variable,
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    category: "control",
    defaultConfig: { variableName: "", value: "" },
  },

  // File operations
  {
    type: "csvRead",
    label: "CSV読込",
    icon: FileSpreadsheet,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
    category: "file",
    defaultConfig: { variableName: "" },
  },
  {
    type: "csvWrite",
    label: "CSV書出",
    icon: FileSpreadsheet,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
    category: "file",
    defaultConfig: { data: "", fileName: "output.csv" },
  },
  {
    type: "excelRead",
    label: "Excel読込",
    icon: FileSpreadsheet,
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    category: "file",
    defaultConfig: { sheetName: "", variableName: "" },
  },
  {
    type: "excelWrite",
    label: "Excel書出",
    icon: FileSpreadsheet,
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    category: "file",
    defaultConfig: { data: "", fileName: "output.xlsx" },
  },
  {
    type: "fileDownload",
    label: "ファイルDL",
    icon: FileDown,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 border-cyan-200",
    category: "file",
    defaultConfig: { url: "" },
  },

  // Auth
  {
    type: "login",
    label: "ログイン",
    icon: LogIn,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    category: "auth",
    defaultConfig: { url: "", usernameSelector: "", passwordSelector: "", submitSelector: "", username: "", password: "" },
  },
];

export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return NODE_TYPE_CONFIGS.find((c) => c.type === type);
}
