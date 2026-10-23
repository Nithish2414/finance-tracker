// Central State Management for CampusSpend & Wally
const DEFAULT_CATEGORIES = [
  { id: "food", nameKey: "cat_food", icon: "🍜", color: "#ED6A4B", defaultBudget: 0 },
  { id: "transport", nameKey: "cat_transport", icon: "🚌", color: "#AEC9D5", defaultBudget: 0 },
  { id: "books", nameKey: "cat_books", icon: "📚", color: "#C69A53", defaultBudget: 0 },
  { id: "entertainment", nameKey: "cat_entertainment", icon: "🎬", color: "#263A41", defaultBudget: 0 },
  { id: "accommodation", nameKey: "cat_accommodation", icon: "🏠", color: "#13252D", defaultBudget: 0 },
  { id: "groceries", nameKey: "cat_groceries", icon: "🛒", color: "#A5C4AE", defaultBudget: 0 },
  { id: "shopping", nameKey: "cat_shopping", icon: "🛍️", color: "#C69A53", defaultBudget: 0 },
  { id: "health", nameKey: "cat_health", icon: "💊", color: "#ED6A4B", defaultBudget: 0 },
  { id: "utilities", nameKey: "cat_utilities", icon: "📱", color: "#6D7B78", defaultBudget: 0 },
  { id: "other", nameKey: "cat_other", icon: "🏷️", color: "#AEC9D5", defaultBudget: 0 }
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: "allowance", nameKey: "cat_inc_allowance", icon: "💰", color: "#10B981" },
  { id: "freelance", nameKey: "cat_inc_freelance", icon: "💼", color: "#3B82F6" },
  { id: "scholarship", nameKey: "cat_inc_scholarship", icon: "🎓", color: "#C69A53" },
  { id: "stipend", nameKey: "cat_inc_stipend", icon: "💵", color: "#8B5CF6" },
  { id: "gifts", nameKey: "cat_inc_gifts", icon: "🎁", color: "#ED6A4B" },
  { id: "other_income", nameKey: "cat_inc_other", icon: "🏷️", color: "#6D7B78" }
];

const DEFAULT_PROFILE = {
  name: "Student",
  email: "student@college.edu",
  university: "University / College",
  year: "1st Year",
  monthlyAllowance: 0,
  currency: "₹",
  soundEnabled: true,
  avatar: "🎓"
};

