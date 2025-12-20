import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";


export const dynamic = "force-static";

export async function GET() {
    const session = await auth();

    return NextResponse.json({
        authenticated: !!session,
        session: session || null,
    });
}
