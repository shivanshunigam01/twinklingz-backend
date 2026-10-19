import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDb } from "./config/db.js";
import { configureCloudinary } from "./config/cloudinary.js";
import { requireAdmin } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import publicProducts from "./routes/publicProducts.js";
import publicSettings from "./routes/publicSettings.js";
import submissions from "./routes/submissions.js";
import ordersPublic from "./routes/ordersPublic.js";
import razorpayCheckout from "./routes/razorpayCheckout.js";

import adminProducts from "./routes/admin/products.js";
import adminOrders from "./routes/admin/orders.js";
import adminSubmissions from "./routes/admin/submissions.js";
import adminSettings from "./routes/admin/settings.js";
import adminReports from "./routes/admin/reports.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

const clientUrls = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== "production";
const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const twinklingzStorefrontOrigin = /^https:\/\/(www\.)?twinklingz\.com$/;

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        clientUrls.includes(origin) ||
        twinklingzStorefrontOrigin.test(origin) ||
        (isDev && localDevOrigin.test(origin))
      ) {
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

configureCloudinary();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "twinklingz-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", publicProducts);
app.use("/api/settings", publicSettings);
app.use("/api/submissions", submissions);
app.use("/api/orders", ordersPublic);
app.use("/api", razorpayCheckout);

app.use("/api/admin/products", requireAdmin, adminProducts);
app.use("/api/admin/orders", requireAdmin, adminOrders);
app.use("/api/admin/submissions", requireAdmin, adminSubmissions);
app.use("/api/admin/settings", requireAdmin, adminSettings);
app.use("/api/admin/reports", requireAdmin, adminReports);

app.use(errorHandler);

await connectDb();

app.listen(port, () => {
  console.log(`[api] Twinklingz backend listening on http://localhost:${port}`);
});
