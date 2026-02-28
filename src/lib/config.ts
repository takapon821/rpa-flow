function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function optional(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

export const config = {
  db: {
    url: required("DATABASE_URL"),
  },
  auth: {
    secret: required("AUTH_SECRET"),
    googleId: required("AUTH_GOOGLE_ID"),
    googleSecret: required("AUTH_GOOGLE_SECRET"),
  },
  worker: {
    url: optional("WORKER_URL", "http://localhost:3001"),
    secret: required("WORKER_SECRET"),
  },
  redis: {
    url: optional("UPSTASH_REDIS_REST_URL"),
    token: optional("UPSTASH_REDIS_REST_TOKEN"),
  },
  blob: {
    token: optional("BLOB_READ_WRITE_TOKEN"),
  },
  app: {
    url: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  },
} as const;
