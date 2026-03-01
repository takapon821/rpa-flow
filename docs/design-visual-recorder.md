# Visual Recorder - Technical Design Document

**Version**: 1.0.0
**Created**: 2026-03-01
**Designer**: Ashigaru 1 (Senior Software Engineer + Architecture Specialist)
**Phase**: Design (No Implementation Yet)

---

## Executive Summary

**Feature**: Visual Recorder - Interactive webpage preview with click-to-record action generation

**User Need**: While creating robots, users can open and interact with web pages visually, and clicks/form fills are automatically converted to RPA actions.

**Scope**:
- Core recording infrastructure (Worker-side page preview)
- Selector auto-generation from user clicks
- Action generation from UI interactions
- Session management and cleanup

**Recommended Approach**: **Hybrid Method (B + D)** - Screenshot streaming with DOM overlay for selector detection

**Estimated Effort**: 8-12 working days (2-3 ashigaru)
**Complexity**: Medium-High (browser automation + real-time streaming + precise selector generation)

---

## Part 1: Approach Comparison

### Method A: iframe Embed

**How it works**: Embed target website in `<iframe>` within RPA Flow editor

```html
<iframe src="https://example.com" id="preview"></iframe>
```

**Pros**:
- ✅ Simplest to implement (no server involvement)
- ✅ True real-time interaction (no latency)
- ✅ Native DOM access for selector generation
- ✅ Zero additional backend cost

**Cons**:
- ❌ **Same-Origin Policy**: Can't load cross-origin sites
- ❌ **X-Frame-Options** header prevents embedding
- ❌ **CSP restrictions**: Even same-origin may be blocked
- ❌ Not viable for most real-world websites (Google, AWS, etc.)

**Viable Only For**:
- Internal websites without security headers
- Development/test environments

---

### Method B: Playwright CDP + Screenshot Streaming (SSE/WebSocket)

**How it works**:
1. Worker opens browser via Playwright
2. Browser loads target URL
3. Worker captures screenshots at intervals (500ms)
4. Sends screenshots to frontend via SSE or WebSocket
5. Frontend displays as video stream

```typescript
// Worker side
const page = await browser.newPage();
await page.goto(url);

// Screenshot loop
while (sessionActive) {
  const screenshot = await page.screenshot({ fullPage: false });
  sendViaSSE(screenshot.toString('base64'));
  await sleep(500);
}
```

**Pros**:
- ✅ Works with ANY website (no CORS/CSP/X-Frame-Options issues)
- ✅ Full screenshot includes rendered content
- ✅ Existing Playwright setup already available
- ✅ Can use `page.locator()` for selector detection

**Cons**:
- ❌ High latency (0.5-1 second per frame)
- ❌ High bandwidth (screenshot = 100-300KB per frame)
- ❌ Not truly real-time interaction
- ❌ Vercel Edge Functions SSE has 30-60 second timeout
- ❌ CPU-intensive on Worker

**Implementation Complexity**: Medium (Playwright API is well-documented)

---

### Method C: DOM Mirroring (rrweb or Puppeteer RPC)

**How it works**:
1. Inject JavaScript into target page (via Playwright API)
2. JavaScript serializes DOM and events
3. Send DOM diff to frontend
4. Frontend reconstructs page in shadow DOM

```typescript
// Inject recorder script
await page.addInitScript(() => {
  // rrweb recorder
  rrweb.record({
    emit(event) {
      // Send to server
    }
  });
});
```

**Pros**:
- ✅ Low bandwidth (DOM diffs only)
- ✅ Better latency than screenshots
- ✅ Exact DOM structure for selector generation

**Cons**:
- ❌ Requires injecting JavaScript into page (complex, CSP violations)
- ❌ rrweb library overhead
- ❌ Complex event sync (form inputs, dynamically loaded content)
- ❌ Dependency on third-party library (rrweb)

**Viable**: No (too complex, too many edge cases)

---

### Method D: Hybrid - Screenshot + DOM Overlay

**How it works**:
1. Send screenshot as background image
2. Overlay clickable HTML elements on top (positioned exactly)
3. User clicks overlay element → server detects which element
4. Server queries DOM for that element's properties

