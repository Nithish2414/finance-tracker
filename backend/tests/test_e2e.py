import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

@pytest.fixture
async def ac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

@pytest.mark.anyio
async def test_frontend_static_serving(ac):
    """Test that frontend files (index.html, CSS, JS) are served directly by FastAPI with Landing & Auth components."""
    # 1. Root index.html
    res = await ac.get("/")
    assert res.status_code == 200
    assert "Wally" in res.text
    assert "backendStatusPill" in res.text
    assert "slide-landing" in res.text
    assert "slide-auth" in res.text
    assert "signInForm" in res.text
    assert "signUpForm" in res.text
    assert "navPublicActions" in res.text
    assert "navAuthActions" in res.text
    assert "js/api.js" in res.text

    # 2. CSS serving
    res = await ac.get("/css/style.css")
    assert res.status_code == 200
    assert "backend-status-pill" in res.text
    assert "landing-hero" in res.text
    assert "auth-card" in res.text
    assert "auth-form" in res.text

    # 3. JS serving
    res = await ac.get("/js/api.js")
    assert res.status_code == 200
    assert "ApiClient" in res.text

    res = await ac.get("/js/state.js")
    assert res.status_code == 200
    assert "syncWithBackend" in res.text
    assert "clearSessionData" in res.text

    res = await ac.get("/js/app.js")
    assert res.status_code == 200
    assert "showLanding" in res.text
    assert "showAuth" in res.text
    assert "bindAuthForms" in res.text

@pytest.mark.anyio
async def test_full_student_lifecycle(ac):
    """Test end-to-end student lifecycle: auth -> budget -> transactions -> analytics -> export."""
    # 1. Demo Login
    res = await ac.post("/api/auth/demo")
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check Categories
    res = await ac.get("/api/categories", headers=headers)
    assert res.status_code == 200
    cats = res.json()
    cat_codes = [c["code"] for c in cats]
    assert "food" in cat_codes
    assert "allowance" in cat_codes

    # 3. Add Expense
    res = await ac.post("/api/transactions", headers=headers, json={
        "title": "College Library Xerox",
        "amount": 80.0,
        "category": "books",
        "payment_method": "pay_upi",
        "type": "expense"
    })
    assert res.status_code == 201
    created_id = res.json()["id"]

    # 4. Add Income
    res = await ac.post("/api/transactions", headers=headers, json={
        "title": "Parent Allowance Transfer",
        "amount": 5000.0,
        "category": "allowance",
        "payment_method": "pay_bank",
        "type": "income"
    })
    assert res.status_code == 201

    # 5. Check Dashboard Summary reflects transactions
    res = await ac.get("/api/analytics/summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    assert summary["total_income"] >= 5000.0
    assert summary["runway_days"] >= 0

    # 6. Check Pacing
    res = await ac.get("/api/analytics/pacing", headers=headers)
    assert res.status_code == 200
    pacing = res.json()
    assert len(pacing["points"]) > 20

    # 7. Clean up test transaction
    res = await ac.delete(f"/api/transactions/{created_id}", headers=headers)
    assert res.status_code == 200
