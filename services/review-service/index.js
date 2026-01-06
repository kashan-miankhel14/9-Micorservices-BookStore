import express from "express"
import cors from "cors"
import morgan from "morgan"
import mongoose from "mongoose"
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

const PORT = process.env.PORT || 3005
const MONGO_URL = process.env.MONGO_URL || "mongodb://root:example@mongo:27017/bookstore?authSource=admin"
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"

await mongoose.connect(MONGO_URL)

const ReviewSchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
  },
  { timestamps: true },
)
const Review = mongoose.model("Review", ReviewSchema)

app.get("/health", (_req, res) => res.json({ status: "ok", service: "review-service" }))

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

app.post("/", requireAuth, async (req, res) => {
  const { bookId, rating, comment } = req.body || {}
  if (!bookId || !rating) return res.status(400).json({ error: "bookId and rating required" })
  const r = await Review.create({ bookId, rating, comment, userId: req.user.sub })
  res.status(201).json(r)
})

app.get("/book/:bookId", async (req, res) => {
  const list = await Review.find({ bookId: req.params.bookId }).lean()
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
  res.json({ reviews: list, averageRating: Number(avg.toFixed(2)), count: list.length })
})

app.listen(PORT, () => console.log(`[v0] review-service on :${PORT}`))
