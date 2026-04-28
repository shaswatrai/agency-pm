import { NextResponse } from "next/server";

/**
 * Validates a Resend API key by hitting the domains list endpoint.
 * The key is supplied per-request (not stored server-side) so that
 * users can configure it from the UI.
 */
export async function POST(request: Request) {
  let body: { apiKey?: string; from?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { apiKey, from } = body;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "apiKey and from are required" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (res.status === 401) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Resend API returned ${res.status}` },
        { status: res.status },
      );
    }
    const data: { data?: Array<{ name: string; status: string }> } =
      await res.json();
    const domains = data.data ?? [];
    const fromDomain = from.split("@")[1]?.replace(/[>\s]/g, "");
    const matchingDomain = domains.find((d) => d.name === fromDomain);

    if (!fromDomain) {
      return NextResponse.json(
        { error: "From address must include a domain" },
        { status: 400 },
      );
    }

    if (!matchingDomain) {
      return NextResponse.json(
        {
          message: `Connected. Note: domain "${fromDomain}" is not verified yet on Resend (you have ${domains.length} other verified domain${domains.length === 1 ? "" : "s"}).`,
        },
        { status: 200 },
      );
    }

    if (matchingDomain.status !== "verified") {
      return NextResponse.json(
        {
          message: `Connected. Domain "${fromDomain}" status: ${matchingDomain.status}.`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        message: `Connected. Domain "${fromDomain}" is verified and ready to send.`,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Network error",
      },
      { status: 500 },
    );
  }
}
