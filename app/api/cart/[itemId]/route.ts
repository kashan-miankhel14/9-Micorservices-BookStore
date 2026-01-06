import type { NextRequest } from "next/server"
import { forward } from "../../_utils/proxy"

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  return forward(req, `/cart/${params.itemId}`)
}
