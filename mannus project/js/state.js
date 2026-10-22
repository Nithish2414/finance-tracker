// Central State Management for CampusSpend
const DEFAULT_CATEGORIES = [
  { id: "food", nameKey: "cat_food", icon: "🍜", color: "#ED6A4B", defaultBudget: 3500 },
  { id: "transport", nameKey: "cat_transport", icon: "🚌", color: "#AEC9D5", defaultBudget: 1200 },
  { id: "books", nameKey: "cat_books", icon: "📚", color: "#C69A53", defaultBudget: 1000 },
  { id: "entertainment", nameKey: "cat_entertainment", icon: "🎬", color: "#263A41", defaultBudget: 1500 },
  { id: "accommodation", nameKey: "cat_accommodation", icon: "🏠", color: "#13252D", defaultBudget: 4000 },
  { id: "groceries", nameKey: "cat_groceries", icon: "🛒", color: "#A5C4AE", defaultBudget: 1200 },
  { id: "shopping", nameKey: "cat_shopping", icon: "🛍️", color: "#C69A53", defaultBudget: 1000 },
  { id: "health", nameKey: "cat_health", icon: "💊", color: "#ED6A4B", defaultBudget: 600 },
  { id: "utilities", nameKey: "cat_utilities", icon: "📱", color: "#6D7B78", defaultBudget: 500 },
  { id: "other", nameKey: "cat_other", icon: "🏷️", color: "#AEC9D5", defaultBudget: 500 }
];

const DEFAULT_PROFILE = {
  name: "Arjun Sharma",
  email: "arjun.sharma@college.edu",
  university: "National Institute of Technology",
  year: "3rd Year (Semester 5)",
  monthlyAllowance: 15000,
  currency: "₹",
  soundEnabled: true,
  avatar: "🎓"
};

// Realistic college student sample transactions
const SAMPLE_TRANSACTIONS = [
  {
    id: "tx-1",
    title: "Campus Canteen - Dosa & Chai",
    amount: 140,
    category: "food",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hrs ago
    notes: "Breakfast with Rohan before lecture",
    type: "expense"
  },
  {
    id: "tx-2",
    title: "Metro Smart Card Recharge",
    amount: 500,
    category: "transport",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), // Yesterday
    notes: "Monthly student transit pass",
    type: "expense"
  },
  {
    id: "tx-3",
    title: "Data Structures & Algorithms Book",
    amount: 720,
    category: "books",
    paymentMethod: "pay_debit",
    date: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(), // 2 days ago
    notes: "Core reference book recommended by prof",
    type: "expense"
  },
  {
    id: "tx-4",
    title: "Weekend Movie & Popcorn with Roommates",
    amount: 650,
    category: "entertainment",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 76).toISOString(), // 3 days ago
    notes: "IMAX evening show",
    type: "expense"
  },
  {
    id: "tx-5",
    title: "Hostel Mess Advance / Share",
    amount: 2800,
    category: "food",
    paymentMethod: "pay_bank",
    date: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    notes: "Monthly lunch & dinner subscription",
    type: "expense"
  },
  {
    id: "tx-6",
    title: "Campus Xerox & Project Spiral Binding",
    amount: 180,
    category: "books",
    paymentMethod: "pay_cash",
    date: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(),
    notes: "OS and Networks lab manual copies",
    type: "expense"
  },
  {
    id: "tx-7",
    title: "Hostel Essentials & Toothpaste/Soap",
    amount: 320,
    category: "groceries",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 170).toISOString(),
    notes: "Supermarket run",
    type: "expense"
  },
  {
    id: "tx-8",
    title: "Campus Cafe Cappuccino & Sandwich",
    amount: 220,
    category: "food",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
    notes: "Study session break",
    type: "expense"
  },
  {
    id: "tx-9",
    title: "Hostel Room Electric Kettle Share",
    amount: 450,
    category: "accommodation",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString(),
    notes: "Winter hot water & Maggi share",
    type: "expense"
  },
  {
    id: "tx-10",
    title: "Auto Rickshaw from Station",
    amount: 120,
    category: "transport",
    paymentMethod: "pay_cash",
    date: new Date(Date.now() - 1000 * 60 * 60 * 280).toISOString(),
    notes: "Rainy evening ride back to hostel",
    type: "expense"
  },
  {
    id: "tx-11",
    title: "Monthly 5G Data Pack Recharge",
    amount: 299,
    category: "utilities",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 320).toISOString(),
    notes: "Unlimited 5G campus hotspot",
    type: "expense"
  },
  {
    id: "tx-12",
    title: "Mid-Term Project Stationery & Pen Set",
    amount: 210,
    category: "books",
    paymentMethod: "pay_cash",
    date: new Date(Date.now() - 1000 * 60 * 60 * 360).toISOString(),
    notes: "Highlighters and draft sheets",
    type: "expense"
  },
  {
    id: "tx-13",
    title: "Late Night Pizza Celebration",
    amount: 680,
    category: "food",
    paymentMethod: "pay_upi",
    date: new Date(Date.now() - 1000 * 60 * 60 * 400).toISOString(),
    notes: "After winning College Hackathon round!",
    type: "expense"
  }
];

class StateManager {
  constructor() {
    this.profile = this.loadProfile();
    this.categories = this.loadCategories();
    this.transactions = this.loadTransactions();
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
          return match ? { ...def, defaultBudget: match.budget ?? def.defaultBudget } : def;
        });
      }
    } catch (e) {}
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  }

  saveCategoryBudgets(budgetMap) {
    this.categories = this.categories.map(c => ({
      ...c,
      defaultBudget: budgetMap[c.id] !== undefined ? Number(budgetMap[c.id]) : c.defaultBudget
    }));
    const toSave = this.categories.map(c => ({ id: c.id, budget: c.defaultBudget }));
    localStorage.setItem("fincampus_categories", JSON.stringify(toSave));
  }

  loadTransactions() {
    try {
      const saved = localStorage.getItem("fincampus_transactions");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    // Seed initial realistic data
    this.saveTransactions(SAMPLE_TRANSACTIONS);
    return [...SAMPLE_TRANSACTIONS];
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
        amount: parseFloat(updatedFields.amount !== undefined ? updatedFields.amount : this.transactions[idx].amount)
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

  resetToSample() {
    this.transactions = [...SAMPLE_TRANSACTIONS];
    this.saveTransactions(this.transactions);
    this.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
    this.saveCategoryBudgets(
      DEFAULT_CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: c.defaultBudget }), {})
    );
  }

  clearAllData() {
    this.transactions = [];
    this.saveTransactions([]);
  }

  // --- Financial Calculations ---

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

  getTotalBudget() {
    return this.categories.reduce((sum, c) => sum + (Number(c.defaultBudget) || 0), 0);
  }

  getTotalSpentThisMonth() {
    const expenses = this.getCurrentMonthExpenses();
    return expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }

  getRemainingBudget() {
    const totalAllocated = this.getTotalBudget();
    const spent = this.getTotalSpentThisMonth();
    return totalAllocated - spent;
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
    return Math.max(1, totalDays - curDay);
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
    if (remaining <= 0) return 0;
    if (dailyAvg <= 0) return 99;
    return Math.round(remaining / dailyAvg);
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
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
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
    const totalBudget = this.getTotalBudget();
    const totalSpent = this.getTotalSpentThisMonth();
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
