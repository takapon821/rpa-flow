# RPA Flow E2E Testing Guide

**Version**: 1.0.0
**Last Updated**: 2026-02-28
**Audience**: Deployment Verification Team (殿 included)

---

## Overview

This guide provides step-by-step instructions to verify that the entire RPA Flow platform is functioning correctly after all infrastructure setup is complete. It covers:

- ✅ Prerequisites validation (Git, DB, OAuth, Worker, Vercel)
- ✅ Service connectivity checks (Worker health, DB, Inngest)
- ✅ Core functionality testing (10+ end-to-end scenarios)
- ✅ Advanced features (webhooks, scheduling, retry/cancel)
- ✅ Debugging guide for common issues

**Estimated Time**: 30-45 minutes for full E2E test

**Success Criteria**: All 12 tests pass with expected results

---

## Part 1: Prerequisites Checklist

Complete ALL of the following before starting E2E tests. Each item should have a corresponding setup document.

### Git Setup
- [ ] GitHub repository is created and accessible
- [ ] `main` branch is protected with branch rules
- [ ] All code from Phase 1-3 is pushed to `main`
- [ ] `.env.local` is in `.gitignore` (secrets not committed)
- [ ] Verify with: `cd /mnt/c/Users/SPM伊藤隆史/Antigravity/rpa-flow && git log --oneline | head -5`

### Database (Neon)
- [ ] Neon PostgreSQL database is created
- [ ] `DATABASE_URL` environment variable is set in `.env.local`
- [ ] Drizzle migrations have been run: `npm run db:migrate`
- [ ] Tables exist: `users`, `robots`, `executions`, `execution_logs`, `apiKeys`, `webhooks`
- [ ] Verify with: `npm run db:studio` (should connect without errors)

### Google OAuth Setup
- [ ] Google Cloud Console project created
- [ ] OAuth 2.0 credentials configured (Web application type)
- [ ] Authorized redirect URIs configured:
  - `http://localhost:3000/api/auth/callback/google` (local dev)
  - `https://{VERCEL_URL}/api/auth/callback/google` (production)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local` and Vercel
- [ ] Verify by attempting login (see Test 1)

### Worker (Railway)
- [ ] Railway project created
- [ ] Worker deployed to Railway
- [ ] `WORKER_URL` is set (e.g., `https://rpa-flow-worker-prod.up.railway.app`)
- [ ] `WORKER_SECRET` is set to same value in API and Worker environments
- [ ] Worker has Playwright dependencies installed
- [ ] Verify with: `curl https://{WORKER_URL}/health`

### API Server (Vercel)
- [ ] Vercel project linked to GitHub repository
- [ ] All environment variables are configured in Vercel dashboard:
  - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
  - `DATABASE_URL`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `WORKER_URL`, `WORKER_SECRET`
  - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
  - `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`
- [ ] Deployment is successful (green checkmark on Vercel)
- [ ] URL accessible: `https://{VERCEL_URL}`
- [ ] Verify with: `curl https://{VERCEL_URL}/api/health` (or health endpoint if exists)

---

## Part 2: Service Connectivity Checks

These checks verify that all backend services are properly connected. Run these BEFORE starting functional tests.

### Check 1: Worker Health

```bash
curl https://{RAILWAY_WORKER_URL}/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-28T14:30:00Z"
}
```

**If Failed**:
- Check Worker logs in Railway dashboard
- Verify `WORKER_URL` environment variable matches deployed URL
- Ensure Worker has internet connectivity

---

### Check 2: Vercel → Neon DB Connection

1. Open Vercel Function logs:
   ```bash
   vercel logs --follow
   ```

2. Trigger a DB query (e.g., Test 1: Login)

3. **Expected**: No "database connection" or "ECONNREFUSED" errors

4. **If Failed**:
   - Check `DATABASE_URL` in Vercel environment
   - Verify Neon IP allowlist includes Vercel's IPs
   - Check Neon database status in console

---

### Check 3: Inngest Connection

