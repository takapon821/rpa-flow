// ════════════════════════════════════════════════════════════════════════════
// Robot Templates - RPA Flow用テンプレート集
// ════════════════════════════════════════════════════════════════════════════

export interface RobotTemplate {
  id: string;
  name: string;
  description: string;
  flowDefinition: {
    steps: unknown[];
  };
  variables: Record<string, string>;
}

export const ROBOT_TEMPLATES: RobotTemplate[] = [
  {
    id: "web-scraping",
    name: "Web情報収集",
    description: "Webページから情報を収集するテンプレート",
    flowDefinition: {
      steps: [
        { type: "navigate", url: "{{target_url}}" },
        { type: "extract", selector: "{{selector}}", variable: "result" },
        { type: "log", message: "取得結果: {{result}}" },
      ],
    },
    variables: { target_url: "", selector: "" },
  },
  {
    id: "form-input",
    name: "フォーム入力",
    description: "Webフォームを自動入力するテンプレート",
    flowDefinition: {
      steps: [
        { type: "navigate", url: "{{form_url}}" },
        {
          type: "type",
          selector: "{{email_field}}",
          text: "{{email}}",
        },
        {
          type: "type",
          selector: "{{password_field}}",
          text: "{{password}}",
        },
        { type: "click", selector: "{{submit_button}}" },
        { type: "waitForNavigation" },
      ],
    },
    variables: {
      form_url: "",
      email_field: "",
      password_field: "",
      submit_button: "",
      email: "",
      password: "",
    },
  },
  {
    id: "data-extraction",
    name: "データ抽出",
    description: "複数ページからデータをリスト形式で抽出するテンプレート",
    flowDefinition: {
      steps: [
        { type: "navigate", url: "{{list_url}}" },
        {
          type: "loop",
          selector: "{{item_selector}}",
          variable: "item",
          children: [
            {
              type: "extract",
              selector: "{{title_selector}}",
              variable: "title",
            },
            {
              type: "setVariable",
              name: "result_{{index}}",
              value: "{{title}}",
            },
          ],
        },
      ],
    },
    variables: { list_url: "", item_selector: "", title_selector: "" },
  },
];

/**
 * テンプレートを ID で取得
 */
export function getTemplateById(id: string): RobotTemplate | undefined {
  return ROBOT_TEMPLATES.find((t) => t.id === id);
}

/**
 * テンプレートのサマリーを取得（flowDefinition 除外）
 */
export function getTemplateSummaries() {
  return ROBOT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
}
