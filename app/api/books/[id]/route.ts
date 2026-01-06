import type { NextRequest } from "next/server"
import { forward } from "../../_utils/proxy"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return forward(req, `/books/${params.id}`)
}
