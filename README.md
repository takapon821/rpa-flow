# rpa-flow - RPA Execution Platform

A modern RPA (Robotic Process Automation) platform built with Next.js, featuring real-time execution monitoring, API key management, and a comprehensive workflow engine.

## Overview

rpa-flow enables users to:
- **Create and manage RPA robots** with visual workflow builders
- **Execute automations** on a distributed worker system (Railway)
- **Monitor execution in real-time** with SSE streaming logs
- **Manage API access** with API keys for programmatic access
- **Configure webhooks** for event-driven integrations
- **Track execution history** with detailed logging and error handling

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React, Tailwind CSS
- **Backend**: Next.js Route Handlers, PostgreSQL (Neon), Drizzle ORM
- **Worker**: Node.js service (Railway) for RPA execution with Playwright
- **Real-time**: Server-Sent Events (SSE), Redis (Upstash), Inngest
- **Auth**: Auth.js (NextAuth.js) with Google OAuth
- **Storage**: Vercel Blob for file uploads
- **Email**: Resend for notifications

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- GitHub account (for repository cloning)
- Environment variables configured (see .env.example)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rpa-flow.git
   cd rpa-flow
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd worker && npm install && cd ..
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys and URLs
   ```

4. **Run development servers**
   ```bash
   # Main app (http://localhost:3000)
   npm run dev

   # In another terminal, start the worker (http://localhost:3001)
   cd worker && npm run dev
   ```

## Environment Variables

See `.env.example` for a complete list. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (Neon) |
| `AUTH_SECRET` | NextAuth.js secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `WORKER_URL` | Worker service endpoint |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Inngest workflow orchestration |
| `UPSTASH_REDIS_REST_*` | Redis cache for real-time updates |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage |
| `RESEND_API_KEY` | Email notifications |

## Project Structure

```
rpa-flow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (/api/*)
│   │   ├── (dashboard)/       # Dashboard pages (authenticated)
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks (e.g., useExecutionStream)
│   ├── lib/
│   │   ├── auth.ts           # Auth.js configuration
│   │   ├── db/               # Database schema & client
│   │   └── inngest/          # Inngest function definitions
│   └── types/                # TypeScript type definitions
├── worker/                     # Separate Node.js worker service
│   ├── src/
│   │   └── engine/           # RPA execution engine
│   └── package.json          # Worker dependencies
├── .env.example              # Environment variable template
├── .gitignore               # Git ignore patterns
└── package.json             # Main app dependencies
```

## Key Features

### API Key Management
- Generate secure API keys via the Settings page
- Use keys to trigger robot executions from external systems
- Track API key usage with lastUsedAt timestamps
- Delete keys when no longer needed

**Example API call:**
```bash
curl -X POST http://localhost:3000/api/executions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"robotId": "robot-123", "inputData": {}}'
```

### Real-time Execution Logs
- Server-Sent Events (SSE) streaming for live execution updates
- Automatic log fetching via `useExecutionStream` hook
- Support for Redis polling (Upstash) with database fallback
- 5-minute connection timeout with automatic cleanup

### Robot Templates & Actions
Supported RPA actions include:
- File operations: csvRead, csvWrite, excelRead, excelWrite
- Web automation: login, click, type, navigate
- Download handling: fileDownload with automatic browser management
- Variable substitution: {{variable}} syntax support

## Development

### Build & Type Checking
```bash
npm run build
```

Ensure TypeScript strict mode compliance (no `any` types).

### Running Tests
```bash
npm run test
```

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration for code consistency
- Prettier for formatting

## Deployment

### Vercel (Frontend)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy (automatic on push to main)

### Railway (Worker)
1. Create a new service on Railway connected to GitHub
2. Set environment variables (DATABASE_URL, WORKER_SECRET, etc.)
3. Deploy worker service
4. Update WORKER_URL in main app environment variables

## API Endpoints

### Authentication
- `GET /api/auth/signin` - Sign in page
- `GET /api/auth/signout` - Sign out

### API Keys
- `GET /api/keys` - List user's API keys
- `POST /api/keys` - Create new API key
- `DELETE /api/keys/[id]` - Delete API key

### Executions
- `POST /api/executions` - Trigger robot execution (session or API key auth)
- `GET /api/executions/[id]/stream` - Real-time execution logs (SSE)

### Robots
- `GET /api/robots` - List user's robots
- `POST /api/robots` - Create robot
- `PUT /api/robots/[id]` - Update robot
- `DELETE /api/robots/[id]` - Delete robot

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please open an issue on GitHub.
