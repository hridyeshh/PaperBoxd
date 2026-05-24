import { NextRequest, NextResponse } from "next/server";

type AuthorInfo = {
  found: boolean;
  name: string;
  description?: string;
  extract: string;
  photo_url: string;
  wikipedia_url: string;
};

type WikiSummary = {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
};

const UA = "PaperBoxd/1.0 (paperboxd.in; contact@paperboxd.in)";
const SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const SEARCH_URL = "https://en.wikipedia.org/w/api.php";
const CACHE_SECONDS = 60 * 60 * 24; // 24h

async function fetchSummary(title: string, signal: AbortSignal): Promise<WikiSummary | null> {
  const url = SUMMARY_URL + encodeURIComponent(title);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: CACHE_SECONDS },
    signal,
  });
  if (!res.ok) return null;
  try {
    return (await res.json()) as WikiSummary;
  } catch {
    return null;
  }
}

async function searchTitle(name: string, signal: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: `${name} author`,
    srlimit: "1",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: CACHE_SECONDS },
    signal,
  });
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };
    return data.query?.search?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

function summaryToResponse(requested: string, s: WikiSummary): AuthorInfo {
  const photo = s.thumbnail?.source ?? s.originalimage?.source ?? "";
  return {
    found: true,
    name: s.title || requested,
    description: s.description,
    extract: s.extract ?? "",
    photo_url: photo,
    wikipedia_url: s.content_urls?.desktop?.page ?? "",
  };
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const trimmed = name.trim();
  const notFound: AuthorInfo = {
    found: false,
    name: trimmed,
    extract: "",
    photo_url: "",
    wikipedia_url: "",
  };

  // 5s budget per Wikipedia hop.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const title = trimmed.replace(/\s+/g, "_");
    let summary = await fetchSummary(title, controller.signal);

    if (!summary || summary.type === "disambiguation" || !summary.extract) {
      const searched = await searchTitle(trimmed, controller.signal);
      if (searched) {
        summary = await fetchSummary(searched.replace(/\s+/g, "_"), controller.signal);
      }
    }

    if (!summary || !summary.extract) {
      return NextResponse.json(notFound);
    }
    return NextResponse.json(summaryToResponse(trimmed, summary));
  } catch {
    return NextResponse.json(notFound);
  } finally {
    clearTimeout(timeout);
  }
}
