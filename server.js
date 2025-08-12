
import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
// e.g., imgs.tu-dominio.com (without protocol). If empty, will use request host.
const BASE_HOST = process.env.BASE_HOST || "";
// Optional bearer token for uploads. If set, clients must send Authorization: Bearer <token>
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";
// CORS origin (comma-separated list or *)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
// Max file size (bytes)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || String(15 * 1024 * 1024), 10);
// Allowed MIME types
const ALLOWED_MIME = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif").split(",");

// --- Directories ---
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// --- Middlewares ---
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || CORS_ORIGIN === "*") return cb(null, true);
    const allowed = CORS_ORIGIN.split(",").map(s => s.trim());
    return cb(null, allowed.includes(origin));
  },
}));
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "uploader-easypanel");
  next();
});

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = (path.extname(file.originalname || ".jpg") || ".jpg").toLowerCase();
    const name = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

// --- Static files ---
app.use("/uploads", express.static(UPLOAD_DIR, {
  maxAge: "365d",
  immutable: true,
}));

// --- Auth helper ---
function requireAuth(req, res, next) {
  if (!AUTH_TOKEN) return next();
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (token && token === AUTH_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// --- Health ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Upload ---
app.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received. Use field name 'file'." });
  if (!ALLOWED_MIME.includes(req.file.mimetype)) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(415).json({ error: `Unsupported media type ${req.file.mimetype}` });
  }

  const proto = "https"; // behind reverse proxy/SSL
  const host = BASE_HOST || req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const filename = req.file.filename;
  const url = `${proto}://${host}/uploads/${filename}`;

  return res.json({
    url,
    filename,
    size: req.file.size,
    mime: req.file.mimetype,
  });
});

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Uploader listening on :${PORT}`);
});
