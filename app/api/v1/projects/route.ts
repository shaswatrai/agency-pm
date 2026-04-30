import { NextResponse } from "next/server";
import { withAuth, demoData, demoCreate } from "@/lib/api/handlers";

export const GET = withAuth(["read:projects"], async (_req, authed) => {
  return NextResponse.json({
    data: demoData("projects"),
    meta: { organizationId: authed.organizationId, demo: true },
  });
});

export const POST = withAuth(["write:projects"], async (req, authed) => {
  const body = await req.json().catch(() => ({}));
  const created = await demoCreate("projects", body);
  return NextResponse.json(
    { data: created.data, meta: { organizationId: authed.organizationId, demo: true } },
    { status: 201 },
  );
});
