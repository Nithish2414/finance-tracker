# Wally 🎓 — Smart College Finance & Expense Tracker

> A bespoke, luxury financial compass engineered specifically for college and university students to track monthly spending, prevent running out of money in the first two weeks, manage category budgets, and build healthy financial habits.

---

## 💡 The Core Problem Solved
Many college students receive a monthly allowance or pocket money at the start of each month. However, without proactive visibility, up to **70% of the funds are often spent in the first 1-2 weeks** on canteen food, impulse outings, and unplanned purchases. Students then struggle with zero savings for the rest of the semester.

**Wally** transforms student financial management through:
1. **Pacing Line & Safe Limit Tracking**: A visual comparison of cumulative spending vs. the ideal daily linear allowance curve.
2. **Campus Runway & Burn Rate Assessment**: Tells students exactly how many days their remaining balance will last at their current rate of spending.
3. **Smart Warning System**: Automatic warnings when a specific category (e.g. Food, Books) crosses its monthly allocation.
4. **Interactive Day-by-Day Calendar**: Color-coded daily expense tags so students can immediately audit which days had heavy spending.
5. **Student 50/30/20 Rule & Smart Recommendations**: College-tailored guidance to allocate 50% for Needs, 30% for Campus Fun, and 20% for Emergency Buffers.

---

## 🖥️ The 6 Slides / Sections

### 1. 📊 Dashboard
- **Key Metrics**:
  - **Money Left**: Current remaining allowance in real-time.
  - **Monthly Budget**: Total student budget allocation.
  - **Total Spent**: Month-to-date cumulative expenditure.
  - **Daily Average & Campus Runway**: Daily burn rate and projected days remaining before running out of money.
- **Active Warning Hub**: Prominently highlights over-budget categories (e.g., *Food limit exceeded!*) and rapid pacing warnings.
- **Spending Overview Chart**: Smooth interactive curve showing actual spend versus the ideal safe budget trajectory.
- **Category Breakdown Chart**: High-end donut visualization displaying relative distribution across categories.
- **Recent Spending Box**: Fast audit list of the latest transactions with quick edit and delete actions.
- **Spending Calendar**: Monthly interactive calendar featuring color-coded spending tags for every day with interactive pop-out drawers.

### 2. 📑 Transactions
- **Instant Search Bar**: Debounced live search by expense title, merchant, or notes.
- **Comprehensive Filters**: Filter by Category, Payment Method (UPI, Cash, Debit Card, Credit Card, Net Banking), and Timeframe (Today, This Week, This Month, All Time).
- **Sorting Options**: Sort by newest, oldest, highest amount, or lowest amount.
- **Interactive Actions**: In-line Edit modal to update amounts, merchants, or categories, and Delete action with confirmation.
- **CSV Export**: One-click export of student records for personal records or parental reporting.

### 3. ➕ Add Amount
- **Dual Mode**: Seamless toggle between **Expense** and **Income / Allowance** with dynamically tailored content:
  - **When logging Expense**:
    - Presets: +₹50 Chai/Snack, +₹120 Canteen, +₹250 Transport, +₹500 Books, +₹1,000 Outing.
    - Fields: Expense Name / Merchant, Notes.
    - 10 Expense Categories: 🍜 Food & Canteen, 🚌 Transport & Fuel, 📚 Books & Study Material, 🎬 Entertainment & Outing, 🏠 Accommodation & Rent, 🛒 Groceries & Personal, 🛍️ Shopping & Clothes, 💊 Health & Medical, 📱 Mobile & Subscriptions, 🏷️ Other Expenses.
    - Payment Methods: UPI, Cash, Debit Card, Credit Card, Net Banking.
  - **When logging Income / Allowance**:
    - Presets: +₹500 Gift/Reward, +₹1,000 Freelance/Gig, +₹2,000 Pocket Money, +₹5,000 Monthly Allowance, +₹10,000 Semester Grant.
    - Fields: Income Source / Description, Deposit Channel, Notes.
    - 6 Income Categories: 💰 Monthly Allowance, 💼 Freelance & Gigs, 🎓 Scholarship & Grants, 💵 Internship & Stipend, 🎁 Gifts & Rewards, 🏷️ Other Income.
    - Deposit Channels: UPI, Direct Bank Transfer / Net Banking, Cash in Hand, Cheque / College Account.

### 4. 📈 Analytics
- **Summary Metrics**: Total month spending, daily average burn rate, top spending category, and largest single expense.
- **Student Runway Assessment**: Real-time diagnostic comparing projected fund lifetime against remaining days in the month.
- **Daily Spending Trend**: Color-coded bar chart highlighting high-burn days.
- **Weekly Breakdown**: Comparative bar graph across Week 1, Week 2, Week 3, and Week 4+.
- **Day of the Week Distribution**: Radar/line curve highlighting weekend outings versus weekday campus expenditures.

### 5. 🎯 Budget Management
- **Category Allocations**: Sliders and numerical inputs to set limits for each category.
- **Dynamic Visual Progress Bars**:
  - 🟢 Green: Safe (<70% of limit consumed)
  - 🟡 Amber: Caution (70% - 99% of limit consumed)
  - 🔴 Glowing Red: **OVER BUDGET** with exact overage amount badge.
- **Smart Recommendations (50/30/20 College Rule)**: AI student advisor breakdown and a one-click **"Apply Smart College Allocation"** button.

### 6. ⚙️ Profile & Settings
- **Student Identity**: Editable Name, Email, University, and Academic Semester.
- **Multi-Language Selector**: Live UI translation for:
  - English (Default)
  - हिन्दी (Hindi)
  - Español (Spanish)
  - Français (French)
  - Deutsch (German)
  - தமிழ் (Tamil)
  - తెలుగు (Telugu)
- **Currency Customization**: Select between ₹ (INR), $ (USD), € (EUR), £ (GBP), and ¥ (JPY).
- **Synthesized Audio Feedback**: Subtle tactile clicks and celebration chimes powered by the Web Audio API (no external audio files required).
- **Data Management**: Backup to JSON, Reload realistic college sample data, or Reset all data.
- **Secure Session Lock & Logout**: Logout modal with lock screen overlay.

---

## 🎨 Design & Aesthetic Excellence
- **Color Theme**: Bespoke *Obsidian Emerald & Champagne Amber Glass* (`#07090E`, `#0B0F17`, `#10B981`, `#00F5A0`, `#F59E0B`, `#FF4D6D`).
- **Typography**: Google Fonts `Space Grotesk` (bold display and financial numerical headers) and `Plus Jakarta Sans` (high-precision Swiss fintech interface typography).
- **Visuals**: Modern glassmorphism, radial lighting ambient glows, interactive Chart.js visualizations, and zero generic boilerplate styling.

---

## 🚀 How to Run

### Option A: Complete Full-Stack Run with Python FastAPI Backend (Recommended)
The Python FastAPI backend provides SQLite persistence, JWT authentication, live pacing/burn-rate calculations, and automatically serves the frontend at root:

```bash
# 1. Install backend dependencies
pip install -r backend/requirements.txt

# 2. Run the server
python backend/run.py
```

Open your browser at:
```
http://localhost:8000
```

To run the automated backend test suite:
```bash
pytest backend/tests/ -v
```

### Option B: Standalone Frontend Only
You can also run Wally purely in the browser with local storage fallback:
```bash
python -m http.server 3000 --directory "mannus project"
```
Open your browser at `http://localhost:3000`
