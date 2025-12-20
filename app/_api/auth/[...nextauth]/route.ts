import { handlers as nextAuthHandlers } from "@/lib/auth";

// Force Node.js runtime for NextAuth
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = nextAuthHandlers.GET;
export const POST = nextAuthHandlers.POST;
