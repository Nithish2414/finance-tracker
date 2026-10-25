import type { Config } from "@netlify/functions";
import { createHmac, pbkdf2, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, asc, desc, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appSettings, categories, transactions, users } from "../../db/schema.js";

type User = typeof users.$inferSelect;
type Category = typeof categories.$inferSelect;
type Transaction = typeof transactions.$inferSelect;

const pbkdf2Async = promisify(pbkdf2);
const TOKEN_EXPIRE_DAYS = 30;

class HttpError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

const json = (data: unknown, status = 200) => Response.json(data, { status });

// --- Default categories (mirrors the original Python seed) ---
const DEFAULT_CATEGORIES = [
  { code: "food", nameKey: "cat_food", icon: "🍜", color: "#ED6A4B", type: "expense" },
  { code: "transport", nameKey: "cat_transport", icon: "🚌", color: "#AEC9D5", type: "expense" },
  { code: "books", nameKey: "cat_books", icon: "📚", color: "#C69A53", type: "expense" },
  { code: "entertainment", nameKey: "cat_entertainment", icon: "🎬", color: "#263A41", type: "expense" },
  { code: "accommodation", nameKey: "cat_accommodation", icon: "🏠", color: "#13252D", type: "expense" },
  { code: "groceries", nameKey: "cat_groceries", icon: "🛒", color: "#A5C4AE", type: "expense" },
  { code: "shopping", nameKey: "cat_shopping", icon: "🛍️", color: "#C69A53", type: "expense" },
  { code: "health", nameKey: "cat_health", icon: "💊", color: "#ED6A4B", type: "expense" },
  { code: "utilities", nameKey: "cat_utilities", icon: "📱", color: "#6D7B78", type: "expense" },
  { code: "other", nameKey: "cat_other", icon: "🏷️", color: "#AEC9D5", type: "expense" },
  { code: "allowance", nameKey: "cat_inc_allowance", icon: "💰", color: "#10B981", type: "income" },
  { code: "freelance", nameKey: "cat_inc_freelance", icon: "💼", color: "#3B82F6", type: "income" },
  { code: "scholarship", nameKey: "cat_inc_scholarship", icon: "🎓", color: "#C69A53", type: "income" },
  { code: "stipend", nameKey: "cat_inc_stipend", icon: "💵", color: "#8B5CF6", type: "income" },
  { code: "gifts", nameKey: "cat_inc_gifts", icon: "🎁", color: "#ED6A4B", type: "income" },
  { code: "other_income", nameKey: "cat_inc_other", icon: "🏷️", color: "#6D7B78", type: "income" },
];

async function seedCategoriesForUser(userId: number) {
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, defaultBudget: 0 })))
    .onConflictDoNothing();
}

async function seedSampleTransactionsForUser(userId: number) {
  await db.delete(transactions).where(eq(transactions.userId, userId));
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const makeDate = (daysAgo: number, hour: number, minute: number) =>
    new Date(Date.UTC(y, m, Math.max(1, d - daysAgo), hour, minute));

  const samples = [
    { title: "Monthly Pocket Money / Allowance", amount: 15000, category: "allowance", paymentMethod: "pay_bank", date: new Date(Date.UTC(y, m, 1, 10, 0)), notes: "Allowance received from parents", type: "income" },
    { title: "Campus Canteen - Dosa & Chai", amount: 140, category: "food", paymentMethod: "pay_upi", date: makeDate(0, 9, 30), notes: "Breakfast before lecture", type: "expense" },
    { title: "Metro Smart Card Recharge", amount: 500, category: "transport", paymentMethod: "pay_upi", date: makeDate(1, 8, 15), notes: "Monthly student transit pass", type: "expense" },
    { title: "Data Structures & Algorithms Book", amount: 720, category: "books", paymentMethod: "pay_debit", date: makeDate(2, 16, 45), notes: "Core reference book recommended by prof", type: "expense" },
    { title: "Weekend Movie & Popcorn with Friends", amount: 650, category: "entertainment", paymentMethod: "pay_upi", date: makeDate(3, 19, 30), notes: "Evening cinema outing", type: "expense" },
  ];

  await db.insert(transactions).values(
    samples.map((s, idx) => ({ ...s, id: `tx-${userId}-${idx + 1}-${randomUUID().slice(0, 6)}`, userId })),
  );
}

// --- Auth helpers ---
let cachedSecret: string | null = null;

