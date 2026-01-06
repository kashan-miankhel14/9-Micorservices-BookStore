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

const PORT = process.env.PORT || 3006
const MONGO_URL = process.env.MONGO_URL || "mongodb://root:example@mongo:27017/bookstore?authSource=admin"
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"

await mongoose.connect(MONGO_URL)

const CartItemSchema = new mongoose.Schema({
  bookId: String,
  qty: { type: Number, default: 1, min: 1 },
})

const CartSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
)

const Cart = mongoose.model("Cart", CartSchema)

app.get("/health", (_req, res) => res.json({ status: "ok", service: "cart-service" }))

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

app.get("/", requireAuth, async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.sub }).lean()
  res.json(cart || { userId: req.user.sub, items: [] })
})

app.post("/add", requireAuth, async (req, res) => {
  const { bookId, qty = 1 } = req.body || {}
  if (!bookId) return res.status(400).json({ error: "bookId required" })
  let cart = await Cart.findOne({ userId: req.user.sub })
  if (!cart) cart = await Cart.create({ userId: req.user.sub, items: [] })
  const found = cart.items.find((i) => i.bookId === bookId)
  if (found) found.qty += qty
  else cart.items.push({ bookId, qty })
  await cart.save()
  res.json(cart)
})

app.post("/clear", requireAuth, async (req, res) => {
  await Cart.findOneAndUpdate({ userId: req.user.sub }, { items: [] }, { upsert: true })
  res.json({ ok: true })
})

app.listen(PORT, () => console.log(`[v0] cart-service on :${PORT}`))
