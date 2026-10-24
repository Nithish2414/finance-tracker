// Wally Python Backend API Client
class ApiClient {
  constructor() {
    // Automatically detect backend URL
    this.baseUrl = (window.location.port === "8000" || (window.location.protocol.startsWith("http") && window.location.port === ""))
      ? ""
      : "http://localhost:8000";
    this.token = localStorage.getItem("wally_token") || null;
    this.isOnline = false;
    this.onStatusChange = null;
  }

  async init() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { method: "GET" });
      if (res.ok) {
        this.isOnline = true;
        // If no token stored, authenticate as default demo student
        if (!this.token) {
          await this.loginDemo();
        }
        if (this.onStatusChange) this.onStatusChange(true);
        console.log("🟢 Connected to Wally Python FastAPI Backend at", this.baseUrl || window.location.origin);
        return true;
      }
    } catch (e) {
      this.isOnline = false;
      if (this.onStatusChange) this.onStatusChange(false);
      console.warn("⚠️ Python backend not reachable, operating in offline/localStorage mode:", e.message);
      return false;
    }
  }

  async loginDemo() {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/demo`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        this.token = data.access_token;
        localStorage.setItem("wally_token", this.token);
        return data.user;
      }
    } catch (e) {
      console.error("Demo login error:", e);
    }
    return null;
  }

  async request(endpoint, options = {}) {
    if (!this.isOnline) return null;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (res.status === 401) {
        // Token expired; refresh demo token
        await this.loginDemo();
        if (this.token) {
          headers["Authorization"] = `Bearer ${this.token}`;
          return (await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers })).json();
        }
      }

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.detail || `HTTP Error ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }
      return res;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // --- Auth & Profile ---
  async getProfile() {
    return this.request("/api/auth/me");
  }

  async updateProfile(updates) {
    return this.request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  }

  // --- Categories & Budgets ---
  async getCategories() {
    return this.request("/api/categories");
  }

  async updateBudgets(budgets) {
    return this.request("/api/categories/budgets", {
      method: "PUT",
      body: JSON.stringify({ budgets })
    });
  }

  async applySmartAllocation() {
    return this.request("/api/categories/smart-allocation", {
      method: "POST"
    });
  }

  // --- Transactions ---
  async getTransactions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/transactions${q ? `?${q}` : ""}`);
  }

  async createTransaction(txData) {
    return this.request("/api/transactions", {
      method: "POST",
      body: JSON.stringify(txData)
    });
  }

  async updateTransaction(id, txData) {
    return this.request(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(txData)
    });
  }

  async deleteTransaction(id) {
    return this.request(`/api/transactions/${id}`, {
      method: "DELETE"
    });
  }

  async resetSampleTransactions() {
    return this.request("/api/transactions/reset-sample", {
      method: "POST"
    });
  }

  // --- Analytics ---
  async getDashboardSummary() {
    return this.request("/api/analytics/summary");
  }

  async getPacingCurve() {
    return this.request("/api/analytics/pacing");
  }

  async getCategorySpending() {
    return this.request("/api/analytics/category-spending");
  }
}

// Global API client instance
const api = new ApiClient();
