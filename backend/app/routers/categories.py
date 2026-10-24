from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Category
from app.schemas import CategoryOut, BudgetBatchUpdate
from app.auth import get_current_user
from app.seed import seed_categories_for_user

router = APIRouter(prefix="/api/categories", tags=["Categories & Budgets"])

@router.get("", response_model=List[CategoryOut])
def get_categories(
    category_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all categories (expense and income) for current user."""
    # Ensure categories are seeded for user
    cats = db.query(Category).filter(Category.user_id == current_user.id)
    if category_type:
        cats = cats.filter(Category.type == category_type)
    
    cat_list = cats.all()
    if not cat_list:
        seed_categories_for_user(db, current_user.id)
        cat_list = db.query(Category).filter(Category.user_id == current_user.id).all()

    # Map to schema with `id` set to code for full frontend backwards-compatibility
    result = []
    for c in cat_list:
        result.append(CategoryOut(
            id=c.code,
            code=c.code,
            name_key=c.name_key,
            icon=c.icon,
            color=c.color,
            type=c.type,
            default_budget=c.default_budget
        ))
    return result

@router.put("/budgets", response_model=List[CategoryOut])
def update_budgets(
    batch: BudgetBatchUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch update monthly budget allocations by category code."""
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    cat_map = {c.code: c for c in categories}

    for code, new_budget in batch.budgets.items():
        if code in cat_map:
            cat_map[code].default_budget = max(0.0, float(new_budget))

    db.commit()

    return [
        CategoryOut(
            id=c.code,
            code=c.code,
            name_key=c.name_key,
            icon=c.icon,
            color=c.color,
            type=c.type,
            default_budget=c.default_budget
        )
        for c in categories
    ]

@router.post("/smart-allocation", response_model=List[CategoryOut])
def apply_smart_college_rule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply the 50/30/20 College Student Rule based on monthly allowance:
    - 50% Needs: Food (25%), Accommodation/Mess (15%), Transport (10%)
    - 30% Wants: Entertainment (10%), Shopping (10%), Groceries (10%)
    - 20% Savings/Buffer: Books & Study (10%), Health & Emergency (5%), Utilities (5%)
    """
    allowance = current_user.monthly_allowance or 15000.0

    distribution = {
        "food": round(allowance * 0.25),
        "accommodation": round(allowance * 0.15),
        "transport": round(allowance * 0.10),
        "entertainment": round(allowance * 0.10),
        "shopping": round(allowance * 0.10),
        "groceries": round(allowance * 0.10),
        "books": round(allowance * 0.10),
        "health": round(allowance * 0.05),
        "utilities": round(allowance * 0.05),
        "other": round(allowance * 0.00)
    }

    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    for c in categories:
        if c.code in distribution:
            c.default_budget = float(distribution[c.code])

    db.commit()

    return [
        CategoryOut(
            id=c.code,
            code=c.code,
            name_key=c.name_key,
            icon=c.icon,
            color=c.color,
            type=c.type,
            default_budget=c.default_budget
        )
        for c in categories
    ]
