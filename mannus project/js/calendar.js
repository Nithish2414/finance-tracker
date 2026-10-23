// Interactive Spending Calendar for Dashboard
class CalendarManager {
  constructor() {
    this.currentDate = new Date();
    this.selectedDay = null;
  }

  init() {
    this.render();
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.selectedDay = null;
    this.render();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.selectedDay = null;
    this.render();
  }

  render() {
    const calendarEl = document.getElementById("calendarGrid");
    const monthYearEl = document.getElementById("calendarMonthYear");
    if (!calendarEl || !monthYearEl) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;

    // Get days in month & first day index
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Map all expenses in this specific month
    const dailyMap = {};
    store.transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month && t.type === "expense") {
        const day = d.getDate();
        if (!dailyMap[day]) {
          dailyMap[day] = { total: 0, count: 0, items: [] };
        }
        dailyMap[day].total += Number(t.amount);
        dailyMap[day].count += 1;
        dailyMap[day].items.push(t);
      }
    });

    // Clear grid
    calendarEl.innerHTML = "";

    // Day of week headers
    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayHeaders.forEach(dh => {
      const h = document.createElement("div");
      h.className = "calendar-header-day";
      h.textContent = dh;
      calendarEl.appendChild(h);
    });

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevCell = document.createElement("div");
      prevCell.className = "calendar-cell other-month";
      prevCell.textContent = daysInPrevMonth - i;
      calendarEl.appendChild(prevCell);
    }

    const today = new Date();
    const isCurrentActualMonth = today.getFullYear() === year && today.getMonth() === month;

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("div");
      cell.className = "calendar-cell";

      if (isCurrentActualMonth && day === today.getDate()) {
        cell.classList.add("today");
      }

      if (this.selectedDay === day) {
        cell.classList.add("selected");
      }

      const dayNum = document.createElement("span");
      dayNum.className = "day-number";
      dayNum.textContent = day;
      cell.appendChild(dayNum);

      // Check spending for this day
      const dayData = dailyMap[day];
      if (dayData && dayData.total > 0) {
        const spendTag = document.createElement("div");
        spendTag.className = "day-spend-tag";
        if (dayData.total > 1500) spendTag.classList.add("heavy");
        else if (dayData.total > 500) spendTag.classList.add("moderate");
        else spendTag.classList.add("light");

        spendTag.textContent = `${store.getCurrency()}${dayData.total >= 1000 ? (dayData.total / 1000).toFixed(1) + 'k' : dayData.total}`;
        cell.appendChild(spendTag);

        // Dot indicator
        const dot = document.createElement("div");
        dot.className = "spend-dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", () => {
        this.selectedDay = day;
        this.render();
        this.showDayDetails(day, dailyMap[day], year, month);
      });

      calendarEl.appendChild(cell);
    }

    // Next month filler days to complete 7-column rows
    const totalSlots = firstDayIndex + daysInMonth;
    const remainingSlots = (7 - (totalSlots % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextCell = document.createElement("div");
      nextCell.className = "calendar-cell other-month";
      nextCell.textContent = i;
      calendarEl.appendChild(nextCell);
    }

    // If day was selected, show details
    if (this.selectedDay) {
      this.showDayDetails(this.selectedDay, dailyMap[this.selectedDay], year, month);
    } else {
      const detailsContainer = document.getElementById("calendarDayDetails");
      if (detailsContainer) {
        detailsContainer.style.display = "none";
      }
    }
  }

  showDayDetails(day, dayData, year, month) {
    const detailsContainer = document.getElementById("calendarDayDetails");
    if (!detailsContainer) return;

    const dateStr = new Date(year, month, day).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    detailsContainer.style.display = "block";

    if (!dayData || !dayData.items.length) {
      detailsContainer.innerHTML = `
        <div class="day-details-card empty">
          <div class="day-details-header">
            <h4>📅 ${dateStr}</h4>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-success">Zero Spend Day! 🎉</span>
              <button class="action-icon-btn" onclick="calendarMgr.hideDayDetails()" title="Close">✕</button>
            </div>
          </div>
          <p class="empty-note" style="color: var(--color-muted-slate); font-size: 13px; margin: 8px 0 14px;">No expenses logged on this day. Great saving discipline!</p>
          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-sm btn-primary" onclick="calendarMgr.quickAddOnDate(${year}, ${month}, ${day})">
              ＋ Add Expense on this Date
            </button>
          </div>
        </div>
      `;
      return;
    }

    let itemsHtml = dayData.items
      .map(item => {
        const cat = store.getCategory(item.category);
        return `
          <div class="day-item-row">
            <span class="day-item-icon" style="background: ${cat.color}22; color: ${cat.color};">${cat.icon}</span>
            <div class="day-item-info">
              <span class="day-item-title">${item.title}</span>
              <span class="day-item-meta">${getTranslation(cat.nameKey)} • ${getTranslation(item.paymentMethod || 'pay_upi')}</span>
            </div>
            <span class="day-item-amount">${store.formatMoney(item.amount)}</span>
          </div>
        `;
      })
      .join("");

    detailsContainer.innerHTML = `
      <div class="day-details-card">
        <div class="day-details-header">
          <div>
            <h4>📅 ${dateStr}</h4>
            <span class="day-details-sub">${dayData.items.length} transaction(s) logged</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="day-total-badge">
              Total: <strong>${store.formatMoney(dayData.total)}</strong>
            </div>
            <button class="action-icon-btn" onclick="calendarMgr.hideDayDetails()" title="Close">✕</button>
          </div>
        </div>
        <div class="day-items-list">
          ${itemsHtml}
        </div>
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--color-border-beige); display: flex; justify-content: flex-end;">
          <button class="btn btn-sm btn-primary" onclick="calendarMgr.quickAddOnDate(${year}, ${month}, ${day})">
            ＋ Add Expense on this Date
          </button>
        </div>
      </div>
    `;

    // Smooth scroll down to details
    setTimeout(() => {
      detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  quickAddOnDate(year, month, day) {
    const d = new Date(year, month, day, 12, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const dateInput = document.getElementById("addDateInput");
    if (dateInput) {
      dateInput.value = d.toISOString().slice(0, 16);
    }
    app.switchSlide("add");
    app.playHapticSound("click");
  }

  hideDayDetails() {
    this.selectedDay = null;
    const detailsContainer = document.getElementById("calendarDayDetails");
    if (detailsContainer) {
      detailsContainer.style.display = "none";
    }
    this.render();
  }
}

const calendarMgr = new CalendarManager();