```
┌─────────────────────────────┐
│  Screenshot (background)    │
├─────────────────────────────┤
│  Clickable Overlay          │ ← HTML elements over screenshot
│  (html, button, a, input)   │
└─────────────────────────────┘
```

**Pros**:
- ✅ Combines benefits of A (usability) and B (universality)
- ✅ Lower bandwidth than pure screenshots
- ✅ Real-time click detection
- ✅ Precise selector generation from DOM

**Cons**:
- ❌ Complex positioning logic
- ❌ Requires DOM coordinates ↔ screenshot coordinates mapping
- ❌ Responsive design challenges (layout shifts)

**Implementation Complexity**: High (precise positioning math required)

---

## Recommended Approach: **Hybrid (B + Simple D)**

**Decision**: Use **Method B (Screenshot + SSE)** with light **DOM metadata**

**Rationale**:
1. **Works everywhere**: No CORS/CSP issues
2. **User experience**: Screenshot provides visual context
3. **Selector detection**: Query page DOM when user clicks, don't try to overlay
4. **Simplicity**: Avoid complex overlay positioning
5. **Exists code**: Playwright + SSE already implemented

**Architecture**:
```
User clicks on screenshot
      ↓
Sends (x, y) coordinates to Worker
      ↓
Worker: document.elementFromPoint(x, y)
      ↓
Worker: Generate CSS selector
      ↓
Return selector to frontend
      ↓
Generate FlowStep action
```

---

## Part 2: System Architecture

### High-Level Overview

```
┌──────────────────────────────┐
│   Vercel (Next.js API)       │
│  /api/recorder/start         │ ← POST request
│  /api/recorder/:id/click     │ ← Click event
│  /api/recorder/:id/stream    │ ← SSE subscription
└──────────────────────────────┘
         │
         │ WORKER_SECRET auth
         │ JSON request/response
         ▼
┌──────────────────────────────┐
│    Railway Worker Express    │
│  /recorder/start             │ ← Start session
│  /recorder/:id/stream        │ ← Screenshot stream (SSE)
│  /recorder/:id/click         │ ← Handle click
│  /recorder/:id/type          │ ← Handle text input
│  /recorder/:id/stop          │ ← End session
└──────────────────────────────┘
         │
         │ Playwright CDP
         │ Browser control
         ▼
┌──────────────────────────────┐
│   Playwright Browser         │
│   (Chromium instance)        │
│                              │
│   ► Page: https://example.   │
│   ► Take screenshots         │
│   ► Execute DOM queries      │
│   ► Handle events            │
└──────────────────────────────┘
```

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  POST /api/recorder/start                                   │
│  { url: "https://example.com" }                             │
│                          ↓                                   │
│                   ┌──────────────┐                          │
│    Session ID ←──│  Initialize  │                          │
│                  │  Browser +    │                          │
│                  │  Navigate URL │                          │
│                  └──────────────┘                          │
│                          ↓                                   │
│                    GET /recorder/:id/stream                 │
│                    (SSE - screenshots)                      │
│                          ├─► Screenshot 1                   │
│                          ├─► Screenshot 2                   │
│                          ├─► ...                            │
│                          ↓                                   │
│              User interaction: Click/Type                   │
│                          ├─► POST /recorder/:id/click       │
│                          │   { x: 100, y: 200 }             │
│                          │   → Selector returned            │
│                          │                                   │
│                          ├─► POST /recorder/:id/type        │
│                          │   { value: "email@example.com" } │
│                          │   → Action generated             │
│                          ↓                                   │
│                POST /recorder/:id/stop                      │
│                (Close session, cleanup)                     │
│                          ↓                                   │
│            ┌─────────────────────────────────┐             │
│            │  Return recorded actions        │             │
│            │  [click, type, navigate, etc]   │             │
│            └─────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Worker API Specification

### 1. Start Recording Session

