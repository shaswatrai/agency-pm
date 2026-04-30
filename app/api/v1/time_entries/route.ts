import { NextResponse } from "next/server";
import { withAuth, demoData, demoCreate } from "@/lib/api/handlers";

export const GET = withAuth(["read:time_entries"], async (_req, authed) => {
  return NextResponse.json({
    data: demoData("time_entries"),
    meta: { organizationId: authed.organizationId, demo: true },
  });
});

export const POST = withAuth(["write:time_entries"], async (req, authed) => {
  const body = await req.json().catch(() => ({}));
  const created = await demoCreate("time_entries", body);
  return NextResponse.json(
    { data: created.data, meta: { organizationId: authed.organizationId, demo: true } },
    { status: 201 },
  );
});
