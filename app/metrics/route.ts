import { NextResponse } from "next/server"
import { getMetricsRegister } from "@/lib/metrics"

export const dynamic = "force-dynamic"

export async function GET() {
  const register = getMetricsRegister()
  const metrics = await register.metrics()
  return new NextResponse(metrics, {
    status: 200,
    headers: {
      "Content-Type": register.contentType,
    },
  })
}
