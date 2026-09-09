import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authApi } from "@/lib/api/endpoints";
import { clearSession, getCurrentUser } from "@/lib/auth/jwt-session";

/**
 * Delete the signed-in account from both stores.
 *
 * The Go backend owns the primary record and handles its own soft-delete +
 * 30-day purge. MongoDB Atlas still holds a parallel copy of web-origin
 * accounts (email, password hash, birthday, gender) from before the Postgres
 * migration, and deletion never reached it — so a "deleted" web account kept a
 * live password hash indefinitely. Until the Mongo decommission lands, this
 * route deletes from both.
 */
async function purgeMongoAccount(email: string): Promise<void> {
  // Imported lazily: the Mongo driver is legacy surface and pulling it into
  // this route's module graph unconditionally would load it for every request.
  const { default: connectDB } = await import("@/lib/db/mongodb");
  const { default: User } = await import("@/lib/db/models/User");
  const { default: UserPreference } = await import("@/lib/db/models/UserPreference");

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return;

  await UserPreference.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const reasons = Array.isArray(body?.reasons) ? (body.reasons as string[]) : [];

  if (reasons.length === 0) {
    return NextResponse.json(
      { error: "Deletion reasons are required" },
      { status: 400 }
    );
  }

  // Read the email before the session is cleared — it is how the legacy Mongo
  // record is addressed, and the two stores share no id.
  const sessionUser = await getCurrentUser();

  const { data, status } = await authApi.deleteMe(reasons);
  if (status >= 400) {
    return NextResponse.json(data, { status });
  }

  if (sessionUser?.email) {
    try {
      await purgeMongoAccount(sessionUser.email);
    } catch (error) {
      // Non-fatal: the primary record is already deleted and the user must not
      // be told the deletion failed. Logged loudly because it leaves a legacy
      // copy behind that then needs manual removal.
      console.error("delete-account: legacy Mongo purge failed", error);
    }
  }

  await clearSession();

  const cookieStore = await cookies();
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.callback-url");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Host-next-auth.csrf-token");

  return NextResponse.json({ message: "Account deleted successfully" });
}
