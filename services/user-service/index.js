import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import promClient from "prom-client";

const app = express();
app.use(cors());
app.use(express.json());

// Prometheus metrics setup
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});
register.registerMetric(httpRequestDuration);

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () =>
    end({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    }),
  );
  next();
});

app.use(morgan("dev"));

const PORT = process.env.PORT || 3001;
const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb://root:example@mongo:27017/bookstore?authSource=admin";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt";

await mongoose.connect(MONGO_URL);
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);
const User = mongoose.model("User", UserSchema);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "user-service" }),
);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.post("/signup", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name)
    return res.status(400).json({ error: "email, password, name required" });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "User exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, name, passwordHash });
  const token = jwt.sign(
    { sub: user._id.toString(), email, name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.json({ token, user: { id: user._id, email, name } });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email, password required" });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
});

function requireAuth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header)
    return res.status(401).json({ error: "Missing Authorization header" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user._id, email: user.email, name: user.name });
});

app.listen(PORT, () => console.log(`[v0] user-service on :${PORT}`));
