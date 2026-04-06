const express = require("express");
const authRoutes = require("./routes/auth");
const db = require("./db");
const multer = require("multer");
const path = require("path")

const app = express();

const activeUsers = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));;

const session = require("express-session");

app.set('trust proxy', 1);

app.use(session({
  secret: "secretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: "lax"
  }
}));

function isAuthenticated(req, res, next) {
  console.log("SESSION CHECK:", req.session);

  if (req.session && req.session.user) {
    return next();
  } else {
    return res.redirect("/login");
  }
}

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "forgotpassword.html"));
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

app.get("/create", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/ticket", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "list.html"));
});

app.get("/details", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "details.html"));
});

app.get("/about", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "about.html"));
});

app.get("/contact", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "contact.html"));
});

app.get("/api/user", isAuthenticated, (req, res) => {
  res.json(req.session.user);
});

app.use("/", authRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  if (req.url.startsWith("/dashboard") || req.url.startsWith("/ticket")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.send("Server berjalan");
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.setHeader("Cache-Control", "no-store");
  res.sendFile(__dirname + "/dashboard");
});

app.get("/test-insert", (req, res) => {
  db.query(
    "INSERT INTO ticket (subject, requester, email, attachment, message, status, priority) VALUES ('TEST', 'ADMIN', 'a@gmail.com', 'foto.jpg', 'HALO', 'Unassigned', 'High')",
    (err, result) => {
      if (err) return res.send(err);
      res.send("INSERT OK");
    }
  );
});

app.get("/api/session", (req, res) => {
  if (req.session.user) {
    res.json({
      loggedIn: true,
      username: req.session.user.username,
      role: req.session.user.role,
      activeUsers: activeUsers.map(u => ({
        username: u.username,
        role: u.role
      }))
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post("/api/tickets", upload.single("attachment"), (req, res) => {
  console.log("New Receive Request:", req.body);
  console.log("Uploaded File:", req.file);

  if (!req.session.user) {
    return res.status(401).send("Unauthorized");
  }

  const { subject, email, message, priority } = req.body;

  const requester = req.session.user.username;
  const status = req.body.status || "Unassigned";
  const attachment = req.file ? req.file.filename : null;

  if (!subject || !email || !message || !priority) {
    return res.status(400).send("Data tidak lengkap");
  }

  const sql = `
    INSERT INTO ticket
    (subject, requester, email, attachment, message, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [subject, requester, email, attachment, message, status, priority],
    (err, result) => {
      if (err) return res.status(500).send("Gagal menyimpan data");

      res.json({
        message: "Ticket created successfully",
        id: result.insertId
      });
    }
  );
});

app.get("/api/tickets", (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const role = req.session.user.role;
  const userId = req.session.user.id;
  const status = req.query.status;

  let sql = "";
  let params = [];

  if (role === "technical") {
    sql = `
      SELECT * FROM ticket
      WHERE assigned_to = ?
    `;
    params = [userId];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += " ORDER BY id DESC";

  } else if (role === "admin") {
    sql = `SELECT * FROM ticket`;

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY id DESC";

  } else {
    sql = `
      SELECT * FROM ticket
      WHERE requester = ?
    `;
    params = [req.session.user.username];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += " ORDER BY id DESC";
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Gagal mengambil data");
    }

    res.json(result);
  });

});

app.delete("/api/tickets/:id", (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const role = req.session.user.role;

  if (role === "user") {
    return res.status(403).json({ message: "User was not be able to delete the Ticket" });
  }

  const id = req.params.id;

  db.query("DELETE FROM ticket WHERE id = ?", [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed");
    }

    res.json({ message: "Ticket has been deleted" });
  });

});

app.get("/api/tickets/:id", (req, res) => {

  const id = req.params.id;

  const sql = `
    SELECT 
      t.*,
      u.email AS assigned_name
    FROM ticketing.ticket t
    LEFT JOIN user.requester u 
      ON t.assigned_to = u.id
    WHERE t.id = ?
  `;

  db.query(sql, [id], (err, result) => {

    if (err) {
      console.error(err);
      return res.status(500).send("Error database");
    }

    if (result.length === 0) {
      return res.status(404).send("Ticket was not found");
    }

    res.json(result[0]);
  });

});

app.patch("/api/tickets/:id/status", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "Status cannot be empty" });

  const sql = "UPDATE ticket SET status = ? WHERE id = ?";
  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to update Ticket Status" });

    res.json({ message: "Status updated successfully", id, status });
  });
});

app.get("/technical-users", (req, res) => {
  const sql = `
    SELECT id, email 
    FROM user.requester 
    WHERE role = 'technical'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("DB Error");
    }
    res.json(results);
  });
}); 

app.patch("/api/tickets/:id/assign", (req, res) => {
  const id = req.params.id;
  const { technicalId } = req.body;

  if (!technicalId) {
    return res.status(400).json({ message: "Technical has not selected yet" });
  }

  const sql = `
    UPDATE ticket 
    SET assigned_to = ?, status = 'Assigned'
    WHERE id = ?
  `;

  db.query(sql, [technicalId, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB Error" });
    }

    res.json({ message: "Ticket berhasil di-assign" });
  });
});

app.patch("/api/tickets/:id/reject", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false });
  }

  const ticketId = req.params.id;
  const { reason } = req.body;
  const username = req.session.user.username;

  const sql = `
  UPDATE ticket
  SET 
    status = 'Revision',
    reject_reason = ?,
    rejected_by = ?
  WHERE id = ?
`;

  db.query(sql, [reason, username, ticketId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    res.json({ success: true });
  });
});

app.get("/api/ticket-stats", (req, res) => {

  if (!req.session.user) {
    return res.status(401).send("Unauthorized");
  }

  const role = req.session.user.role?.toLowerCase().trim();
  const userId = req.session.user.id;
  const username = req.session.user.username;

  let sql = `
    SELECT status, COUNT(*) as total
    FROM ticket
  `;

  let params = [];

  if (role === "user") {
    sql += " WHERE requester = ?";
    params.push(username);

  } else if (role === "technical") {
    sql += " WHERE assigned_to = ?";
    params.push(userId);
  }

  sql += " GROUP BY status";

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }

    let stats = {
      unassigned: 0,
      assigned: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      revision: 0
    };

    results.forEach(row => {

      const status = row.status
        .toLowerCase()
        .replace(/\s+/g, "_");

      if (stats.hasOwnProperty(status)) {
        stats[status] = row.total;
      }

    });

    res.json(stats);

  });

});

app.listen(3000, () => {
  console.log("Server running di http://localhost:3000");
});
