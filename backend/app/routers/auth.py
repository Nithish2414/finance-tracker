from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, UserProfileOut, UserProfileUpdate, TokenResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.seed import seed_categories_for_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new student account without any sample transactions."""
    email_clean = user_data.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    new_user = User(
        email=email_clean,
        password_hash=hash_password(user_data.password),
        name=user_data.name.strip() if user_data.name else "College Student",
        university=user_data.university.strip() if user_data.university else "University",
        year=user_data.year or "Semester 1",
        monthly_allowance=user_data.monthly_allowance if user_data.monthly_allowance is not None else 15000.0,
        currency=user_data.currency or "₹"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize default category templates ONLY - NO sample transactions!
    seed_categories_for_user(db, new_user.id)

    token = create_access_token(new_user.id, new_user.email)
    return TokenResponse(access_token=token, token_type="bearer", user=UserProfileOut.model_validate(new_user))

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate student using email and password."""
    email_clean = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, token_type="bearer", user=UserProfileOut.model_validate(user))

@router.post("/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """Convenience guest/demo login for testing."""
    demo_email = "arjun.sharma@college.edu"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            password_hash=hash_password("demopassword123"),
            name="Arjun Sharma",
            university="National Institute of Technology",
            year="3rd Year",
            monthly_allowance=15000.0,
            currency="₹"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_categories_for_user(db, user.id)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, token_type="bearer", user=UserProfileOut.model_validate(user))

@router.get("/me", response_model=UserProfileOut)
def get_profile(current_user: User = Depends(get_current_user)):
    """Fetch current student profile details."""
    return UserProfileOut.model_validate(current_user)

@router.put("/profile", response_model=UserProfileOut)
def update_profile(
    updates: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile attributes (name, university, allowance, currency, etc.)."""
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(current_user, key) and value is not None:
            setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    return UserProfileOut.model_validate(current_user)
