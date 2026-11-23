import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAuthSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128),
});

export async function POST(req: Request) {
  const ctx = await getAuthSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.hasPassword) {
    return NextResponse.json(
      { error: "Password is already set. Use Change Password instead." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid password." },
      { status: 400 }
    );
  }

  try {
    const hdrs = await headers();
    await auth.api.setPassword({
      body: { newPassword: parsed.data.newPassword },
      headers: hdrs,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to set password:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not set account password.",
      },
      { status: 500 }
    );
  }
}
