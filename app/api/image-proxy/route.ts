import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering - this route uses searchParams which is dynamic
// This prevents static generation during export
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing URL", { status: 400 });
    }

    // 1. Validate the URL object
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return new NextResponse("Invalid URL", { status: 400 });
    }

    // 2. Allow-list specific domains to prevent SSRF attacks
    const ALLOWED_HOSTS = [
        "images.unsplash.com",
        "books.google.com",
        "covers.openlibrary.org",
        "images.isbndb.com",
        "covers.isbndb.com",
        "res.cloudinary.com",
        "lh3.googleusercontent.com",
        "i.pravatar.cc",
    ];

    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
        return new NextResponse("Forbidden Domain", { status: 403 });
    }

    // 3. Block private/internal IP addresses (additional SSRF protection)
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivateIP =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.startsWith("169.254.") || // AWS metadata
        hostname.startsWith("10.") || // Private range 10.0.0.0/8
        (hostname.startsWith("172.") &&
            parseInt(hostname.split(".")[1] || "0") >= 16 &&
            parseInt(hostname.split(".")[1] || "0") <= 31) || // Private range 172.16.0.0/12
        hostname.startsWith("192.168."); // Private range 192.168.0.0/16

    if (isPrivateIP) {
        return new NextResponse("Forbidden Domain", { status: 403 });
    }

    try {
        // 4. Fetch the image server-side (No CORS issues here!)
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // 2. Convert to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Get Content Type (e.g., 'image/jpeg')
        const contentType = response.headers.get("content-type") || "image/jpeg";

        // 4. Create the Base64 Data URL string
        const base64Image = `data:${contentType};base64,${buffer.toString("base64")}`;

        // 5. Return it as a simple text string
        // We return plain text so the frontend can just use it directly
        return new NextResponse(base64Image, {
            headers: {
                "Content-Type": "text/plain",
                // These headers are still good practice to allow your frontend to read it
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });

    } catch (error) {
        console.error("Proxy error:", error);
        return new NextResponse("Failed to proxy image", { status: 500 });
    }
}
