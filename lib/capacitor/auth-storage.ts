"use client";

import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  image?: string;
}

/**
 * Store authentication token in Capacitor Preferences (native storage)
 */
export async function storeAuthToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    // For web, store in localStorage as fallback
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await Preferences.set({
    key: TOKEN_KEY,
    value: token,
  });
}

/**
 * Get authentication token from storage
 */
export async function getAuthToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    // For web, get from localStorage
    return localStorage.getItem(TOKEN_KEY);
  }

  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value;
}

/**
 * Remove authentication token from storage
 */
export async function removeAuthToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  await Preferences.remove({ key: TOKEN_KEY });
}

/**
 * Store user data in storage
 */
export async function storeUser(user: StoredUser): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }

  await Preferences.set({
    key: USER_KEY,
    value: JSON.stringify(user),
  });
}

/**
 * Get user data from storage
 */
export async function getStoredUser(): Promise<StoredUser | null> {
  if (!Capacitor.isNativePlatform()) {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  const { value } = await Preferences.get({ key: USER_KEY });
  return value ? JSON.parse(value) : null;
}

/**
 * Remove user data from storage
 */
export async function removeStoredUser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  await Preferences.remove({ key: USER_KEY });
}

/**
 * Clear all auth data
 */
export async function clearAuth(): Promise<void> {
  await removeAuthToken();
  await removeStoredUser();
}
