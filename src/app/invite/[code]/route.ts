import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { INVITE_COOKIE, onboard } from "@/lib/auth";

// /invite/<code>: remember the code, then send the new friend to create an account.
// The code is redeemed the first time an approved-player check runs (see requirePlayer).
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = new URL(request.url).origin;
  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE, code, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60, path: "/" });

  const { userId } = await auth();
  if (userId) {
    const player = await onboard(code);
    return NextResponse.redirect(`${origin}${player ? "/" : "/not-invited"}`);
  }
  return NextResponse.redirect(`${origin}/sign-up?invited=1`);
}