// Generates dynamic realistic college student sample transactions anchored to the current active month (only when user clicks 'Load Sample Data')
function getRealisticSampleTransactions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const curDay = now.getDate();

  const makeDate = (daysAgo, hour = 14, min = 30) => {
    const day = Math.max(1, curDay - daysAgo);
    return new Date(year, month, day, hour, min).toISOString();
  };

  return [
    {
      id: "tx-inc-1",
      title: "Monthly Pocket Money / Allowance",
      amount: 15000,
      category: "allowance",
      paymentMethod: "pay_bank",
      date: new Date(year, month, 1, 10, 0).toISOString(),
      notes: "Allowance received from parents",
      type: "income"
    },
    {
      id: "tx-1",
      title: "Campus Canteen - Dosa & Chai",
      amount: 140,
      category: "food",
      paymentMethod: "pay_upi",
      date: makeDate(0, 9, 30), // Today morning
      notes: "Breakfast before lecture",
      type: "expense"
    },
    {
      id: "tx-2",
      title: "Metro Smart Card Recharge",
      amount: 500,
      category: "transport",
      paymentMethod: "pay_upi",
      date: makeDate(1, 8, 15), // Yesterday
      notes: "Monthly student transit pass",
      type: "expense"
    },
    {
      id: "tx-3",
      title: "Data Structures & Algorithms Book",
      amount: 720,
      category: "books",
      paymentMethod: "pay_debit",
      date: makeDate(2, 16, 45), // 2 days ago
      notes: "Core reference book recommended by prof",
      type: "expense"
    },
    {
      id: "tx-4",
      title: "Weekend Movie & Popcorn with Friends",
      amount: 650,
      category: "entertainment",
      paymentMethod: "pay_upi",
      date: makeDate(3, 19, 30),
      notes: "Evening cinema outing",
      type: "expense"
    },
    {
      id: "tx-5",
      title: "Hostel Mess Advance / Share",
      amount: 2800,
      category: "food",
      paymentMethod: "pay_bank",
      date: makeDate(Math.min(curDay - 1, 5), 11, 0),
      notes: "Monthly meal subscription",
      type: "expense"
    },
    {
      id: "tx-6",
      title: "Campus Xerox & Project Printing",
      amount: 180,
      category: "books",
      paymentMethod: "pay_cash",
      date: makeDate(Math.min(curDay - 1, 6), 15, 20),
      notes: "Lab manual copies",
      type: "expense"
    },
    {
      id: "tx-7",
      title: "Hostel Essentials & Groceries",
      amount: 320,
      category: "groceries",
      paymentMethod: "pay_upi",
      date: makeDate(Math.min(curDay - 1, 8), 18, 10),
      notes: "Supermarket run",
      type: "expense"
    },
    {
      id: "tx-8",
      title: "Campus Cafe Coffee & Snack",
      amount: 220,
      category: "food",
      paymentMethod: "pay_upi",
      date: makeDate(Math.min(curDay - 1, 10), 17, 45),
      notes: "Study session break",
      type: "expense"
    },
    {
      id: "tx-9",
      title: "Hostel Room Appliance Share",
      amount: 450,
      category: "accommodation",
      paymentMethod: "pay_upi",
      date: makeDate(Math.min(curDay - 1, 12), 20, 0),
      notes: "Room utilities share",
      type: "expense"
    },
    {
      id: "tx-10",
      title: "Transit Auto Rickshaw",
      amount: 120,
      category: "transport",
      paymentMethod: "pay_cash",
      date: makeDate(Math.min(curDay - 1, 14), 21, 15),
      notes: "Ride back to campus",
      type: "expense"
    },
    {
      id: "tx-11",
      title: "Monthly 5G Data Pack Recharge",
      amount: 299,
      category: "utilities",
      paymentMethod: "pay_upi",
      date: makeDate(Math.min(curDay - 1, 16), 10, 30),
      notes: "Mobile data pack",
      type: "expense"
    },
    {
      id: "tx-12",
      title: "Stationery & Pen Set",
      amount: 210,
      category: "books",
      paymentMethod: "pay_cash",
      date: makeDate(Math.min(curDay - 1, 18), 14, 0),
      notes: "Draft sheets and pens",
      type: "expense"
    },
    {
      id: "tx-13",
      title: "Pizza Celebration with Roommates",
      amount: 680,
      category: "food",
      paymentMethod: "pay_upi",
      date: makeDate(Math.min(curDay - 1, 20), 22, 10),
      notes: "Weekend celebration",
      type: "expense"
    }
  ];
}

class StateManager {
  constructor() {
    // Clean initial zero reset for fresh user onboarding
    if (localStorage.getItem("fincampus_clean_zero_v1") !== "true") {
      localStorage.removeItem("fincampus_transactions");
      localStorage.removeItem("fincampus_categories");
      localStorage.removeItem("fincampus_profile");
      localStorage.setItem("fincampus_clean_zero_v1", "true");
    }

    this.profile = this.loadProfile();
    this.categories = this.loadCategories();
    this.incomeCategories = DEFAULT_INCOME_CATEGORIES.map(c => ({ ...c }));
    this.transactions = this.loadTransactions();
  }

  getCategory(id) {
    const exp = this.categories.find(c => c.id === id);
    if (exp) return exp;
    const inc = this.incomeCategories.find(c => c.id === id);
    if (inc) return inc;
    return {
      id: id || "other",
      nameKey: "cat_other",
      icon: "🏷️",
      color: "#6D7B78"
    };
  }

  loadProfile() {
    try {
      const saved = localStorage.getItem("fincampus_profile");
      return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : { ...DEFAULT_PROFILE };
    } catch (e) {
      return { ...DEFAULT_PROFILE };
    }
  }

  saveProfile(updated) {
    this.profile = { ...this.profile, ...updated };
    localStorage.setItem("fincampus_profile", JSON.stringify(this.profile));
  }

