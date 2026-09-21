const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DB_FILE = "./database.json";

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ licenses: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function generateKey() {
    return crypto.randomBytes(16).toString("hex").toUpperCase();
}

// Generate a license
app.post("/api/licenses", (req, res) => {
    const db = loadDB();

    const key = generateKey();

    db.licenses.push({
        key,
        hwid: null,
        expiresAt: null,
        active: true,
        createdAt: new Date().toISOString()
    });

    saveDB(db);

    res.json({
        success: true,
        key
    });
});

// Verify license + HWID
app.post("/api/verify", (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
        return res.status(400).json({
            success: false,
            message: "Key and HWID are required"
        });
    }

    const db = loadDB();

    const license = db.licenses.find(x => x.key === key);

    if (!license) {
        return res.status(404).json({
            success: false,
            message: "Invalid license"
        });
    }

    if (!license.active) {
        return res.status(403).json({
            success: false,
            message: "License disabled"
        });
    }

    // First HWID automatically binds
    if (!license.hwid) {
        license.hwid = hwid;
        saveDB(db);

        return res.json({
            success: true,
            message: "HWID successfully registered"
        });
    }

    // Existing HWID must match
    if (license.hwid !== hwid) {
        return res.status(403).json({
            success: false,
            message: "HWID mismatch"
        });
    }

    res.json({
        success: true,
        message: "License verified"
    });
});

// List licenses
app.get("/api/licenses", (req, res) => {
    const db = loadDB();
    res.json(db.licenses);
});

app.listen(3000, () => {
    console.log("HWID server running on port 3000");
});
