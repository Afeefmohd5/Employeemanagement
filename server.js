// server.js
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files
app.use(express.static(path.join(__dirname, "public"))); // Serve HTML/CSS/JS

// Admin password
const ADMIN_PASSWORD = "ShaheenTajCNX";

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Multer config
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Initialize database
let data = { updates: [], responses: [] };
const dbPath = path.join(__dirname, "database.json");
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
else {
  try {
    data = JSON.parse(fs.readFileSync(dbPath));
    if (!Array.isArray(data.updates)) data.updates = [];
    if (!Array.isArray(data.responses)) data.responses = [];
  } catch {
    data = { updates: [], responses: [] };
  }
}

// Save helper
function save() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

/* ======================
   ROUTES
====================== */

// Employee page
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "employee.html")));

// Admin page
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

// Get updates
app.get("/updates", (req, res) => res.json({ success: true, updates: data.updates }));

// Post new update
app.post("/update", (req, res) => {
  const { password, update } = req.body;
  if (password !== ADMIN_PASSWORD) return res.json({ success: false, message: "Invalid password" });
  if (!update || update.trim() === "") return res.json({ success: false, message: "Update text cannot be empty" });

  const newUpdate = { text: update, files: [] };
  data.updates.push(newUpdate);
  save();
  res.json({ success: true });
});

// Upload file (attach to last update)
app.post("/upload", upload.single("file"), (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.json({ success: false, message: "Invalid password" });

  if (!data.updates.length) return res.json({ success: false, message: "No update exists to attach this file." });

  const lastUpdate = data.updates[data.updates.length - 1];
  lastUpdate.files.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: new Date().toLocaleString(),
  });

  save();
  res.json({ success: true });
});

// Employee submits response
app.post("/submit", (req, res) => {
  const { name, status, doubt } = req.body;
  if (!name || name.trim() === "") return res.json({ success: false, message: "Name is required" });

  data.responses.push({ name, status, doubt, time: new Date().toLocaleString() });
  save();
  res.json({ success: true });
});

// Admin view all data
app.post("/admin/data", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.json({ success: false });
  res.json({ success: true, data });
});

/* ======================
   ERROR HANDLERS
====================== */

app.use((req, res) => {
  console.log(`Unhandled request: ${req.method} ${req.url}`);
  res.status(404).send("Route not found");
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Internal Server Error");
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
