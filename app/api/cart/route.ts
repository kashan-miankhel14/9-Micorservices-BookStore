import type { NextRequest } from "next/server"
import { forward } from "../_utils/proxy"

export async function GET(req: NextRequest) {
  return forward(req, "/cart")
}

export async function POST(req: NextRequest) {
  return forward(req, "/cart")
}