  loadCategories() {
    try {
      const saved = localStorage.getItem("fincampus_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        return DEFAULT_CATEGORIES.map(def => {
          const match = parsed.find(p => p.id === def.id);
          return match ? { ...def, defaultBudget: match.budget !== undefined ? Number(match.budget) : 0 } : { ...def, defaultBudget: 0 };
        });
      }
    } catch (e) {}
    return DEFAULT_CATEGORIES.map(c => ({ ...c, defaultBudget: 0 }));
  }

  saveCategoryBudgets(budgetMap) {
    this.categories = this.categories.map(c => ({
      ...c,
      defaultBudget: budgetMap[c.id] !== undefined ? Math.max(0, Number(budgetMap[c.id])) : c.defaultBudget
    }));
    const toSave = this.categories.map(c => ({ id: c.id, budget: c.defaultBudget }));
    localStorage.setItem("fincampus_categories", JSON.stringify(toSave));

    // Keep monthly allowance in sync with category total if category sum exceeds monthly allowance
    const totalAlloc = this.getTotalBudget();
    if (totalAlloc > 0 && (this.profile.monthlyAllowance === 0 || this.profile.monthlyAllowance < totalAlloc)) {
      this.profile.monthlyAllowance = totalAlloc;
      this.saveProfile({ monthlyAllowance: totalAlloc });
    }
  }

  loadTransactions() {
    try {
      const saved = localStorage.getItem("fincampus_transactions");
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    // Clean initial state: zero transactions
    this.saveTransactions([]);
    return [];
  }

  saveTransactions(txs) {
    this.transactions = txs;
    localStorage.setItem("fincampus_transactions", JSON.stringify(this.transactions));
  }

  addTransaction(tx) {
    const newTx = {
      id: "tx-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      title: tx.title.trim(),
      amount: parseFloat(tx.amount),
      category: tx.category,
      paymentMethod: tx.paymentMethod || "pay_upi",
      date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
      notes: (tx.notes || "").trim(),
      type: tx.type || "expense"
    };
    this.transactions.unshift(newTx);
    this.saveTransactions(this.transactions);
    return newTx;
  }

  updateTransaction(id, updatedFields) {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.transactions[idx] = {
        ...this.transactions[idx],
        ...updatedFields,
        amount: parseFloat(updatedFields.amount !== undefined ? updatedFields.amount : this.transactions[idx].amount),
        type: updatedFields.type || this.transactions[idx].type || "expense"
      };
      this.saveTransactions(this.transactions);
      return this.transactions[idx];
    }
    return null;
  }

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveTransactions(this.transactions);
  }

  // Reload realistic sample data on explicit user request
  resetToSample() {
    this.transactions = getRealisticSampleTransactions();
    this.saveTransactions(this.transactions);
    this.saveProfile({ monthlyAllowance: 15000 });
    this.applyPresetBudget("50_30_20");
  }

  // Reset everything back to complete zero
  clearAllData() {
    this.transactions = [];
    this.saveTransactions([]);
    this.categories = DEFAULT_CATEGORIES.map(c => ({ ...c, defaultBudget: 0 }));
    this.saveCategoryBudgets(
      DEFAULT_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {})
    );
    this.saveProfile({ monthlyAllowance: 0 });
  }

  importBackupData(backup) {
    if (!backup || typeof backup !== "object") {
      throw new Error("Invalid backup JSON format.");
    }
    if (backup.profile && typeof backup.profile === "object") {
      this.saveProfile(backup.profile);
    }
    if (Array.isArray(backup.categories)) {
      const budgetMap = {};
      backup.categories.forEach(c => {
        if (c.id && (c.budget !== undefined || c.defaultBudget !== undefined)) {
          budgetMap[c.id] = c.budget !== undefined ? c.budget : c.defaultBudget;
        }
      });
      this.saveCategoryBudgets(budgetMap);
    }
    if (Array.isArray(backup.transactions)) {
      this.saveTransactions(backup.transactions);
    }
    return true;
  }

  // --- Financial Calculations & Daily Tracking ---

  getCurrency() {
    return this.profile.currency || "₹";
  }

  formatMoney(num) {
    const val = Number(num) || 0;
    return `${this.getCurrency()} ${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  // Filters expenses for current month
  getCurrentMonthExpenses() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return this.transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
  }

  // Filters income for current month
  getCurrentMonthIncome() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return this.transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === "income" && d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
  }

  getTotalBudget() {
    return this.categories.reduce((sum, c) => sum + (Number(c.defaultBudget) || 0), 0);
  }

  getTotalSpentThisMonth() {
    const expenses = this.getCurrentMonthExpenses();
    return expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getTotalIncomeThisMonth() {
    const income = this.getCurrentMonthIncome();
    return income.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getRemainingBudget() {
    const totalAllocated = this.getTotalBudget();
    const spent = this.getTotalSpentThisMonth();
    const income = this.getTotalIncomeThisMonth();
    return totalAllocated + income - spent;
  }

  getDaysInCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }

  getCurrentDayOfMonth() {
    return new Date().getDate();
  }

  getDaysLeftInMonth() {
    const totalDays = this.getDaysInCurrentMonth();
    const curDay = this.getCurrentDayOfMonth();
    return Math.max(1, totalDays - curDay + 1);
  }

  getDailyAverageSpent() {
    const spent = this.getTotalSpentThisMonth();
    const daysElapsed = Math.max(1, this.getCurrentDayOfMonth());
    return spent / daysElapsed;
  }

  // Runway: At current spending rate, how many days will remaining money last?
  getStudentRunway() {
    const remaining = this.getRemainingBudget();
    const dailyAvg = this.getDailyAverageSpent();
    const totalBudget = this.getTotalBudget();
    if (totalBudget === 0) return 0;
    if (remaining <= 0) return 0;
    if (dailyAvg <= 0) return this.getDaysLeftInMonth();
    return Math.round(remaining / dailyAvg);
  }

  // --- Daily Usage Tracking Methods ---

  getTodayExpenses() {
    const todayStr = new Date().toDateString();
    return this.transactions.filter(t => t.type === "expense" && new Date(t.date).toDateString() === todayStr);
  }

  getTodayTotalSpent() {
    return this.getTodayExpenses().reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getYesterdayTotalSpent() {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toDateString();
    return this.transactions
      .filter(t => t.type === "expense" && new Date(t.date).toDateString() === yestStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getSafeDailyLimit() {
    const remaining = this.getRemainingBudget();
    const daysLeft = this.getDaysLeftInMonth();
    if (remaining <= 0) return 0;
    return Math.round(remaining / daysLeft);
  }

  getTodayBurnStatus() {
    const todaySpent = this.getTodayTotalSpent();
    const safeDailyLimit = this.getSafeDailyLimit();
    const remainingToday = Math.max(0, safeDailyLimit - todaySpent);
    const overSpentToday = Math.max(0, todaySpent - safeDailyLimit);
    const percentUsed = safeDailyLimit > 0 ? Math.round((todaySpent / safeDailyLimit) * 100) : (todaySpent > 0 ? 100 : 0);
    const isOverLimit = todaySpent > safeDailyLimit && safeDailyLimit > 0;
    const isWarning = todaySpent >= safeDailyLimit * 0.8 && !isOverLimit && safeDailyLimit > 0;

    return {
      todaySpent,
      safeDailyLimit,
      remainingToday,
      overSpentToday,
      percentUsed,
      isOverLimit,
      isWarning
    };
  }

  // --- Overall Budget Setting & Presets ---

  setMonthlyBudget(newAllowance, autoDistribute = false) {
    const amount = Math.max(0, parseFloat(newAllowance) || 0);
    this.profile.monthlyAllowance = amount;
    this.saveProfile({ monthlyAllowance: amount });

    // If current category total is 0, auto-distribute across categories
    const currentTotal = this.getTotalBudget();
    if ((currentTotal === 0 && amount > 0) || autoDistribute) {
      this.applyPresetBudget("50_30_20");
    }
  }

  applyPresetBudget(presetName = "50_30_20") {
    const totalAllowance = this.profile.monthlyAllowance || 15000;
    let ratios = {};

    if (presetName === "50_30_20") {
      // 50% Needs, 30% Wants, 20% Emergency
      ratios = {
        food: 0.25,
        accommodation: 0.20,
        transport: 0.08,
        books: 0.07,
        entertainment: 0.12,
        groceries: 0.08,
        shopping: 0.06,
        health: 0.04,
        utilities: 0.05,
        other: 0.05
      };
    } else if (presetName === "frugal") {
      // Strict / Frugal (65% Survival, 15% Fun, 20% Savings)
      ratios = {
        food: 0.28,
        accommodation: 0.22,
        transport: 0.07,
        books: 0.08,
        entertainment: 0.05,
        groceries: 0.10,
        shopping: 0.03,
        health: 0.05,
        utilities: 0.04,
        other: 0.08
      };
    } else if (presetName === "balanced") {
      // Balanced Campus Life
      ratios = {
        food: 0.23,
        accommodation: 0.18,
        transport: 0.08,
        books: 0.08,
        entertainment: 0.15,
        groceries: 0.08,
        shopping: 0.08,
        health: 0.04,
        utilities: 0.04,
        other: 0.04
      };
    } else if (presetName === "equal") {
      const share = 1 / this.categories.length;
      this.categories.forEach(c => { ratios[c.id] = share; });
    }

    const budgetMap = {};
    this.categories.forEach(c => {
      const share = ratios[c.id] || 0.10;
      budgetMap[c.id] = Math.round(totalAllowance * share);
    });

    this.saveCategoryBudgets(budgetMap);
    return budgetMap;
  }

  getCategorySpending() {
    const expenses = this.getCurrentMonthExpenses();
    const spendingMap = {};
    this.categories.forEach(c => {
      spendingMap[c.id] = 0;
    });
    expenses.forEach(t => {
      if (spendingMap[t.category] !== undefined) {
        spendingMap[t.category] += Number(t.amount);
      } else {
        spendingMap["other"] = (spendingMap["other"] || 0) + Number(t.amount);
      }
    });

    return this.categories.map(cat => {
      const spent = spendingMap[cat.id] || 0;
      const budget = Number(cat.defaultBudget) || 0;
      const remaining = budget - spent;
      const percent = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);
      const isExceeded = spent > budget && budget > 0;
      const isWarning = percent >= 80 && !isExceeded;
      return {
        ...cat,
        spent,
        budget,
        remaining,
        percent: Math.min(100, Math.round(percent)),
        rawPercent: Math.round(percent),
        isExceeded,
        isWarning
      };
    });
  }

  // Active Warnings System
  getActiveAlerts() {
    const alerts = [];
    const totalBudget = this.getTotalBudget();
    const totalSpent = this.getTotalSpentThisMonth();

    // Friendly call-to-action when user has not set budget yet
    if (totalBudget === 0) {
      alerts.push({
        type: "warning",
        icon: "🎯",
        actionSlide: "budget",
        title: "No Budget Configured Yet",
        message: "Your monthly allowance is currently 0. Click below to set your budget allocations and unlock real-time daily safe spending tracking!"
      });
      return alerts;
    }

    const catStats = this.getCategorySpending();
    
    // Check for category over-budget
    catStats.forEach(cat => {
      if (cat.isExceeded) {
        const overAmt = cat.spent - cat.budget;
        alerts.push({
          type: "danger",
          icon: "⚠️",
          category: cat.id,
          title: `Budget Exceeded: ${getTranslation(cat.nameKey)}`,
          message: `Allocated ${this.formatMoney(cat.budget)}, but you spent ${this.formatMoney(cat.spent)} (+${this.formatMoney(overAmt)} over limit!)`,
          overAmount: overAmt
        });
      } else if (cat.isWarning) {
        alerts.push({
          type: "warning",
          icon: "⚡",
          category: cat.id,
          title: `High Spending: ${getTranslation(cat.nameKey)}`,
          message: `You've used ${cat.rawPercent}% of your ${getTranslation(cat.nameKey)} budget (${this.formatMoney(cat.spent)} / ${this.formatMoney(cat.budget)}).`,
          overAmount: 0
        });
      }
    });

    // Check fast pacing / burn rate
    const dayOfMonth = this.getCurrentDayOfMonth();
    const daysInMonth = this.getDaysInCurrentMonth();
    const monthProgressPercent = (dayOfMonth / daysInMonth) * 100;
    const spentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    if (spentPercent > 70 && monthProgressPercent < 50) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        title: "High Burn Rate Alert!",
        message: `You have burned ${Math.round(spentPercent)}% of your monthly funds in just ${dayOfMonth} days! At this pace, you may run out of funds in ${this.getStudentRunway()} days.`
      });
    }

    // Daily safe limit alert if today exceeds safe burn rate
    const todayStatus = this.getTodayBurnStatus();
    if (todayStatus.isOverLimit && todayStatus.todaySpent > 0) {
      alerts.push({
        type: "warning",
        icon: "⚡",
        title: "Daily Spend Limit Exceeded Today",
        message: `You spent ${this.formatMoney(todayStatus.todaySpent)} today (+${this.formatMoney(todayStatus.overSpentToday)} above your safe daily target of ${this.formatMoney(todayStatus.safeDailyLimit)}/day).`
      });
    }

    return alerts;
  }

  getTopCategory() {
    const catStats = this.getCategorySpending();
    const sorted = [...catStats].sort((a, b) => b.spent - a.spent);
    return sorted[0] && sorted[0].spent > 0 ? sorted[0] : null;
  }

  getLargestExpense() {
    const expenses = this.getCurrentMonthExpenses();
    if (!expenses.length) return null;
    return expenses.reduce((max, t) => (Number(t.amount) > Number(max.amount) ? t : max), expenses[0]);
  }
}

// Global state instance
const store = new StateManager();
