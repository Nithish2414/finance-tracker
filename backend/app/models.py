import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), default="Arjun Sharma")
    university = Column(String(150), default="National Institute of Technology")
    year = Column(String(100), default="3rd Year (Semester 5)")
    monthly_allowance = Column(Float, default=15000.0)
    currency = Column(String(10), default="₹")
    sound_enabled = Column(Boolean, default=True)
    avatar = Column(String(10), default="🎓")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)  # e.g., 'food', 'transport', 'allowance'
    name_key = Column(String(50), nullable=False)  # e.g., 'cat_food'
    icon = Column(String(10), nullable=False)
    color = Column(String(20), nullable=False)
    type = Column(String(20), default="expense")  # 'expense' or 'income'
    default_budget = Column(Float, default=0.0)

    user = relationship("User", back_populates="categories")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)  # category code
    payment_method = Column(String(50), default="pay_upi")
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, default="", nullable=True)
    type = Column(String(20), default="expense")  # 'expense' or 'income'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
