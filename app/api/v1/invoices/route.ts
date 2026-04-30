import { NextResponse } from "next/server";
import { withAuth, demoData, demoCreate } from "@/lib/api/handlers";

export const GET = withAuth(["read:invoices"], async (_req, authed) => {
  return NextResponse.json({
    data: demoData("invoices"),
    meta: { organizationId: authed.organizationId, demo: true },
  });
});

export const POST = withAuth(["write:invoices"], async (req, authed) => {
  const body = await req.json().catch(() => ({}));
  const created = await demoCreate("invoices", body);
  return NextResponse.json(
    { data: created.data, meta: { organizationId: authed.organizationId, demo: true } },
    { status: 201 },
  );
});
