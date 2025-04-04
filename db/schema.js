
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import test from "node:test";
//import { text } from "stream/consumers";

export const todosTable = pgTable("todos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  todo: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});
