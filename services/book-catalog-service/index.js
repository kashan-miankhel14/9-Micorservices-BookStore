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

const PORT = process.env.PORT || 3002
const MONGO_URL = process.env.MONGO_URL || "mongodb://root:example@mongo:27017/bookstore?authSource=admin"

await mongoose.connect(MONGO_URL)

const BookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String },
    coverUrl: { type: String },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true },
)
const Book = mongoose.model("Book", BookSchema)

app.get("/health", (_req, res) => res.json({ status: "ok", service: "book-catalog-service" }))

app.get("/", async (_req, res) => {
  const books = await Book.find({}).limit(100).lean()
  res.json(books)
})

app.get("/:id", async (req, res) => {
  const b = await Book.findById(req.params.id).lean()
  if (!b) return res.status(404).json({ error: "Not found" })
  res.json(b)
})

app.post("/", async (req, res) => {
  // simple add for demo; in real apps, protect with auth/roles
  const doc = await Book.create(req.body || {})
  res.status(201).json(doc)
})

app.listen(PORT, () => console.log(`[v0] book-catalog-service on :${PORT}`))
