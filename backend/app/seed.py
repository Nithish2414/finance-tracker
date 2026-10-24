import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import User, Category, Transaction
from app.auth import hash_password

DEFAULT_EXPENSE_CATEGORIES = [
    {"code": "food", "name_key": "cat_food", "icon": "🍜", "color": "#ED6A4B", "default_budget": 0.0, "type": "expense"},
    {"code": "transport", "name_key": "cat_transport", "icon": "🚌", "color": "#AEC9D5", "default_budget": 0.0, "type": "expense"},
    {"code": "books", "name_key": "cat_books", "icon": "📚", "color": "#C69A53", "default_budget": 0.0, "type": "expense"},
    {"code": "entertainment", "name_key": "cat_entertainment", "icon": "🎬", "color": "#263A41", "default_budget": 0.0, "type": "expense"},
    {"code": "accommodation", "name_key": "cat_accommodation", "icon": "🏠", "color": "#13252D", "default_budget": 0.0, "type": "expense"},
    {"code": "groceries", "name_key": "cat_groceries", "icon": "🛒", "color": "#A5C4AE", "default_budget": 0.0, "type": "expense"},
    {"code": "shopping", "name_key": "cat_shopping", "icon": "🛍️", "color": "#C69A53", "default_budget": 0.0, "type": "expense"},
    {"code": "health", "name_key": "cat_health", "icon": "💊", "color": "#ED6A4B", "default_budget": 0.0, "type": "expense"},
    {"code": "utilities", "name_key": "cat_utilities", "icon": "📱", "color": "#6D7B78", "default_budget": 0.0, "type": "expense"},
    {"code": "other", "name_key": "cat_other", "icon": "🏷️", "color": "#AEC9D5", "default_budget": 0.0, "type": "expense"},
]

DEFAULT_INCOME_CATEGORIES = [
    {"code": "allowance", "name_key": "cat_inc_allowance", "icon": "💰", "color": "#10B981", "default_budget": 0.0, "type": "income"},
    {"code": "freelance", "name_key": "cat_inc_freelance", "icon": "💼", "color": "#3B82F6", "default_budget": 0.0, "type": "income"},
    {"code": "scholarship", "name_key": "cat_inc_scholarship", "icon": "🎓", "color": "#C69A53", "default_budget": 0.0, "type": "income"},
    {"code": "stipend", "name_key": "cat_inc_stipend", "icon": "💵", "color": "#8B5CF6", "default_budget": 0.0, "type": "income"},
    {"code": "gifts", "name_key": "cat_inc_gifts", "icon": "🎁", "color": "#ED6A4B", "default_budget": 0.0, "type": "income"},
    {"code": "other_income", "name_key": "cat_inc_other", "icon": "🏷️", "color": "#6D7B78", "default_budget": 0.0, "type": "income"},
]

def seed_categories_for_user(db: Session, user_id: int):
    """Seed the standard 10 expense and 6 income categories for a user with clean 0 budgets."""
    all_defaults = DEFAULT_EXPENSE_CATEGORIES + DEFAULT_INCOME_CATEGORIES
    for cat_data in all_defaults:
        exists = db.query(Category).filter(
            Category.user_id == user_id,
            Category.code == cat_data["code"]
        ).first()
        if not exists:
            cat = Category(
                user_id=user_id,
                code=cat_data["code"],
                name_key=cat_data["name_key"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                type=cat_data["type"],
                default_budget=cat_data["default_budget"]
            )
            db.add(cat)
    db.commit()

def seed_sample_transactions_for_user(db: Session, user_id: int):
    """Seed sample transactions ONLY when explicitly called by user (e.g. Reset Sample Data)."""
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    now = datetime.now(timezone.utc)
    cur_year = now.year
    cur_month = now.month
    cur_day = now.day

    def make_date(days_ago: int, hour: int = 14, minute: int = 30) -> str:
        d = max(1, cur_day - days_ago)
        dt = datetime(cur_year, cur_month, d, hour, minute, tzinfo=timezone.utc)
        return dt.isoformat()

    sample_txs = [
        {"title": "Monthly Pocket Money / Allowance", "amount": 15000.0, "category": "allowance", "payment_method": "pay_bank", "date": datetime(cur_year, cur_month, 1, 10, 0, tzinfo=timezone.utc).isoformat(), "notes": "Allowance received from parents", "type": "income"},
        {"title": "Campus Canteen - Dosa & Chai", "amount": 140.0, "category": "food", "payment_method": "pay_upi", "date": make_date(0, 9, 30), "notes": "Breakfast before lecture", "type": "expense"},
        {"title": "Metro Smart Card Recharge", "amount": 500.0, "category": "transport", "payment_method": "pay_upi", "date": make_date(1, 8, 15), "notes": "Monthly student transit pass", "type": "expense"},
        {"title": "Data Structures & Algorithms Book", "amount": 720.0, "category": "books", "payment_method": "pay_debit", "date": make_date(2, 16, 45), "notes": "Core reference book recommended by prof", "type": "expense"},
        {"title": "Weekend Movie & Popcorn with Friends", "amount": 650.0, "category": "entertainment", "payment_method": "pay_upi", "date": make_date(3, 19, 30), "notes": "Evening cinema outing", "type": "expense"},
    ]

    for idx, tx_data in enumerate(sample_txs):
        tx = Transaction(
            id=f"tx-{user_id}-{idx+1}-{uuid.uuid4().hex[:6]}",
            user_id=user_id,
            title=tx_data["title"],
            amount=tx_data["amount"],
            category=tx_data["category"],
            payment_method=tx_data["payment_method"],
            date=tx_data["date"],
            notes=tx_data["notes"],
            type=tx_data["type"]
        )
        db.add(tx)
    db.commit()

def seed_database(db: Session):
    """Lifecycle startup hook: database is ready with clean user-isolated schema."""
    pass
