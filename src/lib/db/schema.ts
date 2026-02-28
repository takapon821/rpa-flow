import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified"),
  role: text("role", { enum: ["admin", "member", "viewer"] })
    .notNull()
    .default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Auth.js required tables ────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [uniqueIndex("provider_account_idx").on(t.provider, t.providerAccountId)]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [uniqueIndex("verification_token_idx").on(t.identifier, t.token)]
);

// ── Robots ─────────────────────────────────────────
export const robots = pgTable(
  "robots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    flowDefinition: jsonb("flow_definition").notNull().default({}),
    variables: jsonb("variables").default({}),
    schedule: jsonb("schedule"),
    status: text("status", {
      enum: ["draft", "active", "paused", "archived"],
    })
      .notNull()
      .default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("robots_owner_idx").on(t.ownerId)]
);

// ── Robot Steps (denormalized for direct querying) ─
export const robotSteps = pgTable(
  "robot_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    robotId: uuid("robot_id")
      .notNull()
      .references(() => robots.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    actionType: text("action_type").notNull(),
    config: jsonb("config").notNull().default({}),
  },
  (t) => [index("steps_robot_idx").on(t.robotId)]
);

// ── Executions ─────────────────────────────────────
export const executions = pgTable(
  "executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    robotId: uuid("robot_id")
      .notNull()
      .references(() => robots.id, { onDelete: "cascade" }),
    triggeredBy: text("triggered_by", {
      enum: ["manual", "schedule", "api", "webhook"],
    }).notNull(),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("queued"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("executions_robot_idx").on(t.robotId),
    index("executions_status_idx").on(t.status),
  ]
);

// ── Execution Logs ─────────────────────────────────
export const executionLogs = pgTable(
  "execution_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    actionType: text("action_type").notNull(),
    status: text("status", {
      enum: ["running", "completed", "failed", "skipped"],
    }).notNull(),
    screenshotUrl: text("screenshot_url"),
    outputData: jsonb("output_data"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("logs_execution_idx").on(t.executionId)]
);

// ── Output Files ───────────────────────────────────
export const outputFiles = pgTable(
  "output_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executions.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileUrl: text("file_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("files_execution_idx").on(t.executionId)]
);

// ── API Keys ───────────────────────────────────────
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("api_keys_user_idx").on(t.userId)]
);

// ── Webhooks ───────────────────────────────────────
export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    events: jsonb("events").notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("webhooks_user_idx").on(t.userId)]
);

// ── Notification Settings ──────────────────────────
export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    robotId: uuid("robot_id").references(() => robots.id, {
      onDelete: "cascade",
    }),
    channel: text("channel", {
      enum: ["email", "slack", "webhook"],
    }).notNull(),
    config: jsonb("config").notNull().default({}),
    onSuccess: boolean("on_success").notNull().default(false),
    onFailure: boolean("on_failure").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)]
);