1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Navigate to: **Apps** → find **rpa-flow**
3. **Expected**: Status shows **"Connected"** (green)
4. **If Not Connected**:
   - Verify `INNGEST_EVENT_KEY` in environment
   - Check if first `robot/execute` event has been sent
   - Re-deploy API if env vars recently changed

---

### Check 4: API → Worker Connectivity

```bash
curl -X POST https://{VERCEL_URL}/api/executions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {API_KEY}" \
  -d '{"robotId": "test-123"}'
```

**Expected Response**:
- `401` or `404` is acceptable (auth/robot not found)
- `500` indicates connection failure

**If Error**:
- Check Worker is running: `curl https://{WORKER_URL}/health`
- Verify `WORKER_URL` and `WORKER_SECRET` are set correctly
- Check API logs for "Worker error" messages

---

## Part 3: Core Functionality Tests

### Test 1: User Registration & Login

**Objective**: Verify Google OAuth login flow works

**Steps**:
1. Open `https://{VERCEL_URL}` in browser
2. You should see login page with "Googleでログイン" button
3. Click the button
4. Select/authenticate with Google account
5. After callback, you should be redirected to dashboard

**Expected Results**:
- ✅ Google login page appears
- ✅ User account is created in database
- ✅ Dashboard is displayed with "ようこそ、{ユーザー名}" greeting
- ✅ Navigation shows user profile in top-right

**Debug If Failed**:
- Check `NEXTAUTH_URL` matches current domain
- Verify Google OAuth credentials in env vars
- Check browser console for redirect/CORS errors
- Look at Vercel logs for auth errors

---

### Test 2: Robot Creation

**Objective**: Verify user can create a new robot

**Steps**:
1. On dashboard, click **「新しいロボット」** button
2. Enter robot name: `テストロボット`
3. Enter description: `E2E テスト用ロボット`
4. Click **「作成」**
5. You should be redirected to robot detail page

**Expected Results**:
- ✅ New robot page opens
- ✅ Robot appears in robots list
- ✅ Robot detail page shows all tabs: Overview, Editor, Schedule, Settings
- ✅ Status shows "draft"

**Debug If Failed**:
- Check database connection (Part 2, Check 2)
- Look for validation errors on form
- Check Vercel logs for 500 errors

---

### Test 3: Flow Editing

**Objective**: Verify flow editor works and flow is saved

**Steps**:
1. On robot detail page, click **「フローを編集」** or navigate to **Editor** tab
2. Click **「アクション追加」** button
3. Select action type: `navigate`
4. In config panel, set URL: `https://example.com`
5. Click **「保存」** button

**Expected Results**:
- ✅ Action node appears in editor canvas
- ✅ Node is connected to start node
- ✅ Config panel shows URL field with entered value
- ✅ "保存" button is clickable
- ✅ After save, "保存しました" toast appears
- ✅ Refresh page and flow persists

**Debug If Failed**:
- Check browser console for JavaScript errors
- Verify `flowDefinition` column exists in `robots` table
- Check database write permissions

---

### Test 4: Manual Execution & SSE Streaming

**Objective**: Verify robot execution starts and logs stream in real-time

**Prerequisites**: Robot must have at least one action (from Test 3)

**Steps**:
1. On robot detail page, click **「実行」** button
2. Confirm execution dialog if shown
3. You should be redirected to execution detail page
4. Watch for step logs appearing in real-time

**Expected Results**:
- ✅ Execution status changes from "queued" → "running" → "completed"
- ✅ Step logs appear one by one (SSE streaming)
- ✅ Each step shows: status icon, action type, timestamps
- ✅ Execution completes within reasonable time (< 30 sec)
- ✅ `completedAt` timestamp is set

**Debug If Failed**:
- Check Worker is running: `curl https://{WORKER_URL}/health`
- Look at Inngest dashboard for event delivery
- Check browser console for SSE connection errors
- Verify Vercel Functions `maxDuration` is set >= 60 seconds
- Check Vercel logs for Worker communication errors

---

### Test 5: Dashboard Statistics

**Objective**: Verify dashboard stats are updated after execution

