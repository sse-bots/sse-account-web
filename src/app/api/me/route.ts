import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/session";

export async function GET() {
  const user = await getAuthSession();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user });
}
