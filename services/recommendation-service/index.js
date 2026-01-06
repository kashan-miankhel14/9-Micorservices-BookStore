import express from "express"
import cors from "cors"
import morgan from "morgan"
import mongoose from "mongoose"
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

const PORT = process.env.PORT || 3007
const MONGO_URL = process.env.MONGO_URL || "mongodb://root:example@mongo:27017/bookstore?authSource=admin"
const BOOKS_URL = process.env.BOOKS_URL || "http://book-catalog-service:3002"
const REVIEWS_URL = process.env.REVIEWS_URL || "http://review-service:3005"

await mongoose.connect(MONGO_URL)
const RecLog = mongoose.model("RecLog", new mongoose.Schema({ userId: String, items: [String] }, { timestamps: true }))

app.get("/health", (_req, res) => res.json({ status: "ok", service: "recommendation-service" }))

app.get("/", async (req, res) => {
  const userId = req.query.userId || "guest"
  // Fetch books
  const books = await fetch(`${BOOKS_URL}/`).then((r) => r.json())
  if (!Array.isArray(books) || books.length === 0) return res.json([])

  // Try to rank by rating using review-service
  const withScores = await Promise.all(
    books.map(async (b) => {
      try {
        const stats = await fetch(`${REVIEWS_URL}/book/${b._id}`).then((r) => r.json())
        return { book: b, score: stats?.averageRating || 0 }
      } catch {
        return { book: b, score: 0 }
      }
    }),
  )

  withScores.sort((a, b) => b.score - a.score)
  const top = withScores.slice(0, 10).map((x) => x.book)

  // If all zero scores, fallback random 10
  const result = top.some((b, i) => withScores[i]?.score > 0) ? top : shuffle(books).slice(0, 10)

  await RecLog.create({ userId, items: result.map((b) => b._id) })
  res.json(result)
})

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

app.listen(PORT, () => console.log(`[v0] recommendation-service on :${PORT}`))
