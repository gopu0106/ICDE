import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class API {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

              const { accessToken } = response.data;
              localStorage.setItem('accessToken', accessToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    fullName: string;
    studentId?: string;
    phone?: string;
    role?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await this.client.post('/auth/logout', { refreshToken });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // Wallet endpoints
  async getWalletBalance() {
    const response = await this.client.get('/wallet/balance');
    return response.data;
  }

  async getWalletSummary() {
    const response = await this.client.get('/wallet/summary');
    return response.data;
  }

  async getWalletTransactions(limit = 50, offset = 0) {
    const response = await this.client.get('/wallet/transactions', {
      params: { limit, offset },
    });
    return response.data;
  }

  async topupWallet(amount: number, paymentMethod?: string, paymentReference?: string) {
    const response = await this.client.post('/wallet/topup', {
      amount,
      paymentMethod,
      paymentReference,
    });
    return response.data;
  }

  async payMessFee(amount: number, academicYear: string, semester?: string) {
    const response = await this.client.post('/wallet/mess-fee', {
      amount,
      academicYear,
      semester,
    });
    return response.data;
  }

  // QR endpoints
  async generateStudentQR() {
    const response = await this.client.get('/qr/student');
    return response.data;
  }

  async generateCounterQR(vendorId: string) {
    const response = await this.client.get(`/qr/counter/${vendorId}`);
    return response.data;
  }

  // Meal endpoints
  async processMeal(data: {
    studentQR?: string;
    counterQR?: string;
    vendorId: string;
    menuItemId: string;
    amount?: number;
  }) {
    const endpoint = data.studentQR ? '/meals/process' : '/meals/process-scan';
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async getMealHistory(limit = 50, offset = 0) {
    const response = await this.client.get('/meals/history', {
      params: { limit, offset },
    });
    return response.data;
  }

  // Vendor endpoints
  async getVendor(vendorId: string) {
    const response = await this.client.get(`/vendors/${vendorId}`);
    return response.data;
  }

  async getVendorMenu(vendorId: string, available?: boolean) {
    const response = await this.client.get(`/vendors/${vendorId}/menu`, {
      params: { available },
    });
    return response.data;
  }

  async getVendorPerformance(vendorId: string, startDate?: string, endDate?: string) {
    const response = await this.client.get(`/vendors/${vendorId}/performance`, {
      params: { startDate, endDate },
    });
    return response.data;
  }

  // Admin endpoints
  async getAnalyticsOverview(startDate?: string, endDate?: string) {
    const response = await this.client.get('/admin/analytics/overview', {
      params: { startDate, endDate },
    });
    return response.data;
  }

  async getConsumptionTrends(startDate?: string, endDate?: string, mealType?: string) {
    const response = await this.client.get('/admin/analytics/consumption', {
      params: { startDate, endDate, mealType },
    });
    return response.data;
  }

  async createSettlement(data: {
    vendorId: string;
    periodStart: string;
    periodEnd: string;
    commissionRate?: number;
  }) {
    const response = await this.client.post('/admin/settlements/create', data);
    return response.data;
  }

  async getAuditLogs(limit = 100, offset = 0, entityType?: string, entityId?: string) {
    const response = await this.client.get('/admin/audit-logs', {
      params: { limit, offset, entityType, entityId },
    });
    return response.data;
  }
}

export const api = new API();



