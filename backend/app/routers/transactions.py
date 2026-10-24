import io
import csv
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database import get_db
from app.models import User, Transaction
from app.schemas import TransactionCreate, TransactionUpdate, TransactionOut
from app.auth import get_current_user
from app.seed import seed_sample_transactions_for_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("", response_model=List[TransactionOut])
def get_transactions(
    search: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    transaction_type: Optional[str] = None,  # 'expense' or 'income'
    timeframe: Optional[str] = "all",  # 'today', 'this_week', 'this_month', 'all'
    sort_by: Optional[str] = "date_desc",  # 'date_desc', 'date_asc', 'amount_desc', 'amount_asc'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Query transactions with search, category/payment/timeframe filters, and sorting."""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    # Search filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Transaction.title.ilike(term), Transaction.notes.ilike(term)))

    # Category filter
    if category and category != "all":
        query = query.filter(Transaction.category == category)

    # Payment filter
    if payment_method and payment_method != "all":
        query = query.filter(Transaction.payment_method == payment_method)

    # Type filter
    if transaction_type and transaction_type != "all":
        query = query.filter(Transaction.type == transaction_type)

    # Timeframe filter
    now = datetime.now(timezone.utc)
    if timeframe == "today":
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Transaction.date >= start_of_day)
    elif timeframe == "this_week":
        start_of_week = now - timedelta(days=7)
        query = query.filter(Transaction.date >= start_of_week)
    elif timeframe == "this_month":
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Transaction.date >= start_of_month)

    # Sorting
    if sort_by == "date_asc":
        query = query.order_by(asc(Transaction.date))
    elif sort_by == "amount_desc":
        query = query.order_by(desc(Transaction.amount))
    elif sort_by == "amount_asc":
        query = query.order_by(asc(Transaction.amount))
    else:  # default date_desc
        query = query.order_by(desc(Transaction.date))

    return query.all()

@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new expense or income transaction."""
    tx_date = tx_in.date or datetime.now(timezone.utc)
    new_tx = Transaction(
        user_id=current_user.id,
        title=tx_in.title.strip(),
        amount=round(float(tx_in.amount), 2),
        category=tx_in.category,
        payment_method=tx_in.payment_method or "pay_upi",
        date=tx_date,
        notes=(tx_in.notes or "").strip(),
        type=tx_in.type or "expense"
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return new_tx

@router.get("/{tx_id}", response_model=TransactionOut)
def get_transaction_by_id(
    tx_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch a single transaction by ID."""
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return tx

@router.put("/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: str,
    tx_update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit an existing transaction."""
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    update_data = tx_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(tx, field, val)

    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{tx_id}", status_code=status.HTTP_200_OK)
def delete_transaction(
    tx_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction."""
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    db.delete(tx)
    db.commit()
    return {"message": "Transaction deleted successfully", "id": tx_id}

@router.get("/export/csv")
def export_transactions_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all student transactions into a downloadable CSV."""
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(desc(Transaction.date)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Type", "Title", "Amount", "Currency", "Category", "Payment Method", "Date", "Notes"])

    currency = current_user.currency or "₹"
    for t in txs:
        writer.writerow([
            t.id,
            t.type,
            t.title,
            t.amount,
            currency,
            t.category,
            t.payment_method,
            t.date.isoformat() if t.date else "",
            t.notes or ""
        ])

    csv_data = output.getvalue()
    filename = f"fincampus_transactions_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/reset-sample", status_code=status.HTTP_200_OK)
def reset_sample_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset transactions to the realistic college student sample dataset."""
    seed_sample_transactions_for_user(db, current_user.id)
    return {"message": "Sample transactions reloaded successfully."}
