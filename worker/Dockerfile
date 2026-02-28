FROM node:20-slim

WORKDIR /app

# Install dependencies for Playwright Chromium + curl for health check
RUN apt-get update && apt-get install -y \
    curl \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Install only Chromium (skip Firefox/WebKit to save space)
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
