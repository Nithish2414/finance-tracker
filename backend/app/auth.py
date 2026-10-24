import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import SECRET_KEY, TOKEN_EXPIRE_DAYS
from app.database import get_db
from app.models import User

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored salt$hash."""
    try:
        salt, key_hex = hashed.split("$", 1)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def create_access_token(user_id: int, email: str, expires_days: int = TOKEN_EXPIRE_DAYS) -> str:
    """Generate a signed HMAC-SHA256 JWT-like token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=expires_days)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp())
    }

    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[dict]:
    """Validate token signature and expiration, returning payload dictionary."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
        
        # Base64 pad adjustment
        padding = 4 - (len(sig_b64) % 4)
        if padding != 4:
            sig_b64 += "=" * padding
        actual_sig = base64.urlsafe_b64decode(sig_b64.encode())
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        payload_padding = 4 - (len(payload_b64) % 4)
        if payload_padding != 4:
            payload_b64 += "=" * payload_padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())
        
        # Check expiry
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            return None
            
        return payload
    except Exception:
        return None

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency: Extract current user from Bearer token."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found."
        )
    return user