```http
POST /recorder/start
Authorization: Bearer {WORKER_SECRET}
Content-Type: application/json

{
  "url": "https://example.com",
  "viewport": {
    "width": 1280,
    "height": 720
  }
}

Response (201):
{
  "sessionId": "rec_20260301_abc123",
  "status": "ready",
  "url": "https://example.com",
  "viewport": { "width": 1280, "height": 720 },
  "createdAt": "2026-03-01T15:30:00Z"
}

Response (400):
{
  "error": "Invalid URL",
  "details": "..."
}

Response (503):
{
  "error": "No browser instances available",
  "details": "Concurrent session limit reached (max: 3)"
}
```

**Implementation Notes**:
- Create one Browser + Page per session
- Store in memory map: `Map<sessionId, { browser, page, createdAt }>`
- Set 5-minute inactivity timeout

---

### 2. Screenshot Stream (SSE)

```http
GET /recorder/{sessionId}/stream
Authorization: Bearer {WORKER_SECRET}
Accept: text/event-stream

Response (200):
event: screenshot
data: {"base64": "iVBORw0KGgoAAAANS...", "timestamp": "2026-03-01T15:30:05Z"}

event: screenshot
data: {"base64": "iVBORw0KGgoAAAANS...", "timestamp": "2026-03-01T15:30:06Z"}

...

event: done
data: {"reason": "user_requested"}
```

**Frame Rate**: 2 frames/second (500ms interval)
**Image Format**: PNG, base64 encoded
**Timeout**: 5 minutes total

---

### 3. Click Event

```http
POST /recorder/{sessionId}/click
Authorization: Bearer {WORKER_SECRET}
Content-Type: application/json

{
  "x": 100,
  "y": 200,
  "button": "left"
}

Response (200):
{
  "success": true,
  "element": {
    "tag": "button",
    "selector": "#submit-button",
    "alternativeSelectors": [
      "button[type='submit']",
      ".action-button"
    ],
    "text": "送信",
    "boundingBox": {
      "x": 85,
      "y": 195,
      "width": 80,
      "height": 40
    }
  },
  "action": {
    "type": "click",
    "selector": "#submit-button",
    "description": "送信ボタンをクリック"
  }
}

Response (400):
{
  "error": "Click outside viewport or element not found"
}
```

---

### 4. Text Input

```http
POST /recorder/{sessionId}/type
Authorization: Bearer {WORKER_SECRET}
Content-Type: application/json

{
  "selector": "input[name='email']",
  "value": "user@example.com",
  "clearFirst": true
}

Response (200):
{
  "success": true,
  "action": {
    "type": "type",
    "selector": "input[name='email']",
    "value": "{{email}}",
    "description": "メールアドレスを入力"
  }
}
```

---

### 5. Navigate to URL

```http
POST /recorder/{sessionId}/navigate
Authorization: Bearer {WORKER_SECRET}
Content-Type: application/json

{
  "url": "https://example.com/next-page"
}

Response (200):
{
  "success": true,
  "url": "https://example.com/next-page",
  "timestamp": "2026-03-01T15:30:30Z"
}
```

---

### 6. Get DOM Snapshot

```http
GET /recorder/{sessionId}/dom
Authorization: Bearer {WORKER_SECRET}

Response (200):
{
  "html": "<html><body>...</body></html>",
  "timestamp": "2026-03-01T15:30:30Z",
  "url": "https://example.com"
}
```

---

### 7. Stop Recording

```http
POST /recorder/{sessionId}/stop
Authorization: Bearer {WORKER_SECRET}
Content-Type: application/json

{
  "reason": "user_requested"
}

Response (200):
{
  "success": true,
  "sessionId": "rec_20260301_abc123",
  "duration": 125,
  "actions": [
    { "type": "click", "selector": "...", "description": "..." },
    { "type": "type", "selector": "...", "value": "...", "description": "..." }
  ]
}
```

---

## Part 4: Selector Auto-Generation Algorithm

### Core Logic Flow

```
User clicks at (x, y) on screenshot
     ↓
1. Get element via document.elementFromPoint(x, y)
     ↓
2. Generate CSS selector (priority order)
     ├─ ID selector: #element-id (if has unique id)
     ├─ Class selector: .class1.class2 (if classes exist)
     ├─ Attribute selector: input[name='email'] (if attribute exists)
     ├─ nth-child: div > button:nth-child(2)
     └─ XPath fallback: //button[text()='Submit']
     ↓
3. Validate selector works: page.locator(selector).count() > 0
     ↓
4. Generate description (from element text/placeholder/title)
     ↓
5. Return { selector, alternativeSelectors, description }
```

