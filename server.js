const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
const PORT = 3000;
const SECRET = "budget_secret_key";

app.use(cors());
app.use(express.json());

// Middleware to verify token
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    const result = stmt.run(email, hashed);
    res.json({ message: "User registered", userId: result.lastInsertRowid });
  } catch {
    res.status(400).json({ error: "Email already exists" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(400).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });
  res.json({ token, email: user.email });
});

// Get transactions
app.get("/transactions", authenticate, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC")
    .all(req.userId);
  res.json(rows);
});

// Add transaction
app.post("/transactions", authenticate, (req, res) => {
  const { description, amount, category, date } = req.body;
  const stmt = db.prepare(
    "INSERT INTO transactions (user_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(req.userId, description, amount, category, date);
  res.json({ id: result.lastInsertRowid, description, amount, category, date });
});

// Delete transaction
app.delete("/transactions/:id", authenticate, (req, res) => {
  db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(
    req.params.id,
    req.userId
  );
  res.json({ message: "Deleted" });
});

// Set budget
app.post("/budgets", authenticate, (req, res) => {
  const { category, limit_amount } = req.body;
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?)"
  );
  stmt.run(req.userId, category, limit_amount);
  res.json({ message: "Budget saved" });
});

// Get budgets
app.get("/budgets", authenticate, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM budgets WHERE user_id = ?")
    .all(req.userId);
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});