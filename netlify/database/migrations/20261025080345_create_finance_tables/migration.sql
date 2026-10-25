CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"name_key" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"default_budget" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"amount" double precision NOT NULL,
	"category" text NOT NULL,
	"payment_method" text DEFAULT 'pay_upi' NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"name" text DEFAULT 'College Student' NOT NULL,
	"university" text DEFAULT 'University' NOT NULL,
	"year" text DEFAULT 'Semester 1' NOT NULL,
	"monthly_allowance" double precision DEFAULT 15000 NOT NULL,
	"currency" text DEFAULT '₹' NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"avatar" text DEFAULT '🎓' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_code_idx" ON "categories" ("user_id","code");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" ("user_id","date");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;