**Steps**:
1. Navigate back to dashboard (click logo or "ダッシュボード")
2. Look at statistics cards

**Expected Results**:
- ✅ "総ロボット数" ≥ 1
- ✅ "今日の実行数" ≥ 1
- ✅ "平均実行時間" shows a number
- ✅ Recent executions list shows the execution from Test 4
- ✅ Execution status displays correctly

**Debug If Failed**:
- Check `GET /api/dashboard/stats` endpoint
- Verify aggregation queries in database
- Check Vercel logs for SQL errors

---

### Test 6: Scheduled Execution

**Objective**: Verify robot scheduling is configured and appears in Inngest

**Steps**:
1. On robot detail page, go to **スケジュール** tab
2. Click **「スケジュールを設定」**
3. Select schedule type: **「定期」** (Interval)
4. Select interval: **「毎日」** (Daily)
5. Set time: **「09:00」**
6. Click **「保存」**

**Expected Results**:
- ✅ Schedule saves without error
- ✅ Schedule display shows "毎日 09:00 (Asia/Tokyo)"
- ✅ In Inngest dashboard, scheduled job appears under "scheduled-robot-run"
- ✅ Next run time is correctly calculated

**Debug If Failed**:
- Check schedule validation logic
- Verify robot `schedule` column accepts JSON
- Look at Inngest dashboard for job creation
- Check timezone handling (should use Asia/Tokyo)

---

### Test 7: Webhook Notification

**Objective**: Verify webhook notifications are sent on execution completion

**Prerequisites**: Need external webhook receiver (webhook.site or similar)

