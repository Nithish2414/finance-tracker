// CampusSpend Core Application Coordinator
class App {
  constructor() {
    this.currentSlide = "dashboard";
    this.audioCtx = null;
    this.editingTxId = null;
    this.searchQuery = "";
    this.filterCategory = "all";
    this.filterPayment = "all";
    this.filterTimeframe = "this_month";
    this.sortBy = "date_desc";
  }

  init() {
    // Load saved language
    const savedLang = localStorage.getItem("fincampus_lang") || "en";
    setLanguage(savedLang);

    // Initialize UI and listeners
    this.bindNavigation();
    this.bindAddForm();
    this.bindTransactionFilters();
    this.bindModals();
    this.bindProfileSettings();
    this.bindCalendarControls();

    // Populate initial views
    this.renderAll();

    // Setup window resize handler for charts
    window.addEventListener("resize", () => {
      chartMgr.updateAll();
    });

    console.log("CampusSpend App Initialized Successfully.");
  }

  // --- Sound Effects using Web Audio API ---
  playHapticSound(type = "click") {
    if (!store.profile.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "alert") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        // Subtle soft click
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Audio might fail if user hasn't interacted yet
    }
  }

  // --- Navigation & Slide Switching ---
  bindNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
      btn.addEventListener("click", e => {
        const targetSlide = btn.getAttribute("data-slide");
        if (targetSlide) {
          this.switchSlide(targetSlide);
          this.playHapticSound("click");
        }
      });
    });

    // Quick action to Add from header / dashboard
    const quickAddBtns = document.querySelectorAll(".btn-quick-add");
    quickAddBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.switchSlide("add");
        this.playHapticSound("click");
      });
    });

    // View all transactions shortcut
    const viewAllBtn = document.getElementById("btnViewAllTransactions");
    if (viewAllBtn) {
      viewAllBtn.addEventListener("click", () => {
        this.switchSlide("transactions");
        this.playHapticSound("click");
      });
    }
  }

  switchSlide(slideId) {
    this.currentSlide = slideId;

    // Update active nav button
    document.querySelectorAll(".nav-btn").forEach(btn => {
      if (btn.getAttribute("data-slide") === slideId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Show active slide section with smooth transition
    document.querySelectorAll(".slide-section").forEach(sec => {
      if (sec.id === `slide-${slideId}`) {
        sec.classList.add("active");
        sec.style.display = "block";
      } else {
        sec.classList.remove("active");
        sec.style.display = "none";
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Refresh charts if entering dashboard or analytics
    if (slideId === "dashboard") {
      setTimeout(() => {
        chartMgr.renderSpendingOverview();
        chartMgr.renderCategoryDonut();
        calendarMgr.render();
      }, 50);
    } else if (slideId === "analytics") {
      setTimeout(() => {
        chartMgr.renderDailyTrend();
        chartMgr.renderWeeklyTrend();
        chartMgr.renderDayDistribution();
        this.renderAnalyticsSummary();
      }, 50);
    } else if (slideId === "transactions") {
      this.renderTransactions();
    } else if (slideId === "budget") {
      this.renderBudgetSliders();
    } else if (slideId === "profile") {
      this.renderProfileView();
    }
  }

  // --- Toast Notification ---
  showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type} animate-slide-up`;
    toast.innerHTML = `
      <span class="toast-icon">${type === "success" ? "✓" : "⚠️"}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // --- Render All Views ---
  renderAll() {
    this.renderHeader();
    this.renderDashboard();
    this.renderTransactions();
    this.renderCategorySelectors();
    this.renderAnalyticsSummary();
    this.renderBudgetSliders();
    this.renderProfileView();
    applyTranslations();
  }

  renderHeader() {
    const studentNameEl = document.getElementById("headerStudentName");
    const allowanceBadge = document.getElementById("headerAllowanceBadge");
    const avatarEl = document.getElementById("headerAvatar");

    if (studentNameEl) studentNameEl.textContent = store.profile.name;
    if (avatarEl) avatarEl.textContent = store.profile.avatar || "🎓";
    if (allowanceBadge) {
      allowanceBadge.textContent = `${getTranslation("stat_remaining")}: ${store.formatMoney(store.getRemainingBudget())}`;
    }
  }

  // --- 1. Dashboard Render ---
  renderDashboard() {
    const remainingVal = store.getRemainingBudget();
    const totalAllocated = store.getTotalBudget();
    const totalSpent = store.getTotalSpentThisMonth();
    const dailyAvg = store.getDailyAverageSpent();
    const runwayDays = store.getStudentRunway();
    const daysLeftInMonth = store.getDaysLeftInMonth();

    // Stats Cards
    const elRemaining = document.getElementById("dashRemainingMoney");
    const elBudget = document.getElementById("dashMonthlyBudget");
    const elSpent = document.getElementById("dashTotalSpent");
    const elDailyAvg = document.getElementById("dashDailyAvg");
    const elRunway = document.getElementById("dashRunwayDays");
    const elRunwayDesc = document.getElementById("dashRunwayDesc");

    if (elRemaining) {
      elRemaining.textContent = store.formatMoney(remainingVal);
      elRemaining.className = "stat-value " + (remainingVal < 0 ? "text-danger" : remainingVal < totalAllocated * 0.2 ? "text-warning" : "text-success");
    }
    if (elBudget) elBudget.textContent = store.formatMoney(totalAllocated);
    if (elSpent) elSpent.textContent = store.formatMoney(totalSpent);
    if (elDailyAvg) elDailyAvg.textContent = store.formatMoney(dailyAvg) + " / day";
    
    if (elRunway) {
      elRunway.textContent = `${runwayDays} days`;
      if (runwayDays < daysLeftInMonth) {
        elRunway.className = "stat-value text-danger";
      } else {
        elRunway.className = "stat-value text-success";
      }
    }
    if (elRunwayDesc) {
      elRunwayDesc.textContent = `${daysLeftInMonth} ${getTranslation("stat_days_left")}`;
    }

    // Render Warnings / Alert Hub
    this.renderDashboardAlerts();

    // Render Recent Spending Box (latest 5)
    this.renderRecentSpending();

    // Charts & Calendar
    chartMgr.renderSpendingOverview();
    chartMgr.renderCategoryDonut();
    calendarMgr.render();
  }

  renderDashboardAlerts() {
    const container = document.getElementById("dashboardAlertsHub");
    if (!container) return;

    const alerts = store.getActiveAlerts();

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="alert-banner alert-safe">
          <div class="alert-banner-icon">✨</div>
          <div class="alert-banner-content">
            <strong>${getTranslation("warning_title")}</strong>
            <p>${getTranslation("warning_safe")}</p>
          </div>
          <span class="badge badge-success">Healthy Balance</span>
        </div>
      `;
      return;
    }

    let html = "";
    alerts.forEach(alert => {
      html += `
        <div class="alert-banner alert-${alert.type} animate-pulse-subtle">
          <div class="alert-banner-icon">${alert.icon}</div>
          <div class="alert-banner-content">
            <strong>${alert.title}</strong>
            <p>${alert.message}</p>
          </div>
          <button class="btn btn-sm btn-outline alert-action-btn" onclick="app.switchSlide('budget')">
            Adjust Budget
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderRecentSpending() {
    const container = document.getElementById("recentSpendingList");
    if (!container) return;

    const recents = store.transactions.slice(0, 5);

    if (recents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${getTranslation("no_recent_transactions")}</p>
          <button class="btn btn-sm btn-primary" onclick="app.switchSlide('add')">+ Add First Expense</button>
        </div>
      `;
      return;
    }

    let html = "";
    recents.forEach(tx => {
      const cat = store.getCategory(tx.category);
      const formattedDate = new Date(tx.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      html += `
        <div class="recent-item-card">
          <div class="recent-icon" style="background: ${cat.color}22; color: ${cat.color};">
            ${cat.icon}
          </div>
          <div class="recent-details">
            <h4 class="recent-title">${tx.title}</h4>
            <div class="recent-sub">
              <span>${getTranslation(cat.nameKey)}</span>
              <span>•</span>
              <span>${getTranslation(tx.paymentMethod || 'pay_upi')}</span>
              <span>•</span>
              <span class="recent-date">${formattedDate}</span>
            </div>
          </div>
          <div class="recent-amount-col">
            <span class="recent-amount ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
              ${tx.type === 'income' ? '+' : '-'}${store.formatMoney(tx.amount)}
            </span>
            <div class="recent-actions">
              <button class="action-icon-btn" onclick="app.openEditModal('${tx.id}')" title="Edit">✎</button>
              <button class="action-icon-btn delete" onclick="app.deleteTx('${tx.id}')" title="Delete">🗑</button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // --- 2. Transactions Render ---
  bindTransactionFilters() {
    const searchInput = document.getElementById("txSearchInput");
    const catSelect = document.getElementById("txFilterCategory");
    const paySelect = document.getElementById("txFilterPayment");
    const dateSelect = document.getElementById("txFilterDate");
    const sortSelect = document.getElementById("txSortBy");
    const exportBtn = document.getElementById("btnExportCsv");

    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderTransactions();
      });
    }

    if (catSelect) {
      catSelect.addEventListener("change", e => {
        this.filterCategory = e.target.value;
        this.renderTransactions();
      });
    }

    if (paySelect) {
      paySelect.addEventListener("change", e => {
        this.filterPayment = e.target.value;
        this.renderTransactions();
      });
    }

    if (dateSelect) {
      dateSelect.addEventListener("change", e => {
        this.filterTimeframe = e.target.value;
        this.renderTransactions();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", e => {
        this.sortBy = e.target.value;
        this.renderTransactions();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportToCSV();
      });
    }
  }

  renderTransactions() {
    const listContainer = document.getElementById("transactionsTableBody");
    const countBadge = document.getElementById("txCountBadge");
    const totalFilteredEl = document.getElementById("txTotalFiltered");
    if (!listContainer) return;

    let items = [...store.transactions];

    // 1. Search Query filter
    if (this.searchQuery) {
      items = items.filter(
        t =>
          t.title.toLowerCase().includes(this.searchQuery) ||
          (t.notes && t.notes.toLowerCase().includes(this.searchQuery))
      );
    }

    // 2. Category filter
    if (this.filterCategory !== "all") {
      items = items.filter(t => t.category === this.filterCategory);
    }

    // 3. Payment method filter
    if (this.filterPayment !== "all") {
      items = items.filter(t => t.paymentMethod === this.filterPayment);
    }

    // 4. Timeframe filter
    const now = new Date();
    if (this.filterTimeframe === "today") {
      const todayStr = now.toDateString();
      items = items.filter(t => new Date(t.date).toDateString() === todayStr);
    } else if (this.filterTimeframe === "this_week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      items = items.filter(t => new Date(t.date) >= oneWeekAgo);
    } else if (this.filterTimeframe === "this_month") {
      items = items.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    }

    // 5. Sorting
    if (this.sortBy === "date_desc") {
      items.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (this.sortBy === "date_asc") {
      items.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (this.sortBy === "amount_desc") {
      items.sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (this.sortBy === "amount_asc") {
      items.sort((a, b) => Number(a.amount) - Number(b.amount));
    }

    // Update summary counts
    const totalAmt = items.reduce((sum, t) => sum + Number(t.amount), 0);
    if (countBadge) countBadge.textContent = `${items.length} records`;
    if (totalFilteredEl) totalFilteredEl.textContent = store.formatMoney(totalAmt);

    if (items.length === 0) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6" class="text-center empty-tx-row">
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <p>${getTranslation("no_transactions_found")}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    items.forEach(tx => {
      const cat = store.getCategory(tx.category);
      const formattedDate = new Date(tx.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const formattedTime = new Date(tx.date).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      });

      html += `
        <tr class="tx-table-row">
          <td class="tx-td-date">
            <span class="tx-date-main">${formattedDate}</span>
            <span class="tx-date-time">${formattedTime}</span>
          </td>
          <td class="tx-td-desc">
            <div class="tx-title-bold">${tx.title}</div>
            ${tx.notes ? `<div class="tx-notes-small">📝 ${tx.notes}</div>` : ""}
          </td>
          <td class="tx-td-cat">
            <span class="cat-pill" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}44;">
              ${cat.icon} ${getTranslation(cat.nameKey)}
            </span>
          </td>
          <td class="tx-td-pay">
            <span class="pay-method-badge">${getTranslation(tx.paymentMethod || 'pay_upi')}</span>
          </td>
          <td class="tx-td-amount">
            <span class="tx-amt ${tx.type === 'income' ? 'text-success' : 'text-white'}">
              ${tx.type === 'income' ? '+' : ''}${store.formatMoney(tx.amount)}
            </span>
          </td>
          <td class="tx-td-actions">
            <button class="btn btn-xs btn-outline" onclick="app.openEditModal('${tx.id}')">
              ${getTranslation('btn_edit')}
            </button>
            <button class="btn btn-xs btn-danger-outline" onclick="app.deleteTx('${tx.id}')">
              ${getTranslation('btn_delete')}
            </button>
          </td>
        </tr>
      `;
    });

    listContainer.innerHTML = html;
  }

  deleteTx(id) {
    if (confirm(getTranslation("confirm_delete"))) {
      store.deleteTransaction(id);
      this.playHapticSound("alert");
      this.showToast("Transaction removed");
      this.renderAll();
    }
  }

  exportToCSV() {
    if (!store.transactions.length) {
      alert("No transactions to export.");
      return;
    }

    const headers = ["ID", "Title", "Amount", "Currency", "Category", "PaymentMethod", "Date", "Notes", "Type"];
    const rows = store.transactions.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount,
      store.getCurrency(),
      t.category,
      t.paymentMethod || "pay_upi",
      t.date,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
      t.type || "expense"
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CampusSpend_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.playHapticSound("success");
    this.showToast("CSV Exported successfully!");
  }

  // --- 3. Add Amount (Expense / Income) View ---
  renderCategoryGrid(type = "expense") {
    const addCatContainer = document.getElementById("addCategoryGrid");
    if (!addCatContainer) return;

    const isIncome = type === "income";
    const list = isIncome ? store.incomeCategories : store.categories;

    let gridHtml = "";
    list.forEach((cat, index) => {
      gridHtml += `
        <div class="category-choice-card ${index === 0 ? 'selected' : ''}" data-cat-id="${cat.id}">
          <div class="cat-choice-icon" style="background: ${cat.color}22; color: ${cat.color};">${cat.icon}</div>
          <span class="cat-choice-label">${getTranslation(cat.nameKey)}</span>
        </div>
      `;
    });
    addCatContainer.innerHTML = gridHtml;

    addCatContainer.querySelectorAll(".category-choice-card").forEach(card => {
      card.addEventListener("click", () => {
        addCatContainer.querySelectorAll(".category-choice-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        this.playHapticSound("click");
      });
    });
  }

  renderPresetButtons(type = "expense") {
    const container = document.getElementById("presetButtonsGroup");
    const amountInput = document.getElementById("addAmountInput");
    if (!container) return;

    const isIncome = type === "income";
    const presets = isIncome
      ? [
          { val: 500, label: "+500 Gift/Reward" },
          { val: 1000, label: "+1,000 Freelance/Gig" },
          { val: 2000, label: "+2,000 Pocket Money" },
          { val: 5000, label: "+5,000 Monthly Allowance" },
          { val: 10000, label: "+10,000 Semester Grant" }
        ]
      : [
          { val: 50, label: "+50 Chai/Snack" },
          { val: 120, label: "+120 Canteen" },
          { val: 250, label: "+250 Transport" },
          { val: 500, label: "+500 Books/Pass" },
          { val: 1000, label: "+1,000 Outing" }
        ];

    container.innerHTML = presets
      .map(p => `<button type="button" class="preset-amount-btn" data-preset="${p.val}">${p.label}</button>`)
      .join("");

    container.querySelectorAll(".preset-amount-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-preset");
        if (amountInput && val) {
          amountInput.value = val;
          this.playHapticSound("click");
          amountInput.focus();
        }
      });
    });
  }

  updateAddFormType(type = "expense") {
    const isIncome = type === "income";

    // 1. Subtitle
    const subtitleEl = document.getElementById("addSlideSubtitle");
    if (subtitleEl) {
      const key = isIncome ? "add_subtitle_income" : "add_subtitle_expense";
      subtitleEl.setAttribute("data-i18n", key);
      subtitleEl.textContent = getTranslation(key);
    }

    // 2. Title Label & Placeholder
    const lblTitle = document.getElementById("lblAddTitle");
    const titleInput = document.getElementById("addTitleInput");
    if (lblTitle) {
      const key = isIncome ? "lbl_income_name" : "lbl_expense_name";
      lblTitle.setAttribute("data-i18n", key);
      lblTitle.textContent = getTranslation(key);
    }
    if (titleInput) {
      const key = isIncome ? "income_name_placeholder" : "expense_name_placeholder";
      titleInput.setAttribute("data-i18n-placeholder", key);
      titleInput.placeholder = getTranslation(key);
    }

    // 3. Category Label & Grid
    const lblCat = document.getElementById("lblAddCategory");
    if (lblCat) {
      const key = isIncome ? "lbl_income_category" : "lbl_expense_category";
      lblCat.setAttribute("data-i18n", key);
      lblCat.textContent = getTranslation(key);
    }
    this.renderCategoryGrid(type);

    // 4. Quick Presets
    this.renderPresetButtons(type);

    // 5. Payment / Deposit Method
    const lblPay = document.getElementById("lblAddPayment");
    const paySelect = document.getElementById("addPaymentInput");
    if (lblPay) {
      const key = isIncome ? "lbl_payment_method_income" : "lbl_payment_method_expense";
      lblPay.setAttribute("data-i18n", key);
      lblPay.textContent = getTranslation(key);
    }
    if (paySelect) {
      if (isIncome) {
        paySelect.innerHTML = `
          <option value="pay_upi">${getTranslation("pay_upi")}</option>
          <option value="pay_bank">${getTranslation("pay_bank")}</option>
          <option value="pay_cash">${getTranslation("pay_cash")}</option>
          <option value="pay_cheque">${getTranslation("pay_cheque")}</option>
        `;
      } else {
        paySelect.innerHTML = `
          <option value="pay_upi">${getTranslation("pay_upi")}</option>
          <option value="pay_cash">${getTranslation("pay_cash")}</option>
          <option value="pay_debit">${getTranslation("pay_debit")}</option>
          <option value="pay_credit">${getTranslation("pay_credit")}</option>
          <option value="pay_bank">${getTranslation("pay_bank")}</option>
        `;
      }
    }

    // 6. Notes Placeholder
    const notesInput = document.getElementById("addNotesInput");
    if (notesInput) {
      const key = isIncome ? "notes_placeholder_income" : "notes_placeholder_expense";
      notesInput.setAttribute("data-i18n-placeholder", key);
      notesInput.placeholder = getTranslation(key);
    }

    // 7. Submit Button
    const submitBtn = document.getElementById("btnAddExpenseSubmit");
    const submitText = document.getElementById("btnAddSubmitText");
    if (submitText) {
      const key = isIncome ? "btn_submit_income" : "btn_submit_expense";
      submitText.setAttribute("data-i18n", key);
      submitText.textContent = getTranslation(key);
    }
    if (submitBtn) {
      if (isIncome) {
        submitBtn.classList.add("btn-submit-income");
      } else {
        submitBtn.classList.remove("btn-submit-income");
      }
    }
  }

  renderCategorySelectors() {
    const filterCatSelect = document.getElementById("txFilterCategory");
    const modalCatSelect = document.getElementById("editModalCategory");

    const typeEl = document.querySelector('input[name="transactionType"]:checked');
    const curType = typeEl ? typeEl.value : "expense";
    this.updateAddFormType(curType);

    // Populate transaction filter category select
    if (filterCatSelect) {
      let optHtml = `<option value="all">${getTranslation("filter_all_categories")}</option>`;
      optHtml += `<optgroup label="Expenses">`;
      optHtml += store.categories.map(c => `<option value="${c.id}">${c.icon} ${getTranslation(c.nameKey)}</option>`).join("");
      optHtml += `</optgroup><optgroup label="Income / Allowance">`;
      optHtml += store.incomeCategories.map(c => `<option value="${c.id}">${c.icon} ${getTranslation(c.nameKey)}</option>`).join("");
      optHtml += `</optgroup>`;
      filterCatSelect.innerHTML = optHtml;
    }

    if (modalCatSelect) {
      let optHtml = `<optgroup label="Expenses">`;
      optHtml += store.categories.map(c => `<option value="${c.id}">${c.icon} ${getTranslation(c.nameKey)}</option>`).join("");
      optHtml += `</optgroup><optgroup label="Income / Allowance">`;
      optHtml += store.incomeCategories.map(c => `<option value="${c.id}">${c.icon} ${getTranslation(c.nameKey)}</option>`).join("");
      optHtml += `</optgroup>`;
      modalCatSelect.innerHTML = optHtml;
    }
  }

  bindAddForm() {
    const form = document.getElementById("addExpenseForm");
    const amountInput = document.getElementById("addAmountInput");
    const dateInput = document.getElementById("addDateInput");
    const typeRadios = document.querySelectorAll('input[name="transactionType"]');

    // Default date to now
    if (dateInput) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      dateInput.value = now.toISOString().slice(0, 16);
    }

    // Toggle between Expense and Income / Allowance
    typeRadios.forEach(radio => {
      radio.addEventListener("change", e => {
        this.updateAddFormType(e.target.value);
        this.playHapticSound("click");
      });
    });

    // Form submission
    if (form) {
      form.addEventListener("submit", e => {
        e.preventDefault();
        const amount = parseFloat(amountInput.value);
        const title = document.getElementById("addTitleInput").value;
        const notes = document.getElementById("addNotesInput").value;
        const paymentMethod = document.getElementById("addPaymentInput").value;
        const dateVal = dateInput.value;
        const typeEl = document.querySelector('input[name="transactionType"]:checked');
        const type = typeEl ? typeEl.value : "expense";

        const selectedCard = document.querySelector("#addCategoryGrid .category-choice-card.selected");
        const defaultCat = type === "income" ? "allowance" : "food";
        const category = selectedCard ? selectedCard.getAttribute("data-cat-id") : defaultCat;

        if (!amount || amount <= 0) {
          alert("Please enter a valid amount greater than 0");
          return;
        }

        if (!title.trim()) {
          alert(type === "income" ? "Please enter the source of income" : "Please enter the name of the expense or merchant");
          return;
        }

        store.addTransaction({
          title,
          amount,
          category,
          paymentMethod,
          date: dateVal,
          notes,
          type
        });

        this.playHapticSound("success");
        this.showToast(getTranslation("success_added"));

        // Reset form
        form.reset();
        amountInput.value = "";
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);

        // Reset toggle to expense
        const expRadio = document.getElementById("typeExpense");
        if (expRadio) expRadio.checked = true;
        this.updateAddFormType("expense");

        // Refresh views and switch to dashboard
        this.renderAll();
        setTimeout(() => {
          this.switchSlide("dashboard");
        }, 300);
      });
    }
  }

  // --- 4. Analytics View ---
  renderAnalyticsSummary() {
    const elTotal = document.getElementById("analyticsTotalSpent");
    const elDaily = document.getElementById("analyticsDailyAvg");
    const elTopCat = document.getElementById("analyticsTopCat");
    const elLargest = document.getElementById("analyticsLargestExp");
    const elBurnStatus = document.getElementById("analyticsBurnStatus");

    const totalSpent = store.getTotalSpentThisMonth();
    const dailyAvg = store.getDailyAverageSpent();
    const topCat = store.getTopCategory();
    const largestExp = store.getLargestExpense();
    const runway = store.getStudentRunway();
    const daysLeft = store.getDaysLeftInMonth();

    if (elTotal) elTotal.textContent = store.formatMoney(totalSpent);
    if (elDaily) elDaily.textContent = store.formatMoney(dailyAvg) + " / day";

    if (elTopCat) {
      if (topCat) {
        const catObj = store.categories.find(c => c.id === topCat.id);
        const name = catObj ? getTranslation(catObj.nameKey) : topCat.id;
        elTopCat.innerHTML = `
          <div class="stat-highlight">
            <span class="stat-icon-sm">${topCat.icon}</span>
            <div class="stat-hl-text">
              <strong>${name}</strong>
              <small>${store.formatMoney(topCat.spent)} (${topCat.percent}% of budget)</small>
            </div>
          </div>
        `;
      } else {
        elTopCat.textContent = "No data yet";
      }
    }

    if (elLargest) {
      if (largestExp) {
        elLargest.innerHTML = `
          <div class="stat-highlight">
            <span class="stat-icon-sm">🏷️</span>
            <div class="stat-hl-text">
              <strong>${store.formatMoney(largestExp.amount)}</strong>
              <small>${largestExp.title}</small>
            </div>
          </div>
        `;
      } else {
        elLargest.textContent = "None";
      }
    }

    if (elBurnStatus) {
      if (runway >= daysLeft) {
        elBurnStatus.innerHTML = `
          <span class="badge badge-success">Safe Runway (Healthy)</span>
          <p class="runway-text">Your funds are projected to last <strong>${runway} days</strong>. You have <strong>${daysLeft} days</strong> remaining this month.</p>
        `;
      } else {
        elBurnStatus.innerHTML = `
          <span class="badge badge-danger">High Burn Rate (Action Needed)</span>
          <p class="runway-text text-danger">At this pace, your money may run out in <strong>${runway} days</strong>, but there are <strong>${daysLeft} days</strong> left in this month. Slow down non-essential spending!</p>
        `;
      }
    }
  }

  // --- 5. Budget View ---
  renderBudgetSliders() {
    const container = document.getElementById("budgetCategorySliders");
    const totalAllocEl = document.getElementById("budgetTotalAllocated");
    const totalSpentEl = document.getElementById("budgetTotalSpent");
    const totalRemEl = document.getElementById("budgetTotalRemaining");
    if (!container) return;

    const totalAlloc = store.getTotalBudget();
    const totalSpent = store.getTotalSpentThisMonth();
    const remaining = totalAlloc - totalSpent;

    if (totalAllocEl) totalAllocEl.textContent = store.formatMoney(totalAlloc);
    if (totalSpentEl) totalSpentEl.textContent = store.formatMoney(totalSpent);
    if (totalRemEl) {
      totalRemEl.textContent = store.formatMoney(remaining);
      totalRemEl.className = remaining < 0 ? "text-danger" : "text-success";
    }

    const catStats = store.getCategorySpending();
    let html = "";

    catStats.forEach(cat => {
      let progressClass = "progress-success";
      let statusBadge = "";

      if (cat.isExceeded) {
        progressClass = "progress-danger";
        statusBadge = `<span class="badge badge-danger">${getTranslation("over_budget")} (+${store.formatMoney(cat.spent - cat.budget)})</span>`;
      } else if (cat.isWarning) {
        progressClass = "progress-warning";
        statusBadge = `<span class="badge badge-warning">${cat.rawPercent}% Used</span>`;
      } else {
        statusBadge = `<span class="badge badge-neutral">${cat.rawPercent}% Used</span>`;
      }

      html += `
        <div class="budget-card">
          <div class="budget-card-header">
            <div class="budget-cat-info">
              <span class="budget-cat-icon" style="background: ${cat.color}22; color: ${cat.color};">${cat.icon}</span>
              <div>
                <h4 class="budget-cat-name">${getTranslation(cat.nameKey)}</h4>
                <div class="budget-cat-sub">
                  ${getTranslation('spent')}: <strong>${store.formatMoney(cat.spent)}</strong> of <strong>${store.formatMoney(cat.budget)}</strong>
                </div>
              </div>
            </div>
            <div class="budget-status-box">
              ${statusBadge}
              <div class="budget-input-wrapper">
                <span class="currency-prefix">${store.getCurrency()}</span>
                <input type="number" class="budget-alloc-input" data-cat-id="${cat.id}" value="${cat.budget}" min="0" step="50">
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="budget-progress-track">
            <div class="budget-progress-fill ${progressClass}" style="width: ${cat.percent}%;"></div>
          </div>

          <div class="budget-card-footer">
            <span>${getTranslation('remaining')}: <strong class="${cat.remaining < 0 ? 'text-danger' : 'text-success'}">${store.formatMoney(cat.remaining)}</strong></span>
            <span>Allocated: ${store.formatMoney(cat.budget)}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Budget input event listeners for live dynamic updates
    container.querySelectorAll(".budget-alloc-input").forEach(input => {
      input.addEventListener("change", () => {
        this.saveCurrentBudgets();
      });
    });

    // Save Budgets Button
    const saveBtn = document.getElementById("btnSaveBudgets");
    if (saveBtn) {
      saveBtn.onclick = () => {
        this.saveCurrentBudgets();
        this.playHapticSound("success");
        this.showToast("Category budgets saved successfully!");
      };
    }

    // Apply Smart Allocation Button
    const applySmartBtn = document.getElementById("btnApplySmartBudget");
    if (applySmartBtn) {
      applySmartBtn.onclick = () => {
        this.applySmartCollegeBudgets();
      };
    }
  }

  saveCurrentBudgets() {
    const budgetMap = {};
    document.querySelectorAll(".budget-alloc-input").forEach(input => {
      const catId = input.getAttribute("data-cat-id");
      const val = parseFloat(input.value) || 0;
      budgetMap[catId] = val;
    });
    store.saveCategoryBudgets(budgetMap);
    this.renderAll();
  }

  applySmartCollegeBudgets() {
    // 50/30/20 College Rule based on total monthly allowance
    const totalAllowance = store.profile.monthlyAllowance || 15000;
    
    // 50% Needs: Food (25%), Accommodation (15%), Transport (7%), Books/Study (3%)
    // 30% Wants: Entertainment (15%), Shopping (8%), Groceries (7%)
    // 20% Emergency / Buffer: Health (5%), Utilities (5%), Savings (10%)
    const smartAllocations = {
      food: Math.round(totalAllowance * 0.25),
      accommodation: Math.round(totalAllowance * 0.20),
      transport: Math.round(totalAllowance * 0.08),
      books: Math.round(totalAllowance * 0.07),
      entertainment: Math.round(totalAllowance * 0.12),
      groceries: Math.round(totalAllowance * 0.08),
      shopping: Math.round(totalAllowance * 0.06),
      health: Math.round(totalAllowance * 0.04),
      utilities: Math.round(totalAllowance * 0.05),
      other: Math.round(totalAllowance * 0.05)
    };

    store.saveCategoryBudgets(smartAllocations);
    this.playHapticSound("success");
    this.showToast("Smart 50/30/20 College Budget applied!");
    this.renderAll();
  }

  // --- 6. Profile & Settings View ---
  renderProfileView() {
    const nameInput = document.getElementById("profileNameInput");
    const emailInput = document.getElementById("profileEmailInput");
    const uniInput = document.getElementById("profileUniversityInput");
    const yearInput = document.getElementById("profileYearInput");
    const allowanceInput = document.getElementById("profileAllowanceInput");
    const currencySelect = document.getElementById("profileCurrencySelect");
    const langSelect = document.getElementById("profileLanguageSelect");
    const soundToggle = document.getElementById("profileSoundToggle");

    if (nameInput) nameInput.value = store.profile.name;
    if (emailInput) emailInput.value = store.profile.email;
    if (uniInput) uniInput.value = store.profile.university;
    if (yearInput) yearInput.value = store.profile.year;
    if (allowanceInput) allowanceInput.value = store.profile.monthlyAllowance;
    if (currencySelect) currencySelect.value = store.profile.currency;
    if (langSelect) langSelect.value = currentLang;
    if (soundToggle) soundToggle.checked = store.profile.soundEnabled;
  }

  bindProfileSettings() {
    const profileForm = document.getElementById("profileSettingsForm");
    const langSelect = document.getElementById("profileLanguageSelect");
    const currencySelect = document.getElementById("profileCurrencySelect");
    const soundToggle = document.getElementById("profileSoundToggle");
    const btnExportJson = document.getElementById("btnExportJson");
    const btnLoadSample = document.getElementById("btnLoadSampleData");
    const btnClearData = document.getElementById("btnClearData");
    const btnLogout = document.getElementById("btnLogoutBtn");

    if (profileForm) {
      profileForm.addEventListener("submit", e => {
        e.preventDefault();
        const updated = {
          name: document.getElementById("profileNameInput").value,
          email: document.getElementById("profileEmailInput").value,
          university: document.getElementById("profileUniversityInput").value,
          year: document.getElementById("profileYearInput").value,
          monthlyAllowance: parseFloat(document.getElementById("profileAllowanceInput").value) || 15000,
          currency: currencySelect ? currencySelect.value : "₹",
          soundEnabled: soundToggle ? soundToggle.checked : true
        };

        store.saveProfile(updated);
        this.playHapticSound("success");
        this.showToast("Profile & Settings updated!");
        this.renderAll();
      });
    }

    if (langSelect) {
      langSelect.addEventListener("change", e => {
        setLanguage(e.target.value);
        this.playHapticSound("click");
        this.showToast("Language changed to " + e.target.options[e.target.selectedIndex].text);
        this.renderAll();
      });
    }

    if (currencySelect) {
      currencySelect.addEventListener("change", e => {
        store.saveProfile({ currency: e.target.value });
        this.playHapticSound("click");
        this.renderAll();
      });
    }

    if (soundToggle) {
      soundToggle.addEventListener("change", e => {
        store.saveProfile({ soundEnabled: e.target.checked });
      });
    }

    if (btnExportJson) {
      btnExportJson.addEventListener("click", () => {
        const fullBackup = {
          profile: store.profile,
          categories: store.categories,
          transactions: store.transactions,
          exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `CampusSpend_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.playHapticSound("success");
        this.showToast("JSON Backup downloaded!");
      });
    }

    if (btnLoadSample) {
      btnLoadSample.addEventListener("click", () => {
        if (confirm("Reset current data to realistic college sample expenses?")) {
          store.resetToSample();
          this.playHapticSound("success");
          this.showToast("Loaded realistic student transactions!");
          this.renderAll();
        }
      });
    }

    if (btnClearData) {
      btnClearData.addEventListener("click", () => {
        if (confirm("Are you sure? This will permanently delete all transaction history!")) {
          store.clearAllData();
          this.playHapticSound("alert");
          this.showToast("All data cleared.");
          this.renderAll();
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        const modal = document.getElementById("logoutConfirmModal");
        if (modal) modal.style.display = "flex";
      });
    }
  }

  // --- Modals (Edit Transaction & Logout) ---
  bindModals() {
    const editModal = document.getElementById("editTransactionModal");
    const logoutModal = document.getElementById("logoutConfirmModal");
    const editForm = document.getElementById("editTransactionForm");

    // Close buttons
    document.querySelectorAll(".modal-close-btn, .btn-modal-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        if (editModal) editModal.style.display = "none";
        if (logoutModal) logoutModal.style.display = "none";
      });
    });

    // Close on outside click
    window.addEventListener("click", e => {
      if (e.target === editModal) editModal.style.display = "none";
      if (e.target === logoutModal) logoutModal.style.display = "none";
    });

    // Edit form submission
    if (editForm) {
      editForm.addEventListener("submit", e => {
        e.preventDefault();
        if (!this.editingTxId) return;

        const updated = {
          title: document.getElementById("editModalTitle").value,
          amount: parseFloat(document.getElementById("editModalAmount").value),
          category: document.getElementById("editModalCategory").value,
          paymentMethod: document.getElementById("editModalPayment").value,
          date: document.getElementById("editModalDate").value,
          notes: document.getElementById("editModalNotes").value
        };

        store.updateTransaction(this.editingTxId, updated);
        this.playHapticSound("success");
        this.showToast("Transaction updated successfully!");
        editModal.style.display = "none";
        this.renderAll();
      });
    }

    // Confirm logout
    const confirmLogoutBtn = document.getElementById("btnConfirmLogout");
    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener("click", () => {
        logoutModal.style.display = "none";
        this.showLockScreen();
      });
    }

    // Unlock screen
    const unlockBtn = document.getElementById("btnUnlockSession");
    if (unlockBtn) {
      unlockBtn.addEventListener("click", () => {
        document.getElementById("lockScreenOverlay").style.display = "none";
        this.playHapticSound("success");
      });
    }
  }

  openEditModal(id) {
    const tx = store.transactions.find(t => t.id === id);
    if (!tx) return;
    this.editingTxId = id;

    const modal = document.getElementById("editTransactionModal");
    document.getElementById("editModalTitle").value = tx.title;
    document.getElementById("editModalAmount").value = tx.amount;
    document.getElementById("editModalCategory").value = tx.category;
    document.getElementById("editModalPayment").value = tx.paymentMethod || "pay_upi";
    
    // Format date for datetime-local
    const d = new Date(tx.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById("editModalDate").value = d.toISOString().slice(0, 16);
    document.getElementById("editModalNotes").value = tx.notes || "";

    if (modal) modal.style.display = "flex";
  }

  showLockScreen() {
    const overlay = document.getElementById("lockScreenOverlay");
    if (overlay) {
      overlay.style.display = "flex";
      this.playHapticSound("alert");
    }
  }

  bindCalendarControls() {
    const prevBtn = document.getElementById("btnPrevMonth");
    const nextBtn = document.getElementById("btnNextMonth");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        calendarMgr.prevMonth();
        this.playHapticSound("click");
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        calendarMgr.nextMonth();
        this.playHapticSound("click");
      });
    }
  }
}

// Global App instance
const app = new App();
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
