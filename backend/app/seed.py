import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import User, Category, Transaction
from app.auth import hash_password

DEFAULT_EXPENSE_CATEGORIES = [
    {"code": "food", "name_key": "cat_food", "icon": "🍜", "color": "#ED6A4B", "default_budget": 3500.0, "type": "expense"},
    {"code": "transport", "name_key": "cat_transport", "icon": "🚌", "color": "#AEC9D5", "default_budget": 1200.0, "type": "expense"},
    {"code": "books", "name_key": "cat_books", "icon": "📚", "color": "#C69A53", "default_budget": 1000.0, "type": "expense"},
    {"code": "entertainment", "name_key": "cat_entertainment", "icon": "🎬", "color": "#263A41", "default_budget": 1500.0, "type": "expense"},
    {"code": "accommodation", "name_key": "cat_accommodation", "icon": "🏠", "color": "#13252D", "default_budget": 4000.0, "type": "expense"},
    {"code": "groceries", "name_key": "cat_groceries", "icon": "🛒", "color": "#A5C4AE", "default_budget": 1200.0, "type": "expense"},
    {"code": "shopping", "name_key": "cat_shopping", "icon": "🛍️", "color": "#C69A53", "default_budget": 1000.0, "type": "expense"},
    {"code": "health", "name_key": "cat_health", "icon": "💊", "color": "#ED6A4B", "default_budget": 600.0, "type": "expense"},
    {"code": "utilities", "name_key": "cat_utilities", "icon": "📱", "color": "#6D7B78", "default_budget": 500.0, "type": "expense"},
    {"code": "other", "name_key": "cat_other", "icon": "🏷️", "color": "#AEC9D5", "default_budget": 500.0, "type": "expense"},
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
    """Seed the default 10 expense and 6 income categories for a specific user."""
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
    """Seed realistic student allowance and expense transactions."""
    now = datetime.now(timezone.utc)
    
    # Remove existing transactions for this user
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    
    samples = [
        {
            "title": "Campus Canteen - Dosa & Chai",
            "amount": 140.0,
            "category": "food",
            "payment_method": "pay_upi",
            "date": now - timedelta(hours=4),
            "notes": "Breakfast with Rohan before lecture",
            "type": "expense"
        },
        {
            "title": "Metro Smart Card Recharge",
            "amount": 500.0,
            "category": "transport",
            "payment_method": "pay_upi",
            "date": now - timedelta(hours=28),
            "notes": "Monthly student transit pass",
            "type": "expense"
        },
        {
            "title": "Data Structures & Algorithms Book",
            "amount": 720.0,
            "category": "books",
            "payment_method": "pay_debit",
            "date": now - timedelta(hours=52),
            "notes": "Core reference book recommended by prof",
            "type": "expense"
        },
        {
            "title": "Weekend Movie & Popcorn with Roommates",
            "amount": 650.0,
            "category": "entertainment",
            "payment_method": "pay_upi",
            "date": now - timedelta(hours=76),
            "notes": "IMAX evening show",
            "type": "expense"
        },
        {
            "title": "Hostel Mess Advance / Share",
            "amount": 2800.0,
            "category": "food",
            "payment_method": "pay_bank",
            "date": now - timedelta(hours=120),
            "notes": "Monthly lunch & dinner subscription",
            "type": "expense"
        },
        {
            "title": "Campus Xerox & Project Spiral Binding",
            "amount": 180.0,
            "category": "books",
            "payment_method": "pay_cash",
            "date": now - timedelta(hours=140),
            "notes": "OS and Networks lab manual copies",
            "type": "expense"
        },
        {
            "title": "Hostel Essentials & Toiletries",
            "amount": 320.0,
            "category": "groceries",
            "payment_method": "pay_upi",
            "date": now - timedelta(hours=170),
            "notes": "Supermarket run",
            "type": "expense"
        },
        {
            "title": "Campus Cafe Cappuccino & Sandwich",
            "amount": 220.0,
            "category": "food",
            "payment_method": "pay_upi",
            "date": now - timedelta(hours=200),
            "notes": "Study session break",
            "type": "expense"
        },
        {
            "title": "Monthly Allowance from Parents",
            "amount": 5000.0,
            "category": "allowance",
            "payment_method": "pay_bank",
            "date": now - timedelta(days=5),
            "notes": "Monthly student pocket allowance",
            "type": "income"
        },
        {
            "title": "Website Design Freelance Gig",
            "amount": 2500.0,
            "category": "freelance",
            "payment_method": "pay_upi",
            "date": now - timedelta(days=2),
            "notes": "Landing page design for department symposium",
            "type": "income"
        }
    ]

    for idx, item in enumerate(samples, start=1):
        tx = Transaction(
            id=f"tx-{user_id}-{idx}",
            user_id=user_id,
            title=item["title"],
            amount=item["amount"],
            category=item["category"],
            payment_method=item["payment_method"],
            date=item["date"],
            notes=item["notes"],
            type=item["type"]
        )
        db.add(tx)
    db.commit()

def seed_database(db: Session):
    """Seed the default demo user and initial data."""
    user = db.query(User).filter(User.email == "arjun.sharma@college.edu").first()
    if not user:
        user = User(
            email="arjun.sharma@college.edu",
            password_hash=hash_password("college123"),
            name="Arjun Sharma",
            university="National Institute of Technology",
            year="3rd Year (Semester 5)",
            monthly_allowance=15000.0,
            currency="₹",
            sound_enabled=True,
            avatar="🎓"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    seed_categories_for_user(db, user.id)
    
    # If no transactions exist, seed sample transactions
    tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
    if tx_count == 0:
        seed_sample_transactions_for_user(db, user.id)
