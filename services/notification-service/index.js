import express from "express"
import cors from "cors"
import morgan from "morgan"
import jwt from "jsonwebtoken"
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

const PORT = process.env.PORT || 3008
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"

app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification-service" }))

function requireAuth(req, res, next) {
  const header = req.headers["authorization"]
  if (!header) return res.status(401).json({ error: "Missing Authorization header" })
  const token = header.split(" ")[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ error: "Invalid token" })
  }
}

app.post("/notify", requireAuth, (req, res) => {
  const { to, subject, message, channel = "email" } = req.body || {}
  if (!to || !subject || !message) return res.status(400).json({ error: "to, subject, message required" })
  console.log(`[v0] notification-service: channel=${channel} to=${to} subject="${subject}" message="${message}"`)
  res.json({ accepted: true, channel })
})

app.listen(PORT, () => console.log(`[v0] notification-service on :${PORT}`))
