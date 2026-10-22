// Chart Visualizations using Chart.js with Editorial Fintech Theme
class ChartManager {
  constructor() {
    this.spendingOverviewChart = null;
    this.categoryDonutChart = null;
    this.dailyTrendChart = null;
    this.weeklyTrendChart = null;
    this.dayDistributionChart = null;
  }

  // 1. Dashboard Spending Overview: Cumulative Spending vs Ideal Safe Budget Line
  renderSpendingOverview() {
    const canvas = document.getElementById("spendingOverviewCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (this.spendingOverviewChart) {
      this.spendingOverviewChart.destroy();
    }

    const now = new Date();
    const daysInMonth = store.getDaysInCurrentMonth();
    const curDay = store.getCurrentDayOfMonth();
    const totalBudget = store.getTotalBudget();
    const idealDailyBudget = totalBudget / daysInMonth;

    // Generate labels 1..daysInMonth
    const labels = [];
    const actualData = [];
    const idealData = [];

    // Map daily expenses
    const expenses = store.getCurrentMonthExpenses();
    const dailyMap = {};
    expenses.forEach(t => {
      const d = new Date(t.date).getDate();
      dailyMap[d] = (dailyMap[d] || 0) + Number(t.amount);
    });

    let runningTotal = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(`Day ${day}`);
      idealData.push(Math.round(idealDailyBudget * day));

      if (day <= curDay) {
        runningTotal += dailyMap[day] || 0;
        actualData.push(runningTotal);
      } else {
        actualData.push(null); // future days
      }
    }

    // Gradient fill for actual spend (Coral Vermilion #ED6A4B)
    const gradientActual = ctx.createLinearGradient(0, 0, 0, 320);
    gradientActual.addColorStop(0, "rgba(237, 106, 75, 0.28)");
    gradientActual.addColorStop(1, "rgba(237, 106, 75, 0.0)");