### Implementation Pseudocode

```typescript
async function generateSelector(x: number, y: number): Promise<SelectorResult> {
  // Step 1: Get element
  const element = await page.evaluate((x, y) => {
    return document.elementFromPoint(x, y);
  }, x, y);

  if (!element) {
    throw new Error("No element at coordinates");
  }

  // Step 2: Try ID selector (most specific)
  if (element.id) {
    const id = element.id.replace(/[^\w-]/g, ""); // Sanitize
    const selector = `#${id}`;
    if (await validateSelector(selector)) {
      return {
        selector,
        alternatives: [/* fallbacks */],
        text: element.textContent || element.placeholder,
        boundingBox: element.getBoundingClientRect()
      };
    }
  }

  // Step 3: Try data attributes (common in React)
  const dataTest = element.getAttribute("data-testid");
  if (dataTest) {
    const selector = `[data-testid="${dataTest}"]`;
    if (await validateSelector(selector)) {
      return { selector, alternatives: [/* fallbacks */], ... };
    }
  }

  // Step 4: Try name attribute (common in forms)
  const name = element.getAttribute("name");
  if (name && (element.tagName === "INPUT" || element.tagName === "SELECT")) {
    const selector = `[name="${name}"]`;
    if (await validateSelector(selector)) {
      return { selector, ... };
    }
  }

  // Step 5: Try class selectors
  const classes = element.className.split(" ").filter(c => c);
  if (classes.length > 0) {
    const selector = `.${classes.join(".")}`;
    if (await validateSelector(selector)) {
      return { selector, ... };
    }
  }

  // Step 6: Build nth-child selector (last resort)
  const selector = buildNthChildSelector(element);
  return { selector, alternatives: [/* fallbacks */], ... };
}

async function validateSelector(selector: string): Promise<boolean> {
  try {
    const count = await page.locator(selector).count();
    return count > 0 && count <= 3; // Prefer selectors matching 1-3 elements
  } catch {
    return false;
  }
}

function buildNthChildSelector(element: HTMLElement): string {
  // Build path from root to element
  // Example: div > div > button:nth-child(2)
  let current = element;
  const path: string[] = [];

  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;

    // Count position among siblings
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(current) + 1;
    const tag = current.tagName.toLowerCase();

    path.unshift(`${tag}:nth-child(${index})`);
    current = parent;
  }

  return path.join(" > ");
}
```

### Alternative Selectors (for robustness)

For each detected element, generate 2-3 alternative selectors:

```typescript
interface SelectorResult {
  selector: string;              // Primary selector
  alternativeSelectors: string[]; // Fallbacks
  description: string;           // Generated description
  element: {
    tag: string;
    text?: string;
    boundingBox: DOMRect;
  };
}

// Example
{
  selector: "#submit-button",
  alternativeSelectors: [
    "button[type='submit']",
    ".action-button",
    "form button:last-child"
  ],
  description: "送信ボタン",
  element: {
    tag: "BUTTON",
    text: "送信",
    boundingBox: { x: 85, y: 195, width: 80, height: 40 }
  }
}
```

---

## Part 5: Session Management

### Session Storage (In-Memory)

```typescript
interface RecorderSession {
  sessionId: string;
  browser: Browser;
  page: Page;
  url: string;
  createdAt: Date;
  lastActivityAt: Date;
  actions: RecordedAction[];
  viewport: { width: number; height: number };
}

const activeSessions = new Map<string, RecorderSession>();
```

### Lifecycle Management

```typescript
// Create session
function createSession(sessionId: string, browser: Browser, page: Page): RecorderSession {
  const session = {
    sessionId,
    browser,
    page,
    url: page.url(),
    createdAt: new Date(),
    lastActivityAt: new Date(),
    actions: [],
    viewport: { width: 1280, height: 720 }
  };
  activeSessions.set(sessionId, session);
  return session;
}

// Update activity (prevent timeout cleanup)
function updateActivity(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivityAt = new Date();
  }
}

