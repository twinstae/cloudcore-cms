import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// 시각은 밀리초 3자리 ISO 8601 UTC 문자열(toIsoMillis)로 저장한다.
export const tags = sqliteTable("cc_tag", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
