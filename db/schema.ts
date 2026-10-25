import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text().notNull().default("College Student"),
  university: text().notNull().default("University"),
  year: text().notNull().default("Semester 1"),
  monthlyAllowance: doublePrecision("monthly_allowance").notNull().default(15000),
  currency: text().notNull().default("₹"),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  avatar: text().notNull().default("🎓"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable(
  "categories",
  {
    id: serial().primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: text().notNull(),
    nameKey: text("name_key").notNull(),
    icon: text().notNull(),
    color: text().notNull(),
    type: text().notNull().default("expense"),
    defaultBudget: doublePrecision("default_budget").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_user_code_idx").on(t.userId, t.code)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text().primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    amount: doublePrecision().notNull(),
    category: text().notNull(),
    paymentMethod: text("payment_method").notNull().default("pay_upi"),
    date: timestamp({ withTimezone: true }).notNull().defaultNow(),
    notes: text().notNull().default(""),
    type: text().notNull().default("expense"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transactions_user_date_idx").on(t.userId, t.date)],
);

// Holds the auto-generated token signing secret so no manual env setup is needed.
export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});
