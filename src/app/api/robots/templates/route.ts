import { NextResponse } from "next/server";
import { getTemplateSummaries } from "@/lib/templates/robot-templates";

/**
 * GET /api/robots/templates
 * テンプレート一覧を取得（公開エンドポイント）
 * 認証不要、flowDefinition は除外してサマリーのみ返す
 */
export async function GET() {
  try {
    const templates = getTemplateSummaries();

    return NextResponse.json(
      {
        templates,
        message: "Templates retrieved successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
