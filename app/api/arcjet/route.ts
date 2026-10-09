import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aj } from "@/lib/security/arcjet";

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const decision = await aj.protect(req, { userId, requested: 1 });

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Too Many Requests", reason: decision.reason },
      { status: 429 },
    );
  }

  return NextResponse.json({ ok: true });
}
