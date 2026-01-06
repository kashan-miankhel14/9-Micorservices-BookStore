import type { NextRequest } from "next/server"
import { forward } from "../_utils/proxy"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.toString()
  return forward(req, `/books${q ? `?${q}` : ""}`)
}
