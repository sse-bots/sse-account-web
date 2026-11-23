import { NextResponse } from "next/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const result = await getPublicProfileByUsername(username);

  if (result.status === "not_found") {
    return NextResponse.json(
      { error: "User profile not found." },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  if (result.status === "private") {
    return NextResponse.json(
      { error: "This user profile is private." },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { profile: result.profile },
    { status: 200, headers: CORS_HEADERS }
  );
}
