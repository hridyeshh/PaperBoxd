// Go backend API client with JWT authentication

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://paperboxd-backend-production-d9e0.up.railway.app";

interface ApiError {
  error?: { code: string; message: string };
  code?: string;
  message?: string;
  details?: unknown;
}

export interface BackendUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  is_public?: boolean;
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: BackendUser;
}

class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body: ApiError = await response.json().catch(() => ({}));
      // Go backend wraps errors as { error: { code, message } }
      const message =
        body.error?.message ??
        body.message ??
        `Request failed: ${response.status}`;
      throw new Error(message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<AuthTokens> {
    return this.request<AuthTokens>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(
    email: string,
    password: string,
    username: string,
    name: string
  ): Promise<AuthTokens> {
    return this.request<AuthTokens>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username, name }),
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    return this.request<{ access_token: string }>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  // Authenticated requests
  async get<T>(endpoint: string, token: string): Promise<T> {
    return this.request<T>(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async post<T>(endpoint: string, token: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, token: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, token: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, token: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

export const backendApi = new BackendApiClient();
