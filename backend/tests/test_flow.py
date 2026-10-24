import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

@pytest.mark.anyio
async def test_complete_user_flow():
    """
    End-to-End Simulation of:
    - Landing -> Register User 1 -> 0 sample data -> Add spends -> Logout
    - Register User 2 -> 0 sample data -> Complete data isolation
    - Login User 1 -> Exact session restored from where they left
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Unauthenticated root visit (Landing Page)
        res = await client.get("/")
        assert res.status_code == 200
        assert "slide-landing" in res.text
        assert "Keep your pocket money alive" in res.text
        assert "slide-auth" in res.text

        # 2. Register first student
        import uuid
        run_id = uuid.uuid4().hex[:8]
        student1_email = f"alex.{run_id}@college.edu"
        res = await client.post("/api/auth/register", json={
            "email": student1_email,
            "password": "StrongPassword123",
            "name": "Alex Freshman",
            "university": "Apex Tech University",
            "year": "1st Year",
            "monthly_allowance": 12000.0,
            "currency": "₹"
        })
        assert res.status_code == 201
        token1 = res.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # 3. Check clean slate: MUST HAVE 0 TRANSACTIONS
        res = await client.get("/api/transactions", headers=headers1)
        assert res.status_code == 200
        txs = res.json()
        assert len(txs) == 0, f"Expected 0 transactions for new user, got {len(txs)}"

        # Analytics summary must show 0 spent
        res = await client.get("/api/analytics/summary", headers=headers1)
        assert res.status_code == 200
        summary = res.json()
        assert summary["total_spent"] == 0.0
        assert summary["total_income"] == 0.0
        assert summary["money_left"] == 12000.0

        # 4. Student 1 adds an expense and an income
        res = await client.post("/api/transactions", headers=headers1, json={
            "title": "Semester Textbooks & Notes",
            "amount": 1450.0,
            "category": "books",
            "payment_method": "pay_upi",
            "type": "expense"
        })
        assert res.status_code == 201

        res = await client.post("/api/transactions", headers=headers1, json={
            "title": "Freelance Design Gig",
            "amount": 4000.0,
            "category": "freelance",
            "payment_method": "pay_bank",
            "type": "income"
        })
        assert res.status_code == 201

        # Check transactions list now has 2
        res = await client.get("/api/transactions", headers=headers1)
        assert len(res.json()) == 2

        # 5. Student 1 logs out (client drops headers1)

        # 6. Student 2 registers
        student2_email = f"priya.{run_id}@college.edu"
        res = await client.post("/api/auth/register", json={
            "email": student2_email,
            "password": "PriyaPassword456",
            "name": "Priya Sophomore",
            "university": "City Campus",
            "year": "2nd Year",
            "monthly_allowance": 16000.0,
            "currency": "₹"
        })
        assert res.status_code == 201
        token2 = res.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Student 2 MUST ALSO HAVE 0 TRANSACTIONS (isolated from student 1)
        res = await client.get("/api/transactions", headers=headers2)
        assert len(res.json()) == 0

        res = await client.get("/api/analytics/summary", headers=headers2)
        assert res.json()["total_spent"] == 0.0
        assert res.json()["money_left"] == 16000.0

        # 7. Student 1 logs back in
        res = await client.post("/api/auth/login", json={
            "email": student1_email,
            "password": "StrongPassword123"
        })
        assert res.status_code == 200
        restored_token = res.json()["access_token"]
        restored_headers = {"Authorization": f"Bearer {restored_token}"}

        # Verify Student 1's data is restored exactly where they left
        res = await client.get("/api/transactions", headers=restored_headers)
        assert res.status_code == 200
        restored_txs = res.json()
        assert len(restored_txs) == 2
        assert any(t["title"] == "Semester Textbooks & Notes" and t["amount"] == 1450.0 for t in restored_txs)
        assert any(t["title"] == "Freelance Design Gig" and t["amount"] == 4000.0 for t in restored_txs)

        res = await client.get("/api/analytics/summary", headers=restored_headers)
        restored_summary = res.json()
        assert restored_summary["total_spent"] == 1450.0
        assert restored_summary["total_income"] == 4000.0
