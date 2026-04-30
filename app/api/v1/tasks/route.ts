import { NextResponse } from "next/server";
import { withAuth, demoData, demoCreate } from "@/lib/api/handlers";

export const GET = withAuth(["read:tasks"], async (_req, authed) => {
  return NextResponse.json({
    data: demoData("tasks"),
    meta: { organizationId: authed.organizationId, demo: true },
  });
});

export const POST = withAuth(["write:tasks"], async (req, authed) => {
  const body = await req.json().catch(() => ({}));
  const created = await demoCreate("tasks", body);
  return NextResponse.json(
    {
      data: created.data,
      meta: { organizationId: authed.organizationId, demo: true },
    },
    { status: 201 },
  );
});
