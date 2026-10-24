import calendar
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Category, Transaction
from app.schemas import DashboardSummary, AlertItem, TransactionOut, AnalyticsPacingOut, PacingPoint
from app.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Insights"])

def get_current_month_range():
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    _, days_in_month = calendar.monthrange(now.year, now.month)
    return now, start_of_month, days_in_month

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compute real-time dashboard metrics, active alerts, runway and burn rate."""
    now, start_of_month, days_in_month = get_current_month_range()
    current_day = now.day
    days_left = max(1, days_in_month - current_day)

    # 1. Categories & Budgets
    categories = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.type == "expense"
    ).all()
    monthly_budget = sum(c.default_budget for c in categories)

    # 2. Current Month Transactions
    month_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_of_month
    ).all()

    expenses = [t for t in month_txs if t.type == "expense"]
    incomes = [t for t in month_txs if t.type == "income"]

    total_spent = sum(t.amount for t in expenses)
    total_income = sum(t.amount for t in incomes)
    money_left = monthly_budget + total_income - total_spent

    # 3. Burn Rate & Runway
    daily_avg_spent = total_spent / max(1, current_day)
    if money_left <= 0:
        runway_days = 0
    elif daily_avg_spent <= 0:
        runway_days = 99
    else:
        runway_days = round(money_left / daily_avg_spent)

    # 4. Category breakdown & Alerts
    cat_spent_map = {c.code: 0.0 for c in categories}
    for t in expenses:
        cat_spent_map[t.category] = cat_spent_map.get(t.category, 0.0) + t.amount

    alerts: List[AlertItem] = []
    top_cat = None
    max_cat_spent = -1.0

    for c in categories:
        spent = cat_spent_map.get(c.code, 0.0)
        budget = c.default_budget
        if spent > max_cat_spent and spent > 0:
            max_cat_spent = spent
            top_cat = {
                "id": c.code,
                "code": c.code,
                "name_key": c.name_key,
                "icon": c.icon,
                "color": c.color,
                "spent": spent,
                "budget": budget
            }

        if budget > 0:
            if spent > budget:
                over_amt = spent - budget
                alerts.append(AlertItem(
                    type="danger",
                    icon="⚠️",
                    category=c.code,
                    title=f"Budget Exceeded: {c.code.capitalize()}",
                    message=f"Allocated {current_user.currency} {budget:,.0f}, but spent {current_user.currency} {spent:,.0f} (+{current_user.currency} {over_amt:,.0f} over limit!)",
                    over_amount=over_amt
                ))
            elif (spent / budget) >= 0.8:
                pct = round((spent / budget) * 100)
                alerts.append(AlertItem(
                    type="warning",
                    icon="⚡",
                    category=c.code,
                    title=f"High Spending: {c.code.capitalize()}",
                    message=f"You've consumed {pct}% of your {c.code.capitalize()} budget ({current_user.currency} {spent:,.0f} / {current_user.currency} {budget:,.0f}).",
                    over_amount=0.0
                ))

    # Fast Burn Rate Alert: > 70% budget spent before 50% month passed
    month_progress_pct = (current_day / days_in_month) * 100
    spent_pct = (total_spent / monthly_budget * 100) if monthly_budget > 0 else 0
    if spent_pct > 70 and month_progress_pct < 50:
        alerts.insert(0, AlertItem(
            type="danger",
            icon="🚨",
            category="burn_rate",
            title="High Burn Rate Alert!",
            message=f"You have burned {round(spent_pct)}% of your monthly funds in just {current_day} days! At this pace, funds may run out in {runway_days} days.",
            over_amount=0.0
        ))

    # 5. Largest Single Expense
    largest_expense = None
    if expenses:
        largest_t = max(expenses, key=lambda t: t.amount)
        largest_expense = TransactionOut.model_validate(largest_t)

    return DashboardSummary(
        money_left=round(money_left, 2),
        monthly_budget=round(monthly_budget, 2),
        total_spent=round(total_spent, 2),
        total_income=round(total_income, 2),
        daily_avg_spent=round(daily_avg_spent, 2),
        runway_days=runway_days,
        days_left_in_month=days_left,
        active_alerts=alerts,
        top_category=top_cat,
        largest_expense=largest_expense
    )

@router.get("/pacing", response_model=AnalyticsPacingOut)
def get_pacing_curve(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compute cumulative spend curve vs. the ideal linear budget trajectory."""
    now, start_of_month, days_in_month = get_current_month_range()
    current_day = now.day

    categories = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.type == "expense"
    ).all()
    monthly_budget = sum(c.default_budget for c in categories)
    ideal_daily_budget = monthly_budget / days_in_month if days_in_month > 0 else 0.0

    month_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_of_month,
        Transaction.type == "expense"
    ).all()

    daily_spend = {day: 0.0 for day in range(1, days_in_month + 1)}
    for t in month_txs:
        day = t.date.day
        if day in daily_spend:
            daily_spend[day] += t.amount

    points: List[PacingPoint] = []
    running_total = 0.0

    for day in range(1, days_in_month + 1):
        ideal_val = round(ideal_daily_budget * day, 2)
        if day <= current_day:
            running_total += daily_spend[day]
            actual_val = round(running_total, 2)
        else:
            actual_val = None

        points.append(PacingPoint(
            day=day,
            label=f"Day {day}",
            actual=actual_val,
            ideal=ideal_val
        ))

    return AnalyticsPacingOut(
        points=points,
        current_day=current_day,
        days_in_month=days_in_month,
        ideal_daily_budget=round(ideal_daily_budget, 2),
        currency=current_user.currency or "₹"
    )

@router.get("/category-spending")
def get_category_spending_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve itemized breakdown for each category with spent, budget, and percentages."""
    _, start_of_month, _ = get_current_month_range()

    categories = db.query(Category).filter(
        Category.user_id == current_user.id,
        Category.type == "expense"
    ).all()

    month_txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_of_month,
        Transaction.type == "expense"
    ).all()

    cat_spent_map = {c.code: 0.0 for c in categories}
    for t in month_txs:
        cat_spent_map[t.category] = cat_spent_map.get(t.category, 0.0) + t.amount

    result = []
    for c in categories:
        spent = cat_spent_map.get(c.code, 0.0)
        budget = c.default_budget
        pct = (spent / budget * 100) if budget > 0 else 0.0
        result.append({
            "id": c.code,
            "code": c.code,
            "name_key": c.name_key,
            "icon": c.icon,
            "color": c.color,
            "budget": budget,
            "spent": round(spent, 2),
            "remaining": round(budget - spent, 2),
            "percent": min(100, round(pct)),
            "raw_percent": round(pct),
            "is_exceeded": spent > budget and budget > 0,
            "is_warning": 80 <= pct <= 100
        })

    return result