async function getSecret(): Promise<string> {
  if (process.env.SECRET_KEY) return process.env.SECRET_KEY;
  if (cachedSecret) return cachedSecret;
  // Generate a signing secret once and persist it, so tokens survive cold starts.
  await db
    .insert(appSettings)
    .values({ key: "token_secret", value: randomBytes(32).toString("hex") })
    .onConflictDoNothing();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "token_secret"));
  cachedSecret = row.value;
  return cachedSecret;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await pbkdf2Async(password, salt, 100000, 32, "sha256");
  return `${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  const [salt, keyHex] = hashed.split("$");
  if (!salt || !keyHex) return false;
  const key = await pbkdf2Async(password, salt, 100000, 32, "sha256");
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

async function createAccessToken(userId: number, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: String(userId), email, iat: now, exp: now + TOKEN_EXPIRE_DAYS * 86400 }));
  const sig = createHmac("sha256", await getSecret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

async function decodeAccessToken(token: string): Promise<{ sub: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", await getSecret()).update(`${header}.${payload}`).digest();
  const actual = Buffer.from(sig, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

async function getCurrentUser(req: Request): Promise<User> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Authentication credentials were not provided.");
  const payload = await decodeAccessToken(token);
  if (!payload?.sub) throw new HttpError(401, "Invalid or expired authentication token.");
  const [user] = await db.select().from(users).where(eq(users.id, Number(payload.sub)));
  if (!user) throw new HttpError(401, "User account not found.");
  return user;
}

// --- Serializers (snake_case to match the original API contract) ---
const profileOut = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  university: u.university,
  year: u.year,
  monthly_allowance: u.monthlyAllowance,
  currency: u.currency,
  sound_enabled: u.soundEnabled,
  avatar: u.avatar,
});

const categoryOut = (c: Category) => ({
  id: c.code,
  code: c.code,
  name_key: c.nameKey,
  icon: c.icon,
  color: c.color,
  type: c.type,
  default_budget: c.defaultBudget,
});

const transactionOut = (t: Transaction) => ({
  id: t.id,
  title: t.title,
  amount: t.amount,
  category: t.category,
  payment_method: t.paymentMethod,
  date: t.date.toISOString(),
  notes: t.notes ?? "",
  type: t.type,
  created_at: t.createdAt.toISOString(),
});

const tokenResponse = async (u: User) => ({
  access_token: await createAccessToken(u.id, u.email),
  token_type: "bearer",
  user: profileOut(u),
});

// --- Input helpers ---
async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") return body;
  } catch {}
  throw new HttpError(422, "Request body must be valid JSON.");
}

function parseDate(value: unknown): Date {
  const d = new Date(String(value));
  if (isNaN(d.getTime())) throw new HttpError(422, "Invalid date.");
  return d;
}

function parseAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(422, "Amount must be greater than 0.");
  return Math.round(n * 100) / 100;
}

const isUniqueViolation = (e: any) => e?.code === "23505" || e?.cause?.code === "23505";

// --- Route handlers ---
async function register(req: Request) {
  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email) throw new HttpError(422, "Email is required.");
  if (password.length < 4) throw new HttpError(422, "Password must be at least 4 characters.");

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new HttpError(400, "An account with this email already exists.");

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      name: String(body.name || "").trim() || "College Student",
      university: String(body.university || "").trim() || "University",
      year: body.year || "Semester 1",
      monthlyAllowance: body.monthly_allowance != null ? Number(body.monthly_allowance) || 0 : 15000,
      currency: body.currency || "₹",
    })
    .returning();
  await seedCategoriesForUser(user.id);
  return json(await tokenResponse(user), 201);
}

async function login(req: Request) {
  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(String(body.password || ""), user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password.");
  }
  return json(await tokenResponse(user));
}

async function demoLogin() {
  const demoEmail = "arjun.sharma@college.edu";
  let [user] = await db.select().from(users).where(eq(users.email, demoEmail));
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: demoEmail,
        passwordHash: await hashPassword("demopassword123"),
        name: "Arjun Sharma",
        university: "National Institute of Technology",
        year: "3rd Year",
        monthlyAllowance: 15000,
        currency: "₹",
      })
      .returning();
    await seedCategoriesForUser(user.id);
  }
  return json(await tokenResponse(user));
}

async function updateProfile(req: Request, user: User) {
  const body = await readBody(req);
  const updates: Partial<typeof users.$inferInsert> = {};
  if (body.name != null) updates.name = String(body.name);
  if (body.email != null) updates.email = String(body.email).trim().toLowerCase();
  if (body.university != null) updates.university = String(body.university);
  if (body.year != null) updates.year = String(body.year);
  if (body.monthly_allowance != null) updates.monthlyAllowance = Number(body.monthly_allowance) || 0;
  if (body.currency != null) updates.currency = String(body.currency);
  if (body.sound_enabled != null) updates.soundEnabled = Boolean(body.sound_enabled);
  if (body.avatar != null) updates.avatar = String(body.avatar);
  if (Object.keys(updates).length === 0) return json(profileOut(user));

  try {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
    return json(profileOut(updated));
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(400, "An account with this email already exists.");
    throw e;
  }
}

async function getUserCategories(userId: number, type?: string) {
  const where = type ? and(eq(categories.userId, userId), eq(categories.type, type)) : eq(categories.userId, userId);
  return db.select().from(categories).where(where).orderBy(asc(categories.id));
}

async function listCategories(url: URL, user: User) {
  const type = url.searchParams.get("category_type") || undefined;
  let list = await getUserCategories(user.id, type);
  if (list.length === 0) {
    await seedCategoriesForUser(user.id);
    list = await getUserCategories(user.id, type);
  }
  return json(list.map(categoryOut));
}

async function setBudgets(user: User, budgets: Record<string, number>) {
  const list = await getUserCategories(user.id);
  for (const c of list) {
    if (c.code in budgets) {
      c.defaultBudget = Math.max(0, Number(budgets[c.code]) || 0);
      await db.update(categories).set({ defaultBudget: c.defaultBudget }).where(eq(categories.id, c.id));
    }
  }
  return json(list.map(categoryOut));
}

async function updateBudgets(req: Request, user: User) {
  const body = await readBody(req);
  if (!body.budgets || typeof body.budgets !== "object") throw new HttpError(422, "budgets must be an object.");
  return setBudgets(user, body.budgets);
}

async function smartAllocation(user: User) {
  // 50/30/20 college rule: needs, wants, and savings/buffer.
  const allowance = user.monthlyAllowance || 15000;
  const shares: Record<string, number> = {
    food: 0.25, accommodation: 0.15, transport: 0.1, entertainment: 0.1, shopping: 0.1,
    groceries: 0.1, books: 0.1, health: 0.05, utilities: 0.05, other: 0,
  };
  const budgets = Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, Math.round(allowance * v)]));
  return setBudgets(user, budgets);
}

async function listTransactions(url: URL, user: User) {
  const p = url.searchParams;
  const conds: SQL[] = [eq(transactions.userId, user.id)];

  const search = p.get("search")?.trim();
  if (search) {
    const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    conds.push(or(ilike(transactions.title, term), ilike(transactions.notes, term))!);
  }
  const category = p.get("category");
  if (category && category !== "all") conds.push(eq(transactions.category, category));
  const payment = p.get("payment_method");
  if (payment && payment !== "all") conds.push(eq(transactions.paymentMethod, payment));
  const type = p.get("transaction_type");
  if (type && type !== "all") conds.push(eq(transactions.type, type));

  const now = new Date();
  const timeframe = p.get("timeframe") || "all";
  if (timeframe === "today") {
    conds.push(gte(transactions.date, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))));
  } else if (timeframe === "this_week") {
    conds.push(gte(transactions.date, new Date(now.getTime() - 7 * 86400000)));
  } else if (timeframe === "this_month") {
    conds.push(gte(transactions.date, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))));
  }

  const order = {
    date_asc: asc(transactions.date),
    amount_desc: desc(transactions.amount),
    amount_asc: asc(transactions.amount),
  }[p.get("sort_by") || ""] ?? desc(transactions.date);

  const rows = await db.select().from(transactions).where(and(...conds)).orderBy(order);
  return json(rows.map(transactionOut));
}

async function createTransaction(req: Request, user: User) {
  const body = await readBody(req);
  const title = String(body.title || "").trim();
  if (!title) throw new HttpError(422, "Title is required.");
  if (!body.category) throw new HttpError(422, "Category is required.");

  const [tx] = await db
    .insert(transactions)
    .values({
      id: randomUUID(),
      userId: user.id,
      title,
      amount: parseAmount(body.amount),
      category: String(body.category),
      paymentMethod: body.payment_method || "pay_upi",
      date: body.date ? parseDate(body.date) : new Date(),
      notes: String(body.notes || "").trim(),
      type: body.type || "expense",
    })
    .returning();
  return json(transactionOut(tx), 201);
}

async function findTransaction(id: string, user: User) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
  if (!tx) throw new HttpError(404, "Transaction not found.");
  return tx;
}

async function updateTransaction(req: Request, id: string, user: User) {
  await findTransaction(id, user);
  const body = await readBody(req);
  const updates: Partial<typeof transactions.$inferInsert> = {};
  if (body.title != null) updates.title = String(body.title);
  if (body.amount != null) updates.amount = parseAmount(body.amount);
  if (body.category != null) updates.category = String(body.category);
  if (body.payment_method != null) updates.paymentMethod = String(body.payment_method);
  if (body.date != null) updates.date = parseDate(body.date);
  if (body.notes != null) updates.notes = String(body.notes);
  if (body.type != null) updates.type = String(body.type);
  if (Object.keys(updates).length === 0) return json(transactionOut(await findTransaction(id, user)));

  const [tx] = await db
    .update(transactions)
    .set(updates)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning();
  return json(transactionOut(tx));
}

async function deleteTransaction(id: string, user: User) {
  await findTransaction(id, user);
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
  return json({ message: "Transaction deleted successfully", id });
}

async function exportCsv(user: User) {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.date));
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const currency = user.currency || "₹";
  const lines = [["ID", "Type", "Title", "Amount", "Currency", "Category", "Payment Method", "Date", "Notes"]];
  for (const t of rows) {
    lines.push([t.id, t.type, t.title, String(t.amount), currency, t.category, t.paymentMethod, t.date.toISOString(), t.notes]);
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Response(lines.map((l) => l.map(esc).join(",")).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=fincampus_transactions_${stamp}.csv`,
    },
  });
}