// Cleanup (5-minute inactivity timeout)
async function cleanupInactiveSessions() {
  const now = new Date();
  const timeout = 5 * 60 * 1000; // 5 minutes

  for (const [sessionId, session] of activeSessions) {
    if (now.getTime() - session.lastActivityAt.getTime() > timeout) {
      await session.browser.close();
      activeSessions.delete(sessionId);
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupInactiveSessions, 60_000);
```

### Concurrency Limits

```typescript
const MAX_CONCURRENT_SESSIONS = 3; // Railway memory constraint

function canCreateSession(): boolean {
  return activeSessions.size < MAX_CONCURRENT_SESSIONS;
}

// In POST /recorder/start
if (!canCreateSession()) {
  return Response.json(
    { error: "No browser instances available" },
    { status: 503 }
  );
}
```

---

## Part 6: Frontend Communication Design

### API Proxy Layer (Next.js)

```
Frontend (React Component)
    ↓
Next.js API Route: /api/recorder/*
    ↓
Proxy to Worker with WORKER_SECRET authentication
    ↓
Worker endpoints
```

### Suggested Next.js API Routes

```
POST   /api/recorder/start          → POST /recorder/start
GET    /api/recorder/:id/stream     → GET /recorder/:id/stream (SSE proxy)
POST   /api/recorder/:id/click      → POST /recorder/:id/click
POST   /api/recorder/:id/type       → POST /recorder/:id/type
POST   /api/recorder/:id/navigate   → POST /recorder/:id/navigate
POST   /api/recorder/:id/stop       → POST /recorder/:id/stop
```

### Frontend Component Architecture

```
┌──────────────────────────────────────────────┐
│  VisualRecorder Component                    │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  URL Input Bar                       │   │
│  │  [https://example.com] [Go]          │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Screenshot Preview                  │   │
│  │  (with crosshair cursor)             │   │
│  │  (onClick: send click coordinates)   │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Right Sidebar                       │   │
│  │  - Recorded Actions List             │   │
│  │  - Selector Inspector               │   │
│  │  - Action Preview                   │   │
│  └──────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
```

### Event Flow (React Hooks)

```typescript
const VisualRecorder: React.FC<{ robotId: string }> = ({ robotId }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [actions, setActions] = useState<RecordedAction[]>([]);
  const [loading, setLoading] = useState(false);

  // Start recording
  const handleStartRecorder = async (url: string) => {
    setLoading(true);
    const response = await fetch("/api/recorder/start", {
      method: "POST",
      body: JSON.stringify({ url })
    });
    const { sessionId } = await response.json();
    setSessionId(sessionId);
    setLoading(false);

    // Subscribe to SSE stream
    subscribeToScreenshots(sessionId);
  };

  // Subscribe to screenshots
  const subscribeToScreenshots = (sessionId: string) => {
    const eventSource = new EventSource(`/api/recorder/${sessionId}/stream`);

    eventSource.addEventListener("screenshot", (event) => {
      const { base64 } = JSON.parse(event.data);
      setScreenshot(`data:image/png;base64,${base64}`);
    });

    eventSource.addEventListener("done", () => {
      eventSource.close();
    });
  };

  // Handle click on screenshot
  const handleScreenshotClick = async (e: MouseEvent) => {
    const rect = screenshotRef.current?.getBoundingClientRect();
    if (!rect || !sessionId) return;

    const x = (e.clientX - rect.left) * (screenshotWidth / rect.width);
    const y = (e.clientY - rect.top) * (screenshotHeight / rect.height);

    const response = await fetch(`/api/recorder/${sessionId}/click`, {
      method: "POST",
      body: JSON.stringify({ x, y })
    });

    const { action, element } = await response.json();
    setActions([...actions, action]);
  };

  return (
    <div>
      <input
        type="text"
        placeholder="URL"
        onKeyDown={(e) => e.key === 'Enter' && handleStartRecorder(e.currentTarget.value)}
      />
      <img
        ref={screenshotRef}
        src={screenshot}
        onClick={handleScreenshotClick}
        style={{ cursor: "crosshair" }}
      />
      <div>
        <h3>Recorded Actions:</h3>
        {actions.map((action, i) => (
          <div key={i}>
            {action.type}: {action.selector}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Part 7: Generated Action Data Format

### Action Structure

```typescript
interface RecordedAction {
  type: "click" | "type" | "navigate" | "select" | "extract";
  selector: string;
  value?: string;              // For type, select actions
  description?: string;        // Auto-generated human-readable
  alternativeSelectors?: string[];
  timestamp: string;
}
```

### Examples

```typescript
// Click action
{
  type: "click",
  selector: "#login-button",
  description: "ログインボタンをクリック",
  alternativeSelectors: ["button.btn-primary", "form button:last-child"],
  timestamp: "2026-03-01T15:30:30Z"
}

// Type action
{
  type: "type",
  selector: "input[name='email']",
  value: "{{userEmail}}",  // Variable placeholder
  description: "メールアドレスを入力",
  timestamp: "2026-03-01T15:30:35Z"
}

// Navigate action
{
  type: "navigate",
  selector: null,
  value: "https://example.com/next-page",
  description: "ページを遷移",
  timestamp: "2026-03-01T15:30:40Z"
}

// Extract action (future)
{
  type: "extract",
  selector: ".product-price",
  description: "商品価格を抽出",
  value: "{{price}}",
  timestamp: "2026-03-01T15:30:45Z"
}
```

### FlowStep Integration

```typescript
// Convert recorded action to FlowStep for executor
function recordedActionToFlowStep(action: RecordedAction, index: number): FlowStep {
  const baseFlowStep: FlowStep = {
    id: `recorded-${index}`,
    actionType: action.type,
    config: {
      selector: action.selector,
    }
  };

  if (action.type === "type") {
    baseFlowStep.config.value = action.value;
  }

  if (action.type === "navigate") {
    baseFlowStep.config.url = action.value;
  }

  return baseFlowStep;
}
```

---

## Part 8: Integration with Existing Codebase

### Integration Points

#### 1. Robot Editor (Edit Page)

**Current**: React Flow editor with action nodes
**Change**: Add "Visual Recorder" mode toggle

```typescript
// src/app/(dashboard)/robots/[id]/edit/page.tsx

export default function EditRobotPage() {
  const [recordingMode, setRecordingMode] = useState(false);

  return (
    <div>
      <button onClick={() => setRecordingMode(!recordingMode)}>
        {recordingMode ? "Edit Mode" : "Visual Recorder"}
      </button>

      {recordingMode ? (
        <VisualRecorder robotId={robotId} />
      ) : (
        <FlowEditor robotId={robotId} />
      )}
    </div>
  );
}
```

#### 2. FlowStep Type

**Current**: `FlowStep` has `actionType`, `config`
**Change**: Already compatible - recorded actions directly map to FlowSteps

#### 3. Executor (Worker)

**Current**: `executeAction()` handles click, type, navigate
**Change**: No changes needed - visual recorder generates same action format

#### 4. FlowEditor Component

**Current**: Nodes represent actions
**Change**: Add "Import from Recorder" button

```typescript
// In FlowEditor component
const handleImportRecordedActions = async (actions: RecordedAction[]) => {
  const nodes = actions.map((action, i) => ({
    id: `node-${i}`,
    type: "actionNode",
    position: { x: 0, y: i * 100 },
    data: {
      actionType: action.type,
      config: {
        selector: action.selector,
        ...(action.value && { value: action.value })
      },
      label: action.description
    }
  }));

  setNodes((prev) => [...prev, ...nodes]);
};
```

#### 5. Database Schema

**Current**: `flowDefinition: jsonb`
**Change**: No schema changes needed - stores FlowSteps as before

---

## Part 9: Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Screenshot quality/compression** | Visual lag, hard to click accurately | Adaptive quality: reduce if bandwidth saturated |
| **Playwright CDP timeout** | Session dies mid-recording | Heartbeat mechanism, extend timeout to 10min on activity |
| **Selector brittleness** | Generated selectors break on next page load | Store 3+ alternatives, frontend tries fallbacks |
| **Railway memory** | Can't support 3+ concurrent sessions | Implement queue system, reject with 503 |
| **SSE timeout (Vercel)** | Stream closes after 30-60s | Use WebSocket instead (requires upgrade) |
| **Coordinate mismatch** | Click on wrong element | Scale screenshot coords based on viewport size |
| **Dynamic page changes** | New elements appear, old selectors broken | Let users re-record modified sections |
| **JavaScript-heavy sites** | Page not fully loaded when recording starts | Add "wait for ready" option, configurable delay |

---

## Part 10: Effort & Complexity Estimation

### Work Breakdown

| Component | Effort | Complexity | Dependencies |
|-----------|--------|-----------|--------------|
| **Worker API (6 endpoints)** | 3-4 days | Medium | Playwright, Express |
| **Session management** | 1-2 days | Low | In-memory storage |
| **Selector generation** | 2-3 days | High | DOM traversal, CSS/XPath |
| **Screenshot streaming** | 1-2 days | Medium | SSE, base64 encoding |
| **Frontend React component** | 2-3 days | Medium | Canvas/image rendering |
| **Integration with editor** | 1-2 days | Low | FlowEditor component |
| **Testing & debugging** | 2-3 days | Medium | Multiple browsers |
| **Documentation** | 1 day | Low | - |
| **TOTAL** | **13-20 days** | **Medium-High** | |

### Team Recommendation

**Suggested Allocation**:
- **1 Senior Engineer** (Selector gen + Architecture) - 6-8 days
- **1 Mid-level Engineer** (Worker API + Frontend) - 8-10 days
- **1 QA** (Testing, edge cases) - 3-5 days

**Timeline**: 2-3 weeks with 2 engineers working in parallel

### Complexity Breakdown

```
Easy (1-2 days):
  - Session storage & cleanup
  - API integration (proxy routes)
  - Basic screenshot display

Medium (2-4 days):
  - SSE streaming setup
  - React component structure
  - Navigation/URL changes

Hard (4+ days):
  - Selector auto-generation algorithm
  - Coordinate transformation math
  - Multiple browser compatibility
  - Edge case handling (iframes, shadow DOM, etc)
```

---

## Part 11: Success Criteria & Next Steps

### MVP Success Criteria

- ✅ User can start recording for any URL
- ✅ Screenshots stream at 2 FPS in < 1 second latency
- ✅ Clicks generate CSS/XPath selectors automatically
- ✅ Generated actions can be imported into flow editor
- ✅ Imported actions execute correctly (via executor)
- ✅ Sessions cleanup properly after 5 min inactivity

### Post-MVP Features

- Text input with variable substitution
- Element extraction (scraping)
- Screenshot annotation (highlight clicked elements)
- Action editing/deletion in visual recorder
- Multiple page recording (chain of pages)
- Replay recorded session

### Decision Points for Shogun

1. **Method confirmation**: Approve Hybrid B+D approach?
2. **Budget check**: 2-3 weeks × 2-3 engineers acceptable?
3. **Timeline**: When to start implementation?
4. **Scope**: Include text input in MVP, or post-MVP?

---

## Part 12: References & Resources

### Documentation
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [document.elementFromPoint()](https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint)
- [CSS Selector Specificity](https://www.w3.org/TR/selectors-3/#specificity)
- [XPath Tutorial](https://www.w3schools.com/xml/xpath_intro.asp)

### Similar Tools
- [Selenium IDE](https://www.selenium.dev/selenium-ide/) - Browser recorder (reference implementation)
- [Cypress Test Recorder](https://cypress.io) - Test recording
- [Robotic Process Automation](https://en.wikipedia.org/wiki/Robotic_process_automation) - Industry standards

### Playwright Examples
```typescript
// Selector validation
const count = await page.locator('#button').count();

// Element from point (Playwright doesn't have direct equivalent, use evaluate)
const element = await page.evaluate((x, y) =>
  document.elementFromPoint(x, y)
, x, y);

// Screenshot
const screenshot = await page.screenshot();

// Bounding box
const box = await page.locator('#element').boundingBox();

// Wait for element
await page.waitForSelector('#target');
```

---

## Conclusion

Visual Recorder is a **high-impact, medium-complexity feature** that will significantly improve user experience for robot creation. The recommended **Hybrid B+D approach** balances implementation simplicity with universal website support.

**Next Phase**: Implementation (if approved by Shogun)

