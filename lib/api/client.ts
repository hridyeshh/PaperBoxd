import { Capacitor } from "@capacitor/core";
import { getAuthToken } from "@/lib/capacitor/auth-storage";

// Use production API when running inside a native Capacitor app.
// Use relative URLs when running as a regular web app.
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? "https://paperboxd.in"
  : "";

export async function apiClient(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  // Add Authorization header for native apps
  if (Capacitor.isNativePlatform()) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    // Use "omit" for native (tokens in headers), "include" for web (cookies)
    credentials: Capacitor.isNativePlatform() ? "omit" : "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

