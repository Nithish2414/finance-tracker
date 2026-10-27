// Wally Python Backend API Client
class ApiClient {
  constructor() {
    // Same-origin in production (Vercel serves /api through the Python function).
    // A configured URL is supported for split frontend/backend deployments.
    this.baseUrl = (window.API_BASE_URL || "").replace(/\/+$/, "");
    this.token = localStorage.getItem("wally_token") || null;
    this.currentUser = null;
    this.isOnline = false;
    this.onStatusChange = null;
    this.onAuthChange = null;
  }

  async init() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { method: "GET" });
      if (res.ok) {
        this.isOnline = true;
        if (this.onStatusChange) this.onStatusChange(true);

        // Check if there is an existing session token in localStorage
        if (this.token) {
          try {
            const profile = await this.getProfile();
            if (profile && profile.id) {
              this.currentUser = profile;
              console.log("Session restored for:", profile.name, `(${profile.email})`);
              if (this.onAuthChange) this.onAuthChange(this.currentUser);
              return true;
            }
          } catch (authErr) {
            console.warn("Stored token is invalid or expired, resetting session.");
            this.logout();
          }
        }
        return false;
      }
    } catch (e) {
      this.isOnline = false;
      if (this.onStatusChange) this.onStatusChange(false);
      console.warn("Python backend offline / unreachable:", e.message);
      return false;
    }
    return false;
  }

  isAuthenticated() {
    return !!this.token && !!this.currentUser;
  }

  async login(email, password) {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid email or password.");
    }

    const data = await res.json();
    this.token = data.access_token;
    this.currentUser = data.user;
    localStorage.setItem("wally_token", this.token);
    if (this.onAuthChange) this.onAuthChange(this.currentUser);
    return data.user;
  }

  async register(userData) {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed.");
    }

    const data = await res.json();
    this.token = data.access_token;
    this.currentUser = data.user;
    localStorage.setItem("wally_token", this.token);
    if (this.onAuthChange) this.onAuthChange(this.currentUser);
    return data.user;
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem("wally_token");
    if (this.onAuthChange) this.onAuthChange(null);
  }

  async request(endpoint, options = {}) {
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
        console.warn("Session expired (401), logging out.");
        this.logout();
        throw new Error("Authentication required. Please sign in.");
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
