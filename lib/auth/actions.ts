"use server";

import { backendApi } from "@/lib/api/client";
import { setSession, clearSession } from "@/lib/auth/jwt-session";

interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  user?: SessionUser;
}

export async function loginAction(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    const response = await backendApi.login(email, password);
    const user = {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      name: response.user.name,
      avatar_url: response.user.avatar_url,
    };
    await setSession(response.access_token, response.refresh_token, user);
    return { success: true, user };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Invalid email or password";
    return { success: false, error: message };
  }
}

export async function registerAction(
  email: string,
  password: string,
  username: string,
  name: string
): Promise<ActionResult> {
  try {
    const response = await backendApi.register(email, password, username, name);

    await setSession(response.access_token, response.refresh_token, {
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      name: response.user.name,
      avatar_url: response.user.avatar_url,
    });

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: message };
  }
}

export async function logoutAction(): Promise<void> {
  await clearSession();
}
