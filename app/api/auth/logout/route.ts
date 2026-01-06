import { type NextRequest, NextResponse } from "next/server"
import { setAuthCookie } from "../../_utils/proxy"

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  return setAuthCookie(res, null)
}