// --- Analytics ---
function monthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  return { now, start, daysInMonth, currentDay: now.getUTCDate() };
}

async function monthData(user: User) {
  const range = monthRange();
  const cats = await getUserCategories(user.id, "expense");
  const budgetSum = cats.reduce((s, c) => s + c.defaultBudget, 0);
  const monthlyBudget = budgetSum > 0 ? budgetSum : user.monthlyAllowance || 0;
  const txs = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), gte(transactions.date, range.start)));
  const expenses = txs.filter((t) => t.type === "expense");
  const spentByCat: Record<string, number> = {};
  for (const t of expenses) spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  return { ...range, cats, monthlyBudget, txs, expenses, spentByCat };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt0 = (n: number) => Math.round(n).toLocaleString("en-US");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

async function dashboardSummary(user: User) {
  const { currentDay, daysInMonth, cats, monthlyBudget, txs, expenses, spentByCat } = await monthData(user);
  const cur = user.currency;
  const daysLeft = Math.max(1, daysInMonth - currentDay);
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const moneyLeft = monthlyBudget + totalIncome - totalSpent;
  const dailyAvg = totalSpent / Math.max(1, currentDay);
  const runwayDays = moneyLeft <= 0 ? 0 : dailyAvg <= 0 ? 99 : Math.round(moneyLeft / dailyAvg);

  const alerts: any[] = [];
  let topCategory: any = null;
  let maxSpent = -1;
  for (const c of cats) {
    const spent = spentByCat[c.code] || 0;
    const budget = c.defaultBudget;
    if (spent > maxSpent && spent > 0) {
      maxSpent = spent;
      topCategory = { id: c.code, code: c.code, name_key: c.nameKey, icon: c.icon, color: c.color, spent, budget };
    }
    if (budget > 0) {
      const name = capitalize(c.code);
      if (spent > budget) {
        const over = spent - budget;
        alerts.push({
          type: "danger", icon: "⚠️", category: c.code,
          title: `Budget Exceeded: ${name}`,
          message: `Allocated ${cur} ${fmt0(budget)}, but spent ${cur} ${fmt0(spent)} (+${cur} ${fmt0(over)} over limit!)`,
          over_amount: over,
        });
      } else if (spent / budget >= 0.8) {
        alerts.push({
          type: "warning", icon: "⚡", category: c.code,
          title: `High Spending: ${name}`,
          message: `You've consumed ${Math.round((spent / budget) * 100)}% of your ${name} budget (${cur} ${fmt0(spent)} / ${cur} ${fmt0(budget)}).`,
          over_amount: 0,
        });
      }
    }
  }

  // Fast burn: more than 70% spent before half the month has passed.
  const monthProgressPct = (currentDay / daysInMonth) * 100;
  const spentPct = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  if (spentPct > 70 && monthProgressPct < 50) {
    alerts.unshift({
      type: "danger", icon: "🚨", category: "burn_rate",
      title: "High Burn Rate Alert!",
      message: `You have burned ${Math.round(spentPct)}% of your monthly funds in just ${currentDay} days! At this pace, funds may run out in ${runwayDays} days.`,
      over_amount: 0,
    });
  }

  const largest = expenses.reduce<Transaction | null>((m, t) => (!m || t.amount > m.amount ? t : m), null);

  return json({
    money_left: round2(moneyLeft),
    monthly_budget: round2(monthlyBudget),
    total_spent: round2(totalSpent),
    total_income: round2(totalIncome),
    daily_avg_spent: round2(dailyAvg),
    runway_days: runwayDays,
    days_left_in_month: daysLeft,
    active_alerts: alerts,
    top_category: topCategory,
    largest_expense: largest ? transactionOut(largest) : null,
  });
}

