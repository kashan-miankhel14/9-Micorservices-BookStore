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

const PORT = process.env.PORT || 3003
const MONGO_URL = process.env.MONGO_URL || "mongodb://root:example@mongo:27017/bookstore?authSource=admin"
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"
const PAYMENT_URL = process.env.PAYMENT_URL || "http://payment-service:3004"
const NOTIFY_URL = process.env.NOTIFY_URL || "http://notification-service:3008"
const CART_URL = process.env.CART_URL || "http://cart-service:3006"

await mongoose.connect(MONGO_URL)

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: [{ bookId: String, qty: Number }],
    total: { type: Number, required: true },
    payment: {
      status: String,
      transactionId: String,
    },
  },
  { timestamps: true },
)
const Order = mongoose.model("Order", OrderSchema)

app.get("/health", (_req, res) => res.json({ status: "ok", service: "order-service" }))

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
  const orders = await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 }).lean()
  res.json(orders)
})

app.post("/checkout", requireAuth, async (req, res) => {
  // Calculate total from client-provided items for demo purposes
  // In real systems, reprice server-side using catalog service
  const { items = [], total = 0 } = req.body || {}
  if (!items.length) return res.status(400).json({ error: "Cart is empty" })

  // 1) charge payment
  const payResp = await fetch(`${PAYMENT_URL}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: req.user.sub, amount: total }),
  }).then((r) => r.json())

  if (!payResp?.success) {
    return res.status(402).json({ error: "Payment failed" })
  }

  // 2) persist order
  const order = await Order.create({
    userId: req.user.sub,
    items,
    total,
    payment: { status: "paid", transactionId: payResp.transactionId },
  })

  // 3) clear cart
  await fetch(`${CART_URL}/clear`, {
    method: "POST",
    headers: { Authorization: `Bearer ${signInternal(req.user)}` },
  })

  // 4) notify
  await fetch(`${NOTIFY_URL}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${signInternal(req.user)}` },
    body: JSON.stringify({
      to: req.user.email || req.user.sub,
      subject: "Order Confirmation",
      message: `Your order ${order._id} was placed successfully.`,
      channel: "email",
    }),
  })

  res.status(201).json(order)
})

function signInternal(user) {
  return jwt.sign({ sub: user.sub, email: user.email }, JWT_SECRET, { expiresIn: "5m" })
}

app.listen(PORT, () => console.log(`[v0] order-service on :${PORT}`))
