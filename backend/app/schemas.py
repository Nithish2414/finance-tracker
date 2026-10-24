from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=4)
    name: Optional[str] = "Arjun Sharma"
    university: Optional[str] = "National Institute of Technology"
    year: Optional[str] = "3rd Year (Semester 5)"
    monthly_allowance: Optional[float] = 15000.0
    currency: Optional[str] = "₹"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    university: str
    year: str
    monthly_allowance: float
    currency: str
    sound_enabled: bool
    avatar: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    university: Optional[str] = None
    year: Optional[str] = None
    monthly_allowance: Optional[float] = None
    currency: Optional[str] = None
    sound_enabled: Optional[bool] = None
    avatar: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileOut

# --- Category & Budget Schemas ---
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str  # code for frontend compatibility
    code: str
    name_key: str
    icon: str
    color: str
    type: str  # 'expense' or 'income'
    default_budget: float

class BudgetBatchUpdate(BaseModel):
    budgets: Dict[str, float]  # mapping code -> new budget amount

# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    title: str
    amount: float = Field(..., gt=0)
    category: str
    payment_method: Optional[str] = "pay_upi"
    date: Optional[datetime] = None
    notes: Optional[str] = ""
    type: Optional[str] = "expense"  # 'expense' or 'income'

class TransactionUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    payment_method: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None
    type: Optional[str] = None

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    amount: float
    category: str
    payment_method: str
    date: datetime
    notes: Optional[str] = ""
    type: str
    created_at: datetime

# --- Analytics & Dashboard Schemas ---
class AlertItem(BaseModel):
    type: str  # 'danger', 'warning', 'info'
    icon: str
    category: Optional[str] = None
    title: str
    message: str
    over_amount: Optional[float] = 0.0

class DashboardSummary(BaseModel):
    money_left: float
    monthly_budget: float
    total_spent: float
    total_income: float
    daily_avg_spent: float
    runway_days: int
    days_left_in_month: int
    active_alerts: List[AlertItem]
    top_category: Optional[Dict[str, Any]] = None
    largest_expense: Optional[TransactionOut] = None

class PacingPoint(BaseModel):
    day: int
    label: str
    actual: Optional[float]
    ideal: float

class AnalyticsPacingOut(BaseModel):
    points: List[PacingPoint]
    current_day: int
    days_in_month: int
    ideal_daily_budget: float
    currency: str