**Steps**:
1. Open [webhook.site](https://webhook.site)
2. Copy your unique URL (shown at top)
3. In RPA Flow, go to **Settings** → **Webhooks**
4. Click **「Webhookを追加」**
5. Paste URL in webhook URL field
6. Select event: **「execution.completed」**
7. Click **「追加」**
8. Copy the shown **secret** somewhere safe
9. Run a robot (similar to Test 4)
10. Check webhook.site inbox

**Expected Results**:
- ✅ POST request appears in webhook.site with execution data
- ✅ Headers include:
  - `x-webhook-signature`: HMAC-SHA256 signature
  - `x-webhook-timestamp`: ISO timestamp
- ✅ Payload contains: `executionId`, `robotId`, `status`, `startedAt`, `completedAt`
- ✅ Signature can be verified with saved secret

**Debug If Failed**:
- Check webhook secret is being used for signature
- Verify webhook HTTP POST is being sent (Vercel logs)
- Check webhook URL is reachable from Vercel
- Verify event filtering logic (execution.completed)

---

### Test 8: API Key Generation & External Execution

**Objective**: Verify API key system works for external integrations

**Steps**:
1. Go to **Settings** → **API Keys**
2. Click **「新しいAPIキーを生成」**
3. Enter name: `E2E Test Key`
4. Click **「生成」**
5. Copy the shown full key (won't be shown again!)
6. Run this command in terminal:
   ```bash
   curl -X POST https://{VERCEL_URL}/api/executions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {COPIED_KEY}" \
     -d '{"robotId": "{ROBOT_ID_FROM_TEST_2}"}'
   ```

**Expected Response**:
```json
{
  "execution": {
    "id": "new-uuid",
    "robotId": "...",
    "status": "queued",
    "triggeredBy": "api"
  }
}
```

**Expected Results**:
- ✅ API key is generated and shown once
- ✅ Key has format: `rpa_...` with prefix
- ✅ curl command returns 201 with execution object
- ✅ Execution appears in executions list
- ✅ Dashboard shows execution in "最近の実行"

**Debug If Failed**:
- Verify API key hashing logic
- Check Bearer token parsing in `/api/executions` route
- Ensure `lastUsedAt` is being updated
- Look at Vercel logs for auth errors

---

### Test 9: Execution Cancellation

**Objective**: Verify running execution can be cancelled

**Prerequisites**: Robot with multiple long-running steps or with delays

**Steps**:
1. Create a robot with multiple steps (or use existing one)
2. Click **「実行」** to start execution
3. While status shows "running", click **「キャンセル」** button
4. Confirmation dialog appears - click **「キャンセルを確認」**
5. Status should change to "cancelled"

**Expected Results**:
- ✅ Cancel button appears only when status is "running"
- ✅ Confirmation dialog prevents accidental cancellation
- ✅ After confirmation, API call is made to `/api/executions/[id]/cancel`
- ✅ Status changes to "cancelled" immediately in UI
- ✅ Worker stops executing remaining steps
- ✅ Execution shows "cancelled" status in list

**Debug If Failed**:
- Check Worker has cancel endpoint: `POST /cancel/:executionId`
- Verify `cancelledExecutions` Set is being checked
- Look at Vercel logs for cancel API call
- Check Worker logs for cancellation handling
- Ensure DB status is updated to "cancelled"

---

### Test 10: Execution Retry

**Objective**: Verify failed execution can be retried

**Prerequisites**: Need a failed execution (create robot with failing action, or wait for real failure)

**Steps**:
1. Find a failed execution in execution list, or create one
2. Open execution detail page
3. If status is "failed" or "cancelled", **「再試行」** button appears
4. Click **「再試行」** button
5. A new execution should be created

**Expected Results**:
- ✅ Retry button appears only on failed/cancelled executions
- ✅ Click retry → new execution page opens
- ✅ New execution has different ID but same robotId
- ✅ New execution status is "queued"
- ✅ Both executions appear in executions list
- ✅ Original failed execution still exists (not deleted)

**Debug If Failed**:
- Check retry endpoint: `POST /api/executions/[id]/retry`
- Verify status validation (only failed/cancelled allowed)
- Ensure Inngest event is triggered for new execution
- Check router navigation after retry
- Look for API errors in Vercel logs

---

### Test 11: Robot Duplication

**Objective**: Verify robot can be cloned

**Steps**:
1. Go to robot detail page
2. Click **「複製」** button (or menu)
3. New robot should be created

**Expected Results**:
- ✅ New robot appears with name: `{Original} - コピー` (e.g., "テストロボット - コピー")
- ✅ Flow definition is copied (same actions)
- ✅ Schedule is copied
- ✅ New robot is accessible from robots list
- ✅ Executing copy doesn't affect original

**Debug If Failed**:
- Check duplicate route: `POST /api/robots/[id]/duplicate`
- Verify `flowDefinition` is being cloned correctly
- Check schedule copying logic
- Ensure new robotId is unique

---

### Test 12: Template-Based Robot Creation

**Objective**: Verify robots can be created from templates

**Prerequisites**: At least one template must exist

**Steps**:
1. Go to **「新しいロボット」** page
2. Look for **「テンプレートから作成」** option
3. Select a template
4. You should see template details
5. Customize name if desired
6. Click **「作成」**

**Expected Results**:
- ✅ Template selection page appears
- ✅ Selected template shows preview with its actions
- ✅ New robot is created with template's flow
- ✅ Robot can be immediately executed
- ✅ User can edit template-based flow

**Debug If Failed**:
- Check template system is implemented
- Verify templates endpoint: `GET /api/robots/templates`
- Check template-from route: `POST /api/robots/from-template`
- Ensure flow definition is copied from template

---

## Part 4: Advanced Features (Optional)

These tests are optional but recommended for full confidence:

### A. Notification Email (if email service configured)

```bash
# Run an execution, complete it successfully
# Check inbox for notification email
# Expected: Email contains execution summary, duration, status
```

### B. Multiple Concurrent Executions

```bash
# Create 3 robots
# Execute all 3 simultaneously
# Verify:
# - All executions appear in list
# - Dashboard stats show count = 3
# - No cross-contamination (exec1 doesn't affect exec2)
```

### C. Error Handling

```bash
# Create robot with invalid action config
# Try to execute
# Verify:
# - Execution fails gracefully
# - Error message appears in UI
# - Execution status = "failed"
# - Error message is descriptive
```

### D. SSE Reconnection

```bash
# Start execution
# Check execution detail page (SSE active)
# Pause network for 5 seconds
# Resume network
# Verify:
# - SSE reconnects
# - New logs appear
# - No duplicate entries
```

---

## Part 5: Debugging Guide

If any test fails, use this table to diagnose:

| Symptom | Likely Cause | Debug Steps |
|---------|------------|------------|
| **Can't login** | OAuth misconfiguration | 1. Check `GOOGLE_CLIENT_ID` in env<br>2. Verify redirect URI in Google Cloud Console<br>3. Check `NEXTAUTH_URL` matches domain<br>4. Look at Vercel logs for redirect errors |
| **Execution doesn't start** | Worker not responding | 1. `curl https://{WORKER_URL}/health`<br>2. Check Worker is deployed to Railway<br>3. Verify `WORKER_URL` env var<br>4. Check Worker logs in Railway dashboard |
| **SSE logs not streaming** | Vercel Functions timeout | 1. Check `maxDuration` in execution handler<br>2. Try shorter-running robot first<br>3. Look at Vercel logs for function timeout<br>4. Check `/api/executions/[id]/stream` endpoint |
| **Database errors (500)** | DB connection failed | 1. Verify `DATABASE_URL` in Vercel env<br>2. Check Neon IP allowlist<br>3. Run `npm run db:studio` locally<br>4. Check migrations: `npm run db:migrate` |
| **Webhooks not received** | Signature mismatch or timeout | 1. Check webhook secret matches<br>2. Verify URL is reachable from Vercel<br>3. Look at Vercel logs for POST errors<br>4. Check event filtering (execution.completed) |
| **API key auth fails (401)** | Key not found or wrong format | 1. Regenerate API key (can't view again)<br>2. Verify Bearer token format: `Bearer {key}`<br>3. Check key is stored correctly in DB<br>4. Look at `/api/executions` route for auth logic |
| **Inngest jobs not scheduled** | Event key misconfiguration | 1. Check `INNGEST_EVENT_KEY` in env<br>2. Verify in Inngest dashboard: Apps → rpa-flow → Connected<br>3. Try manual execution to trigger event<br>4. Check Vercel logs for Inngest errors |
| **Robot duplication fails** | Flow definition copy issue | 1. Verify `flowDefinition` is JSON in DB<br>2. Check duplicate endpoint copying all fields<br>3. Look at Vercel logs for 500 errors |
| **Performance slow** | Long-running steps or DB query | 1. Check robot step count<br>2. Monitor Worker memory/CPU (Railway)<br>3. Verify Neon database connection pool<br>4. Add indexes to frequently queried columns |
| **Retry/Cancel buttons missing** | Status field not updated | 1. Refresh execution detail page<br>2. Check DB execution status directly: `SELECT id, status FROM executions LIMIT 1`<br>3. Verify SSE is receiving status updates<br>4. Look at Worker executor for status transitions |

---

## Success Criteria Summary

All of the following must be true:

- ✅ All 12 tests pass
- ✅ No errors in Vercel logs
- ✅ No errors in Worker logs
- ✅ Inngest shows "Connected"
- ✅ Database queries work
- ✅ Webhooks are delivered
- ✅ API keys can authenticate requests
- ✅ SSE streaming works
- ✅ Execution lifecycle is: queued → running → completed/failed
- ✅ Retry creates new execution
- ✅ Cancel stops running execution

---

## Next Steps After E2E Testing

1. **Monitor for 24 hours**: Watch Vercel & Worker logs for errors
2. **Test with real data**: Create robots for actual use cases
3. **Load testing** (optional): Test with 10+ concurrent executions
4. **Security audit**: Review API key rotation, webhook signatures
5. **User acceptance testing**: Let actual users test workflows
6. **Documentation**: Update README with deployment steps

---

## Support & Questions

If you encounter issues not covered in this guide:

1. Check Vercel project settings (env vars, functions, deployments)
2. Check Railway Worker logs
3. Check Neon database status and query logs
4. Review `/src/app/api/` endpoints for implementation details
5. Check browser console for client-side errors
6. Contact development team with Vercel/Worker/Database logs

**Good luck with testing!** 🚀