async function pacingCurve(user: User) {
  const { currentDay, daysInMonth, monthlyBudget, expenses } = await monthData(user);
  const idealDaily = daysInMonth > 0 ? monthlyBudget / daysInMonth : 0;
  const daily = new Array(daysInMonth + 1).fill(0);
  for (const t of expenses) daily[t.date.getUTCDate()] += t.amount;

  let running = 0;
  const points = [];
  for (let day = 1; day <= daysInMonth; day++) {
    let actual: number | null = null;
    if (day <= currentDay) {
      running += daily[day];
      actual = round2(running);
    }
    points.push({ day, label: `Day ${day}`, actual, ideal: round2(idealDaily * day) });
  }

  return json({
    points,
    current_day: currentDay,
    days_in_month: daysInMonth,
    ideal_daily_budget: round2(idealDaily),
    currency: user.currency || "₹",
  });
}

async function categorySpending(user: User) {
  const { cats, spentByCat } = await monthData(user);
  return json(
    cats.map((c) => {
      const spent = spentByCat[c.code] || 0;
      const budget = c.defaultBudget;
      const pct = budget > 0 ? (spent / budget) * 100 : 0;
      return {
        id: c.code, code: c.code, name_key: c.nameKey, icon: c.icon, color: c.color,
        budget,
        spent: round2(spent),
        remaining: round2(budget - spent),
        percent: Math.min(100, Math.round(pct)),
        raw_percent: Math.round(pct),
        is_exceeded: spent > budget && budget > 0,
        is_warning: pct >= 80 && pct <= 100,
      };
    }),
  );
}

