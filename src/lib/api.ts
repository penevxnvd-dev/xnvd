// API Client за комуникация с backend сървъра
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Try to parse error message
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }

        // If unauthorized, clear token and redirect
        if (response.status === 401) {
          this.logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth';
          }
        }

        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);
      }

      return {} as T;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || 'Network error');
    }
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async register(email: string, password: string, fullName: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async getCurrentUser() {
    // Check if token exists first
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }
    return this.request<{ user: any }>('/auth/me');
  }

  async updateProfile(fullName: string) {
    return this.request<{ user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ fullName }),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  logout() {
    localStorage.removeItem('token');
    // Also clear any Supabase session if exists
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
    }
  }

  // Countries
  async getCountries() {
    return this.request<any[]>('/countries');
  }

  async createCountry(data: { name: string; code: string }) {
    return this.request<any>('/countries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCountry(id: string, data: { name: string; code: string }) {
    return this.request<any>(`/countries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCountry(id: string) {
    return this.request<{ success: boolean }>(`/countries/${id}`, {
      method: 'DELETE',
    });
  }

  // Cities
  async getCitiesByCountry(countryId: string) {
    return this.request<any[]>(`/cities/country/${countryId}`);
  }

  async createCity(data: { name: string; countryId: string }) {
    return this.request<any>('/cities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCity(id: string, data: { name: string }) {
    return this.request<any>(`/cities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCity(id: string) {
    return this.request<{ success: boolean }>(`/cities/${id}`, {
      method: 'DELETE',
    });
  }

  // Offices
  async getOfficesByCity(cityId: string) {
    return this.request<any[]>(`/offices/city/${cityId}`);
  }

  async getAllOfficesFull() {
    return this.request<any[]>(`/offices/all/full`);
  }

  async getOfficeFull(officeId: string) {
    return this.request<any>(`/offices/${officeId}/full`);
  }

  async createOffice(data: { name: string; cityId: string; address?: string }) {
    return this.request<any>('/offices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOffice(id: string, data: { name: string; address?: string }) {
    return this.request<any>(`/offices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOffice(id: string) {
    return this.request<{ success: boolean }>(`/offices/${id}`, {
      method: 'DELETE',
    });
  }

  // Teams
  async getTeamsByOffice(officeId: string) {
    return this.request<any[]>(`/teams/office/${officeId}`);
  }

  async createTeam(data: { name: string; officeId: string; leaderId?: string }) {
    return this.request<any>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id: string, data: { name: string; leaderId?: string }) {
    return this.request<any>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request<{ success: boolean }>(`/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Realtors
  async getRealtorsByTeam(teamId: string) {
    return this.request<any[]>(`/realtors/team/${teamId}`);
  }

  async getCurrentRealtor() {
    return this.request<any>('/realtors/me');
  }

  // Deals
  async getMyDeals() {
    return this.request<any[]>('/deals/me');
  }

  async createDeal(data: {
    clientName: string;
    dealValue: number;
    commission?: number;
    dealDate?: string;
  }) {
    return this.request<any>('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Diagnoses
  async getMyDiagnoses() {
    return this.request<any[]>('/diagnoses/me');
  }

  async createDiagnosis(data: {
    clientName: string;
    status?: string;
    notes?: string;
    diagnosisDate?: string;
  }) {
    return this.request<any>('/diagnoses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Training
  async getTrainingProgress() {
    return this.request<any[]>('/training/progress');
  }

  async updateTrainingProgress(data: {
    section: string;
    subsection: string;
    lectureCompleted: boolean;
    videoCompleted: boolean;
    practicalCompleted: boolean;
    handoverCompleted: boolean;
    examCompleted: boolean;
  }) {
    return this.request<any>('/training/progress', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // KPI endpoints
  async getTeamKPI(teamId: string) {
    return this.request<any>(`/kpi/team/${teamId}`);
  }

  async getOfficeKPI(officeId: string) {
    return this.request<any>(`/kpi/office/${officeId}`);
  }

  async getCityKPI(cityId: string) {
    return this.request<any>(`/kpi/city/${cityId}`);
  }

  async getCountryKPI(countryId: string) {
    return this.request<any>(`/kpi/country/${countryId}`);
  }

  async getRealtorKPI(realtorId: string) {
    return this.request<any>(`/kpi/realtor/${realtorId}`);
  }

  // Goals
  async getMyGoals(month?: number, year?: number) {
    if (month && year) {
      return this.request<any>(`/goals/${month}/${year}`);
    }
    return this.request<any>('/goals/me');
  }

  async setMyGoals(month: number, year: number, dealsGoal: number, keysGoal: number, exclusivesGoal: number) {
    return this.request<any>('/goals', {
      method: 'POST',
      body: JSON.stringify({ month, year, dealsGoal, keysGoal, exclusivesGoal }),
    });
  }

  // Schedule
  async getMySchedule(date?: string) {
    if (date) {
      return this.request<any[]>(`/schedule/date/${date}`);
    }
    const today = new Date().toISOString().split('T')[0];
    return this.request<any[]>(`/schedule/week?date=${today}`);
  }

  async createScheduleEntry(data: {
    scheduleDate: string;
    timeSlot: string;
    buyer1Name?: string;
    buyer1Phone?: string;
    buyer1Notes?: string;
    buyer2Name?: string;
    buyer2Phone?: string;
    buyer2Notes?: string;
    id?: string;
  }) {
    return this.request<any>('/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteScheduleEntry(id: string) {
    return this.request<{ success: boolean }>(`/schedule/${id}`, {
      method: 'DELETE',
    });
  }

  // Messages
  async getConversation(userId: string) {
    return this.request<any[]>(`/messages/conversation/${userId}`);
  }

  async getConversations() {
    return this.request<any[]>('/messages/conversations');
  }

  async sendMessage(receiverId: string, content: string) {
    return this.request<any>('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  }

  async markMessagesAsRead(userId: string) {
    return this.request<{ success: boolean }>(`/messages/read/${userId}`, {
      method: 'PUT',
    });
  }
}

export const api = new ApiClient();

