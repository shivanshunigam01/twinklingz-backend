import mongoose from "mongoose";

/** Full URI, or MONGODB_USER + MONGODB_PASSWORD (password may contain @ # % etc.). */
export function resolveMongoUri() {
  const direct = process.env.MONGODB_URI?.trim();
  if (direct && !direct.includes("<db_username>") && !direct.includes("<db_password>")) {
    return direct;
  }

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  if (!user || !password) {
    return direct || "";
  }

  const host = process.env.MONGODB_HOST?.trim() || "twinkliz.3histwf.mongodb.net";
  const dbName = process.env.MONGODB_DB?.trim();
  const query = "appName=twinkliz";
  const path = dbName ? `/${encodeURIComponent(dbName)}?${query}` : `/?${query}`;

  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}${path}`;
}

export async function connectDb() {
  const uri = resolveMongoUri();
  if (!uri) {
    console.warn(
      "[api] MongoDB not configured — set MONGODB_URI or MONGODB_USER + MONGODB_PASSWORD in backend/.env",
    );
    return;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("[api] Connected to MongoDB");
}
