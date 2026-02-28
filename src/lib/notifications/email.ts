import { Resend } from "resend";

export interface ExecutionNotificationData {
  executionId: string;
  robotName: string;
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  stepCount: number;
  errorMessage?: string;
}

export async function sendExecutionNotification(
  to: string,
  data: ExecutionNotificationData
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[NOTIFICATION] RESEND_API_KEY not set. Skipping email notification.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const subject =
    data.status === "completed"
      ? `✅ ロボット「${data.robotName}」の実行が完了しました`
      : `❌ ロボット「${data.robotName}」の実行が失敗しました`;

  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? "noreply@rpa-flow.app";

  const body =
    data.status === "completed"
      ? `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 8px; }
          .detail { margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ 実行完了</h2>
          </div>
          <div class="content">
            <p>ロボット「<strong>${data.robotName}</strong>」の実行が完了しました。</p>
            <div class="detail">
              <span class="label">実行ID:</span> ${data.executionId}
            </div>
            <div class="detail">
              <span class="label">開始時刻:</span> ${new Date(data.startedAt).toLocaleString("ja-JP")}
            </div>
            <div class="detail">
              <span class="label">完了時刻:</span> ${new Date(data.completedAt).toLocaleString("ja-JP")}
            </div>
            <div class="detail">
              <span class="label">ステップ数:</span> ${data.stepCount}
            </div>
          </div>
        </div>
      </body>
    </html>
  `
      : `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 8px; }
          .detail { margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
          .error { color: #dc2626; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>❌ 実行失敗</h2>
          </div>
          <div class="content">
            <p>ロボット「<strong>${data.robotName}</strong>」の実行が失敗しました。</p>
            <div class="detail">
              <span class="label">実行ID:</span> ${data.executionId}
            </div>
            <div class="detail">
              <span class="label">開始時刻:</span> ${new Date(data.startedAt).toLocaleString("ja-JP")}
            </div>
            <div class="detail">
              <span class="label">失敗時刻:</span> ${new Date(data.completedAt).toLocaleString("ja-JP")}
            </div>
            <div class="detail">
              <span class="label">エラー:</span> <span class="error">${data.errorMessage ?? "不明"}</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: body,
    });
    console.log(`[NOTIFICATION] Email sent to ${to} for execution ${data.executionId}`);
  } catch (error) {
    console.error(`[NOTIFICATION] Failed to send email to ${to}:`, error);
    // Don't throw - notification failure should not stop execution
  }
}
