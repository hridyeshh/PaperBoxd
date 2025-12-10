import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    // 1. Fetch the image server-side (No CORS issues here!)
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
