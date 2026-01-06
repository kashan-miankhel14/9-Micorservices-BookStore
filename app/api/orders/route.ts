import type { NextRequest } from "next/server"
import { forward } from "../_utils/proxy"

export async function GET(req: NextRequest) {
  return forward(req, "/orders")
}

export async function POST(req: NextRequest) {
  return forward(req, "/orders")
}
