import express from "express"
import cors from "cors"
import morgan from "morgan"
import crypto from "node:crypto"
import promClient from "prom-client"

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan("dev"))

const register = new promClient.Registry()
promClient.collectDefaultMetrics({ register })

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
})

register.registerMetric(httpRequestDuration)

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer()
  res.on("finish", () =>
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    }),
  )
  next()
})

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType)
  res.end(await register.metrics())
})

const PORT = process.env.PORT || 3004

app.get("/health", (_req, res) => res.json({ status: "ok", service: "payment-service" }))

app.post("/pay", (req, res) => {
  const { userId, amount } = req.body || {}
  if (!userId || typeof amount !== "number")
    return res.status(400).json({ success: false, error: "userId and amount required" })
  // Dummy approval with 95% success rate
  const success = Math.random() < 0.95
  const transactionId = crypto.randomUUID()
  res.json({ success, transactionId, amount })
})

app.listen(PORT, () => console.log(`[v0] payment-service on :${PORT}`))
