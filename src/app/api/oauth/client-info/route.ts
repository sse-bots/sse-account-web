import { NextResponse } from "next/server";
import { getAuthCollections } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractHostname(urlStr: unknown): string | null {
  if (typeof urlStr !== "string" || !urlStr.trim()) return null;
  try {
    return new URL(urlStr.trim()).hostname;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = (searchParams.get("client_id") || "").trim();

  if (!clientId) {
    return NextResponse.json(
      { error: "client_id is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { oauthClients } = await getAuthCollections();
    const doc = await oauthClients.findOne({
      $or: [{ clientId }, { client_id: clientId }],
    });

    if (!doc) {
      return NextResponse.json(
        { found: false, clientId, name: null, uri: null, domain: null, icon: null, trusted: false },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const name =
      (typeof doc.name === "string" && doc.name.trim()) ||
      (typeof doc.client_name === "string" && doc.client_name.trim()) ||
      null;
    const uri =
      (typeof doc.uri === "string" && doc.uri.trim()) ||
      (typeof doc.client_uri === "string" && doc.client_uri.trim()) ||
      null;
    const icon =
      (typeof doc.icon === "string" && doc.icon.trim()) ||
      (typeof doc.logo_uri === "string" && doc.logo_uri.trim()) ||
      null;

    const redirectList = Array.isArray(doc.redirectUris)
      ? doc.redirectUris
      : Array.isArray(doc.redirect_uris)
        ? doc.redirect_uris
        : [];
    const domain =
      extractHostname(uri) ||
      (redirectList.length > 0 ? extractHostname(redirectList[0]) : null);

    return NextResponse.json(
      {
        found: true,
        clientId,
        name,
        uri,
        domain,
        icon,
        trusted: Boolean(doc.skipConsent || doc.skip_consent),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/oauth/client-info failed:", err);
    return NextResponse.json(
      { error: "Could not resolve application details." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
