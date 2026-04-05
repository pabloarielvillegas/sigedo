import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Database Setup (LibSQL/SQLite) ---
const db = createClient({
  url: "file:database.sqlite",
});

async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'alumno',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS materias (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS cursos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        materia_id TEXT NOT NULL,
        visible_classes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS curso_students (
        curso_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        PRIMARY KEY (curso_id, student_id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        materia_id TEXT,
        input_data TEXT NOT NULL,
        plan_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("SQLite database initialized successfully.");
  } catch (error) {
    console.error("Error initializing SQLite database:", error);
  }
}

// --- Auth Routes ---
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-fallback-key-change-me";

app.post("/api/auth/register", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check if user exists
    const userCheck = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default role is 'alumno', except for the superadmin
    const role = email === "pabloarielvillegaslg@gmail.com" ? "admin" : "alumno";

    // Insert user
    const result = await db.execute({
      sql: "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?) RETURNING id, email, display_name, role",
      args: [email, passwordHash, displayName || email.split("@")[0], role]
    });

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ user: { uid: user.id.toString(), email: user.email, displayName: user.display_name, role: user.role }, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      user: {
        uid: user.id.toString(),
        email: user.email,
        displayName: user.display_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const result = await db.execute({
      sql: "SELECT id, email, display_name, role FROM users WHERE id = ?",
      args: [decoded.id]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        uid: user.id.toString(),
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// --- API Routes for Admin Panel ---

app.get("/api/users", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT id as uid, email, display_name as displayName, role FROM users",
      args: []
    });
    const users = result.rows.map(r => ({ ...r, uid: r.uid.toString() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.patch("/api/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    await db.execute({
      sql: "UPDATE users SET role = ? WHERE id = ?",
      args: [role, id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error updating user role" });
  }
});

// --- API Routes for Teacher Panel ---

app.get("/api/users/students", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT id as uid, email, display_name as displayName, role FROM users WHERE role = 'alumno'",
      args: []
    });
    const students = result.rows.map(r => ({ ...r, uid: r.uid.toString() }));
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Error fetching students" });
  }
});

app.get("/api/materias", async (req, res) => {
  const teacherId = req.query.teacherId as string;
  try {
    const result = await db.execute({
      sql: "SELECT id, name, teacher_id as teacherId FROM materias WHERE teacher_id = ?",
      args: [teacherId]
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching materias" });
  }
});

app.post("/api/materias", async (req, res) => {
  const { id, name, teacherId } = req.body;
  try {
    await db.execute({
      sql: "INSERT INTO materias (id, name, teacher_id) VALUES (?, ?, ?)",
      args: [id, name, teacherId]
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error creating materia" });
  }
});

app.get("/api/cursos", async (req, res) => {
  const materiaIds = req.query.materiaIds as string;
  if (!materiaIds) return res.json([]);
  
  const ids = materiaIds.split(',');
  const placeholders = ids.map(() => '?').join(',');
  
  try {
    const result = await db.execute({
      sql: `SELECT id, name, materia_id as materiaId, visible_classes as visibleClasses FROM cursos WHERE materia_id IN (${placeholders})`,
      args: ids
    });
    
    const cursos = [];
    for (const row of result.rows) {
      const studentsResult = await db.execute({
        sql: "SELECT student_id FROM curso_students WHERE curso_id = ?",
        args: [row.id]
      });
      cursos.push({
        ...row,
        studentIds: studentsResult.rows.map(r => r.student_id)
      });
    }
    
    res.json(cursos);
  } catch (error) {
    res.status(500).json({ error: "Error fetching cursos" });
  }
});

app.post("/api/cursos", async (req, res) => {
  const { id, name, materiaId, visibleClasses } = req.body;
  try {
    await db.execute({
      sql: "INSERT INTO cursos (id, name, materia_id, visible_classes) VALUES (?, ?, ?, ?)",
      args: [id, name, materiaId, visibleClasses || 0]
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error creating curso" });
  }
});

app.patch("/api/cursos/:id", async (req, res) => {
  const { id } = req.params;
  const { visibleClasses, studentIds } = req.body;
  
  try {
    if (visibleClasses !== undefined) {
      await db.execute({
        sql: "UPDATE cursos SET visible_classes = ? WHERE id = ?",
        args: [visibleClasses, id]
      });
    }
    
    if (studentIds !== undefined) {
      await db.execute({
        sql: "DELETE FROM curso_students WHERE curso_id = ?",
        args: [id]
      });
      for (const studentId of studentIds) {
        await db.execute({
          sql: "INSERT INTO curso_students (curso_id, student_id) VALUES (?, ?)",
          args: [id, studentId]
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error updating curso" });
  }
});

// --- API Routes for Plans ---

app.get("/api/plans/:teacherId", async (req, res) => {
  const { teacherId } = req.params;
  try {
    const result = await db.execute({
      sql: "SELECT * FROM plans WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [teacherId]
    });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        id: row.id,
        teacherId: row.teacher_id,
        materiaId: row.materia_id,
        input: JSON.parse(row.input_data as string),
        plan: JSON.parse(row.plan_data as string)
      });
    } else {
      res.status(404).json({ error: "Plan not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error fetching plan" });
  }
});

app.post("/api/plans", async (req, res) => {
  const { id, teacherId, materiaId, input, plan } = req.body;
  try {
    // Check if plan exists for this teacher
    const existing = await db.execute({
      sql: "SELECT id FROM plans WHERE teacher_id = ?",
      args: [teacherId]
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE plans SET input_data = ?, plan_data = ?, materia_id = ? WHERE teacher_id = ?",
        args: [JSON.stringify(input), JSON.stringify(plan), materiaId || null, teacherId]
      });
    } else {
      await db.execute({
        sql: "INSERT INTO plans (id, teacher_id, materia_id, input_data, plan_data) VALUES (?, ?, ?, ?, ?)",
        args: [id || Date.now().toString(), teacherId, materiaId || null, JSON.stringify(input), JSON.stringify(plan)]
      });
    }
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error saving plan" });
  }
});

// --- API Routes for Student Panel ---

app.get("/api/student/dashboard", async (req, res) => {
  const studentId = req.query.studentId as string;
  if (!studentId) return res.status(400).json({ error: "Student ID required" });

  try {
    // 1. Get cursos for student
    const cursosResult = await db.execute({
      sql: "SELECT c.id, c.name, c.materia_id as materiaId, c.visible_classes as visibleClasses FROM cursos c JOIN curso_students cs ON c.id = cs.curso_id WHERE cs.student_id = ?",
      args: [studentId]
    });

    const dashboardData = [];

    for (const curso of cursosResult.rows) {
      // 2. Get materia
      const materiaResult = await db.execute({
        sql: "SELECT name, teacher_id FROM materias WHERE id = ?",
        args: [curso.materiaId]
      });

      let materiaName = "Materia Desconocida";
      let teacherId = null;

      if (materiaResult.rows.length > 0) {
        materiaName = materiaResult.rows[0].name as string;
        teacherId = materiaResult.rows[0].teacher_id;
      }

      // 3. Get plan for teacher
      let planData = null;
      if (teacherId) {
        const planResult = await db.execute({
          sql: "SELECT plan_data FROM plans WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 1",
          args: [teacherId]
        });
        if (planResult.rows.length > 0) {
          planData = JSON.parse(planResult.rows[0].plan_data as string);
        }
      }

      dashboardData.push({
        ...curso,
        materiaName,
        plan: planData
      });
    }

    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: "Error fetching student dashboard" });
  }
});

// --- Vite Integration ---
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
