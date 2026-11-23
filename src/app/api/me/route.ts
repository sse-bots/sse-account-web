import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";
import { getConfiguredSocialProviders } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const providers = getConfiguredSocialProviders();
  try {
    const user = await getAuthSession();
    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null, providers },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }
    return NextResponse.json(
      { authenticated: true, user, providers },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("GET /api/me failed:", err);
    return NextResponse.json(
      { error: "Session verification temporarily unavailable.", providers },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
