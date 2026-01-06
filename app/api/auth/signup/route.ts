import { type NextRequest, NextResponse } from "next/server"
import { forward, setAuthCookie } from "../../_utils/proxy"

export async function POST(req: NextRequest) {
  const base = process.env.API_BASE_URL
  if (!base) {
    const res = await forward(req, "/auth/signup")
    const data = await res.json()
    return setAuthCookie(NextResponse.json(data), "mock-token")
  }
  const upstream = await fetch(`${base}/users/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  })
  const text = await upstream.text()
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  })
  const data = safeParse(text)
  const token = data?.token || data?.accessToken || null
  return setAuthCookie(res, token)
}

function safeParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null as any
  }
}
