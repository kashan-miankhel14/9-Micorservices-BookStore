import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const base = process.env.API_BASE_URL
  const token = req.cookies.get("token")?.value
  if (!base) {
    return token
      ? NextResponse.json({ user: { email: "demo@example.com" } })
      : NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const res = await fetch(`${base}/users/me`, {
    headers: { authorization: token ? `Bearer ${token}` : "" },
  })
  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  })
}
