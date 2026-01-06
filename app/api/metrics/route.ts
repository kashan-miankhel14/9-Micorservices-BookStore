import { NextResponse } from "next/server"
import { getMetricsRegister } from "@/lib/metrics"
import client from "prom-client"

export const dynamic = "force-dynamic"

const register = getMetricsRegister()

let httpRequestDuration = register.getSingleMetric("frontend_http_request_duration_seconds")
if (!httpRequestDuration) {
  httpRequestDuration = new client.Histogram({
    name: "frontend_http_request_duration_seconds",
    help: "Duration of frontend API requests in seconds",
    labelNames: ["route", "method", "status"],
  })
  register.registerMetric(httpRequestDuration)
}

export async function GET() {
  const metrics = await register.metrics()
  return new NextResponse(metrics, {
    status: 200,
    headers: {
      "Content-Type": register.contentType,
    },
  })
}
