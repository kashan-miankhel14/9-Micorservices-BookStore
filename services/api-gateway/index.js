import express from "express"
import cors from "cors"
import morgan from "morgan"
import jwt from "jsonwebtoken"
import promClient from "prom-client"
import { createProxyMiddleware } from "http-proxy-middleware"

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

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"

const targets = {
  users: process.env.USERS_URL || "http://user-service:3001",
  books: process.env.BOOKS_URL || "http://book-catalog-service:3002",
  orders: process.env.ORDERS_URL || "http://order-service:3003",
  payments: process.env.PAYMENTS_URL || "http://payment-service:3004",
  reviews: process.env.REVIEWS_URL || "http://review-service:3005",
  cart: process.env.CART_URL || "http://cart-service:3006",
  recs: process.env.RECS_URL || "http://recommendation-service:3007",
  notify: process.env.NOTIFY_URL || "http://notification-service:3008",
}

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", service: "api-gateway" }))

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  const header = req.headers["authorization"]
  if (!header) return res.status(401).json({ error: "Missing Authorization header" })
  const token = header.split(" ")[1]
  if (!token) return res.status(401).json({ error: "Invalid Authorization header" })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" })
  }
}

// Public proxies
app.use("/users", createProxyMiddleware({ target: targets.users, changeOrigin: true, pathRewrite: { "^/users": "" } }))
app.use("/books", createProxyMiddleware({ target: targets.books, changeOrigin: true, pathRewrite: { "^/books": "" } }))
app.use(
  "/reviews",
  createProxyMiddleware({ target: targets.reviews, changeOrigin: true, pathRewrite: { "^/reviews": "" } }),
)
app.use("/recs", createProxyMiddleware({ target: targets.recs, changeOrigin: true, pathRewrite: { "^/recs": "" } }))

// Protected proxies (require auth)
app.use(
  "/orders",
  requireAuth,
  createProxyMiddleware({ target: targets.orders, changeOrigin: true, pathRewrite: { "^/orders": "" } }),
)
app.use(
  "/cart",
  requireAuth,
  createProxyMiddleware({ target: targets.cart, changeOrigin: true, pathRewrite: { "^/cart": "" } }),
)

// Payments and notifications normally internal; expose for test with auth
app.use(
  "/payments",
  requireAuth,
  createProxyMiddleware({ target: targets.payments, changeOrigin: true, pathRewrite: { "^/payments": "" } }),
)
app.use(
  "/notify",
  requireAuth,
  createProxyMiddleware({ target: targets.notify, changeOrigin: true, pathRewrite: { "^/notify": "" } }),
)

app.listen(PORT, () => {
  console.log(`[v0] API Gateway listening on :${PORT}`)
})