    this.spendingOverviewChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Actual Spent (" + store.getCurrency() + ")",
            data: actualData,
            borderColor: "#ED6A4B",
            backgroundColor: gradientActual,
            borderWidth: 3,
            pointBackgroundColor: "#ED6A4B",
            pointBorderColor: "#FFFDF8",
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35
          },
          {
            label: "Ideal Safe Budget Limit (" + store.getCurrency() + ")",
            data: idealData,
            borderColor: "rgba(198, 154, 83, 0.85)", // Brass Gold #C69A53
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#6D7B78",
              font: { family: "'DM Sans', sans-serif", size: 12, weight: "500" },
              boxWidth: 14,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: "rgba(19, 37, 45, 0.96)",
            borderColor: "rgba(230, 225, 215, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFDF8",
            bodyColor: "#F7F3EB",
            titleFont: { family: "'DM Sans', sans-serif" },
            bodyFont: { family: "'DM Sans', sans-serif" },
            padding: 12,
            boxPadding: 6,
            callbacks: {
              label: function (ctx) {
                if (ctx.raw === null) return "";
                return `${ctx.dataset.label}: ${store.getCurrency()} ${Number(ctx.raw).toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(230, 225, 215, 0.6)" },
            ticks: {
              color: "#6D7B78",
              font: { family: "'DM Sans', sans-serif", size: 11 },
              maxTicksLimit: 12
            }
          },
          y: {
            grid: { color: "rgba(230, 225, 215, 0.6)" },
            ticks: {
              color: "#6D7B78",
              font: { family: "'DM Sans', sans-serif", size: 11 },
              callback: val => `${store.getCurrency()} ${val.toLocaleString()}`
            }
          }
        }
      }
    });
  }

  // 2. Dashboard Category Donut Chart
  renderCategoryDonut() {
    const canvas = document.getElementById("categoryDonutCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (this.categoryDonutChart) {
      this.categoryDonutChart.destroy();
    }

    const catStats = store.getCategorySpending().filter(c => c.spent > 0);
    const labels = catStats.map(c => `${c.icon} ${getTranslation(c.nameKey)}`);
    const data = catStats.map(c => c.spent);
    const bgColors = catStats.map(c => c.color);

    if (data.length === 0) {
      // Empty placeholder state
      labels.push("No Expenses Yet");
      data.push(1);
      bgColors.push("#DCE6E1");
    }

    this.categoryDonutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: bgColors,
            borderColor: "#FFFDF8",
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#13252D",
              font: { family: "'DM Sans', sans-serif", size: 12 },
              padding: 12,
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: "rgba(19, 37, 45, 0.96)",
            borderColor: "rgba(230, 225, 215, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFDF8",
            bodyColor: "#F7F3EB",
            titleFont: { family: "'DM Sans', sans-serif" },
            bodyFont: { family: "'DM Sans', sans-serif" },
            padding: 12,
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round((ctx.raw / total) * 100);
                return ` ${ctx.label}: ${store.getCurrency()} ${ctx.raw.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 3. Analytics: Daily Spending Bar Chart
  renderDailyTrend() {
    const canvas = document.getElementById("dailyTrendCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (this.dailyTrendChart) {
      this.dailyTrendChart.destroy();
    }

    const curDay = store.getCurrentDayOfMonth();
    const expenses = store.getCurrentMonthExpenses();
    const labels = [];
    const values = [];

    // Map spend per day
    const dayMap = {};
    expenses.forEach(t => {
      const d = new Date(t.date).getDate();
      dayMap[d] = (dayMap[d] || 0) + Number(t.amount);
    });

    for (let i = 1; i <= curDay; i++) {
      labels.push(`Day ${i}`);
      values.push(dayMap[i] || 0);
    }

    // Color bars: High -> Coral Vermilion, Moderate -> Brass Gold, Normal -> Sage Green
    const avg = store.getDailyAverageSpent();
    const barColors = values.map(v => (v > avg * 1.5 ? "#ED6A4B" : v > avg ? "#C69A53" : "#A5C4AE"));

    this.dailyTrendChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Daily Spend",
            data: values,
            backgroundColor: barColors,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(19, 37, 45, 0.96)",
            borderColor: "rgba(230, 225, 215, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFDF8",
            bodyColor: "#F7F3EB",
            titleFont: { family: "'DM Sans', sans-serif" },
            bodyFont: { family: "'DM Sans', sans-serif" },
            callbacks: {
              label: ctx => `Spend: ${store.getCurrency()} ${Number(ctx.raw).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#6D7B78", font: { family: "'DM Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { color: "rgba(230, 225, 215, 0.6)" },
            ticks: {
              color: "#6D7B78",
              font: { family: "'DM Sans', sans-serif" },
              callback: val => `${store.getCurrency()} ${val}`
            }
          }
        }
      }
    });
  }

  // 4. Analytics: Weekly Breakdown (Week 1, Week 2, Week 3, Week 4)
  renderWeeklyTrend() {
    const canvas = document.getElementById("weeklyTrendCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (this.weeklyTrendChart) {
      this.weeklyTrendChart.destroy();
    }

    const expenses = store.getCurrentMonthExpenses();
    const weeks = [0, 0, 0, 0]; // W1 (1-7), W2 (8-14), W3 (15-21), W4 (22+)

    expenses.forEach(t => {
      const day = new Date(t.date).getDate();
      if (day <= 7) weeks[0] += Number(t.amount);
      else if (day <= 14) weeks[1] += Number(t.amount);
      else if (day <= 21) weeks[2] += Number(t.amount);
      else weeks[3] += Number(t.amount);
    });

    this.weeklyTrendChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Week 1 (Days 1-7)", "Week 2 (Days 8-14)", "Week 3 (Days 15-21)", "Week 4+ (Days 22+)"],
        datasets: [
          {
            label: "Weekly Total",
            data: weeks,
            // Uses Sage Green, Pale Green-Gray (secondary chart bar), Brass Gold, Mist Blue
            backgroundColor: ["#A5C4AE", "#DCE6E1", "#C69A53", "#AEC9D5"],
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(19, 37, 45, 0.96)",
            borderColor: "rgba(230, 225, 215, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFDF8",
            bodyColor: "#F7F3EB",
            titleFont: { family: "'DM Sans', sans-serif" },
            bodyFont: { family: "'DM Sans', sans-serif" },
            callbacks: {
              label: ctx => `Total: ${store.getCurrency()} ${Number(ctx.raw).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#6D7B78", font: { family: "'DM Sans', sans-serif" } }
          },
          y: {
            grid: { color: "rgba(230, 225, 215, 0.6)" },
            ticks: {
              color: "#6D7B78",
              font: { family: "'DM Sans', sans-serif" },
              callback: val => `${store.getCurrency()} ${val}`
            }
          }
        }
      }
    });
  }

  // 5. Analytics: Day of the Week Distribution (Mon..Sun)
  renderDayDistribution() {
    const canvas = document.getElementById("dayDistributionCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (this.dayDistributionChart) {
      this.dayDistributionChart.destroy();
    }

    const expenses = store.getCurrentMonthExpenses();
    const days = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat

    expenses.forEach(t => {
      const dayOfWeek = new Date(t.date).getDay();
      days[dayOfWeek] += Number(t.amount);
    });

    // Reorder Mon..Sun
    const orderedDays = [days[1], days[2], days[3], days[4], days[5], days[6], days[0]];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    this.dayDistributionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dayNames,
        datasets: [
          {
            label: "Spending by Day of Week",
            data: orderedDays,
            borderColor: "#ED6A4B", // Coral Vermilion
            backgroundColor: "rgba(237, 106, 75, 0.12)",
            borderWidth: 3,
            pointBackgroundColor: "#ED6A4B",
            pointBorderColor: "#FFFDF8",
            pointBorderWidth: 2,
            pointRadius: 5,
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(19, 37, 45, 0.96)",
            borderColor: "rgba(230, 225, 215, 0.3)",
            borderWidth: 1,
            titleColor: "#FFFDF8",
            bodyColor: "#F7F3EB",
            titleFont: { family: "'DM Sans', sans-serif" },
            bodyFont: { family: "'DM Sans', sans-serif" },
            callbacks: {
              label: ctx => `Spend: ${store.getCurrency()} ${Number(ctx.raw).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(230, 225, 215, 0.6)" },
            ticks: { color: "#6D7B78", font: { family: "'DM Sans', sans-serif" } }
          },
          y: {
            grid: { color: "rgba(230, 225, 215, 0.6)" },
            ticks: {
              color: "#6D7B78",
              font: { family: "'DM Sans', sans-serif" },
              callback: val => `${store.getCurrency()} ${val}`
            }
          }
        }
      }
    });
  }

  // Update all charts at once
  updateAll() {
    this.renderSpendingOverview();
    this.renderCategoryDonut();
    this.renderDailyTrend();
    this.renderWeeklyTrend();
    this.renderDayDistribution();
  }
}

const chartMgr = new ChartManager();
