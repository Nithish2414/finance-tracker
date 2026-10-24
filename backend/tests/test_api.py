import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

@pytest.mark.anyio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Wally" in data["app"]

@pytest.mark.anyio
async def test_demo_auth_and_profile(client):
    # 1. Demo login
    res = await client.post("/api/auth/demo")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "arjun.sharma@college.edu"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    res = await client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Arjun Sharma"

    # 3. Update profile
    res = await client.put(
        "/api/auth/profile",
        headers=headers,
        json={"monthly_allowance": 18000.0, "currency": "₹"}
    )
    assert res.status_code == 200
    assert res.json()["monthly_allowance"] == 18000.0

@pytest.mark.anyio
async def test_user_registration_and_login(client):
    unique_email = "student.test@college.edu"
    reg_data = {
        "email": unique_email,
        "password": "testpassword123",
        "name": "Test Student",
        "university": "State University",
        "monthly_allowance": 12000.0
    }
    # Register
    res = await client.post("/api/auth/register", json=reg_data)
    assert res.status_code in [201, 400]  # 400 if already created in earlier test run

    # Login
    res = await client.post("/api/auth/login", json={"email": unique_email, "password": "testpassword123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

@pytest.mark.anyio
async def test_categories_and_budgets(client):
    # Demo token
    res = await client.post("/api/auth/demo")
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 1. Fetch categories
    res = await client.get("/api/categories", headers=headers)
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) >= 16  # 10 expense + 6 income categories

    expense_cats = [c for c in cats if c["type"] == "expense"]
    income_cats = [c for c in cats if c["type"] == "income"]
    assert len(expense_cats) == 10
    assert len(income_cats) == 6

    # 2. Update budgets batch
    res = await client.put(
        "/api/categories/budgets",
        headers=headers,
        json={"budgets": {"food": 4000.0, "transport": 1500.0}}
    )
    assert res.status_code == 200
    updated_cats = {c["code"]: c["default_budget"] for c in res.json()}
    assert updated_cats["food"] == 4000.0
    assert updated_cats["transport"] == 1500.0

    # 3. Smart 50/30/20 College allocation
    res = await client.post("/api/categories/smart-allocation", headers=headers)
    assert res.status_code == 200
    smart_cats = {c["code"]: c["default_budget"] for c in res.json()}
    assert smart_cats["food"] > 0
    assert smart_cats["entertainment"] > 0

@pytest.mark.anyio
async def test_transactions_crud(client):
    res = await client.post("/api/auth/demo")
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 1. Create an expense transaction
    expense_data = {
        "title": "Campus Canteen Samosa & Tea",
        "amount": 60.0,
        "category": "food",
        "payment_method": "pay_upi",
        "notes": "Evening snack with batchmates",
        "type": "expense"
    }
    res = await client.post("/api/transactions", headers=headers, json=expense_data)
    assert res.status_code == 201
    created_exp = res.json()
    assert created_exp["title"] == "Campus Canteen Samosa & Tea"
    assert created_exp["amount"] == 60.0
    exp_id = created_exp["id"]

    # 2. Create an income transaction
    income_data = {
        "title": "Department Hackathon Prize",
        "amount": 3000.0,
        "category": "gifts",
        "payment_method": "pay_bank",
        "notes": "1st Runner Up Hackathon Award",
        "type": "income"
    }
    res = await client.post("/api/transactions", headers=headers, json=income_data)
    assert res.status_code == 201
    created_inc = res.json()
    assert created_inc["amount"] == 3000.0
    assert created_inc["type"] == "income"

    # 3. Query transactions with filter
    res = await client.get("/api/transactions?category=food", headers=headers)
    assert res.status_code == 200
    food_txs = res.json()
    assert all(t["category"] == "food" for t in food_txs)

    # 4. Search query
    res = await client.get("/api/transactions?search=Samosa", headers=headers)
    assert res.status_code == 200
    search_txs = res.json()
    assert any("Samosa" in t["title"] for t in search_txs)

    # 5. Update transaction
    res = await client.put(f"/api/transactions/{exp_id}", headers=headers, json={"amount": 75.0})
    assert res.status_code == 200
    assert res.json()["amount"] == 75.0

    # 6. Delete transaction
    res = await client.delete(f"/api/transactions/{exp_id}", headers=headers)
    assert res.status_code == 200

    # Verify deleted
    res = await client.get(f"/api/transactions/{exp_id}", headers=headers)
    assert res.status_code == 404

@pytest.mark.anyio
async def test_analytics_and_dashboard(client):
    res = await client.post("/api/auth/demo")
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 1. Summary
    res = await client.get("/api/analytics/summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    assert "money_left" in summary
    assert "monthly_budget" in summary
    assert "total_spent" in summary
    assert "total_income" in summary
    assert "runway_days" in summary
    assert "daily_avg_spent" in summary
    assert "active_alerts" in summary

    # 2. Pacing curve
    res = await client.get("/api/analytics/pacing", headers=headers)
    assert res.status_code == 200
    pacing = res.json()
    assert "points" in pacing
    assert len(pacing["points"]) >= 28
    assert pacing["current_day"] > 0

    # 3. Category breakdown
    res = await client.get("/api/analytics/category-spending", headers=headers)
    assert res.status_code == 200
    breakdown = res.json()
    assert isinstance(breakdown, list)

@pytest.mark.anyio
async def test_csv_export(client):
    res = await client.post("/api/auth/demo")
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = await client.get("/api/transactions/export/csv", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    text = res.text
    assert "ID,Type,Title,Amount,Currency" in text
