export const MIGRATION_TABLES = [
  "ebooks",
  "plans",
  "profiles",
  "user_roles",
  "subscribers",
  "workout_logs",
  "ebook_reading_progress",
  "payment_webhook_events",
] as const;

export type MigrationTable = (typeof MIGRATION_TABLES)[number];

export const MIGRATION_BUCKETS = ["ebook-covers", "ebook-pdfs"] as const;
export type MigrationBucket = (typeof MIGRATION_BUCKETS)[number];
