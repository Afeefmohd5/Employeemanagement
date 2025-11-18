const express = require("express");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // File access
app.use(express.static(path.join(__dirname, "public"))); // Static HTML/CSS/JS

const ADMIN_PASSWORD = "ShaheenTajCNX";

// Create upload folder if not exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Database structure
let data = {
    updates: [],     // store all updates
    responses: []    // store employee responses
};

// Load existing DB if exists
if (fs.existsSync("database.json")) {
    try {
        data = JSON.parse(fs.readFileSync("database.json"));
        if (!Array.isArray(data.updates)) data.updates = [];
        if (!Array.isArray(data.responses)) data.responses = [];
    } catch (err) {
        console.error("Error reading database.json:", err);
        data = { updates: [], responses: [] };
    }
}

// Save database
function save() {
    fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

/* ======================================================
   ROUTES FOR SERVING PAGES
====================================================== */
// Employee page at root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "employee.html"));
});

// Admin page at /admin
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ======================================================
   GET ALL PROCESS UPDATES (WITH FILES)
====================================================== */
app.get("/updates", (req, res) => {
    res.json({
        success: true,
        updates: data.updates
    });
});

/* ======================================================
   ADMIN POST NEW UPDATE
====================================================== */
app.post("/update", (req, res) => {
    const { password, update } = req.body;
    if (password !== ADMIN_PASSWORD) return res.json({ success: false, message: "Invalid password" });
    if (!update || update.trim() === "") return res.json({ success: false, message: "Update text cannot be empty" });

    const newUpdate = {
        text: update,
        files: []
    };

    data.updates.push(newUpdate);
    save();

    res.json({ success: true });
});

/* ======================================================
   EMPLOYEE SUBMITS RESPONSE
====================================================== */
app.post("/submit", (req, res) => {
    const { name, status, doubt } = req.body;

    if (!name || name.trim() === "") return res.json({ success: false, message: "Name is required" });

    data.responses.push({
        name,
        status,
        doubt,
        time: new Date().toLocaleString()
    });

    save();
    res.json({ success: true });
});

/* ======================================================
   ADMIN FILE UPLOAD (LINKED TO LATEST UPDATE)
====================================================== */
app.post("/upload", upload.single("file"), (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.json({ success: false, message: "Invalid password" });

    if (!data.updates || data.updates.length === 0) {
        return res.json({ success: false, message: "No update exists to attach this file. Please post an update first." });
    }

    const lastUpdate = data.updates[data.updates.length - 1];
    if (!lastUpdate.files) lastUpdate.files = [];

    lastUpdate.files.push({
        filename: req.file.filename,
        originalName: req.file.originalname,
        uploadedAt: new Date().toLocaleString()
    });

    save();
    res.json({ success: true });
});

/* ======================================================
   ADMIN VIEW ALL DATA
====================================================== */
app.post("/admin/data", (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.json({ success: false });

    res.json({ success: true, data });
});

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