// --- Router ---
async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method;

  if (path === "/api/health" && method === "GET") {
    return json({ status: "healthy", app: "Wally Student Finance Backend", version: "1.0.0" });
  }
  if (method === "POST" && path === "/api/auth/register") return register(req);
  if (method === "POST" && path === "/api/auth/login") return login(req);
  if (method === "POST" && path === "/api/auth/demo") return demoLogin();

  const user = await getCurrentUser(req);

  if (path === "/api/auth/me" && method === "GET") return json(profileOut(user));
  if (path === "/api/auth/profile" && method === "PUT") return updateProfile(req, user);

  if (path === "/api/categories" && method === "GET") return listCategories(url, user);
  if (path === "/api/categories/budgets" && method === "PUT") return updateBudgets(req, user);
  if (path === "/api/categories/smart-allocation" && method === "POST") return smartAllocation(user);

  if (path === "/api/transactions") {
    if (method === "GET") return listTransactions(url, user);
    if (method === "POST") return createTransaction(req, user);
  }
  if (path === "/api/transactions/export/csv" && method === "GET") return exportCsv(user);
  if (path === "/api/transactions/reset-sample" && method === "POST") {
    await seedSampleTransactionsForUser(user.id);
    return json({ message: "Sample transactions reloaded successfully." });
  }
  const txMatch = path.match(/^\/api\/transactions\/([^/]+)$/);
  if (txMatch) {
    const id = decodeURIComponent(txMatch[1]);
    if (method === "GET") return json(transactionOut(await findTransaction(id, user)));
    if (method === "PUT") return updateTransaction(req, id, user);
    if (method === "DELETE") return deleteTransaction(id, user);
  }

  if (path === "/api/analytics/summary" && method === "GET") return dashboardSummary(user);
  if (path === "/api/analytics/pacing" && method === "GET") return pacingCurve(user);
  if (path === "/api/analytics/category-spending" && method === "GET") return categorySpending(user);

  throw new HttpError(404, "Not Found");
}

export default async (req: Request) => {
  try {
    return await route(req);
  } catch (e) {
    if (e instanceof HttpError) return json({ detail: e.detail }, e.status);
    console.error("API error:", e);
    return json({ detail: "Internal server error." }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
