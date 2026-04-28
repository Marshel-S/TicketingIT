const express = require("express");
const authRoutes = require("./routes/auth");
const db = require("./db");
const multer = require("multer");
const path = require("path")
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dehausst@gmail.com",
    pass: "xmll cvqy qkni jqhv"
  }
});

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
  const publicRoutes = [
    '/login',
    '/about',
    '/contact',
    '/forgot-password',
    '/register',
    '/reset-password',
    '/verify-token',
    '/new-password',
    '/api/contact',
    '/reset-password-confirm'
  ];

  if (
    req.path.startsWith('/css') ||
    req.path.startsWith('/js') ||
    req.path.startsWith('/images') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.jpg')
  ) {
    return next();
  }

  if (publicRoutes.includes(req.path)) {
    return next();
  }

  if (req.session.user) {
    return next();
  }

  res.redirect('/login');
}

app.use(isAuthenticated);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

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

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "resetpassword.html"));
});

app.get("/verify-token", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "verifytoken.html"));
});

app.get("/new-password", (req, res) => {
  if (!req.session.resetToken) {
    return res.redirect("/verify-token");
  }

  res.sendFile(path.join(__dirname, "views", "newpassword.html"));
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
      email: req.session.user.email,
      role: req.session.user.role,
      activeUsers: activeUsers.map(u => ({
        username: u.username,
        email: u.email,
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

app.post("/reset-password", (req, res) => {
  const { identifier, email } = req.body;

  db.query(
    "SELECT * FROM user.requester WHERE email=? AND mail=?",
    [identifier, email],
    (err, results) => {
      if (err) {
        console.log("DB ERROR:", err);
        return res.send("Error database");
      }

      if (results.length === 0) {
        return res.redirect("/verify-token");
      }

      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600000);

      db.query(
        "UPDATE user.requester SET reset_token=?, reset_token_expiry=? WHERE email=?",
        [token, expiry, identifier],
        (err) => {
          if (err) {
            console.log("UPDATE ERROR:", err);
            return res.send("Failed to keep Token");
          }

      const mailOptions = {
        from: "dehausst@gmail.com",
        to: email,
        subject: "Password Reset Token",
        html: `
          <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div style="background: #003686; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
            Password Reset Request
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px; color: #333;">
          <p style="margin-bottom: 15px;">We are <strong>TicketingIT Request Support!</strong></p>
          
          <p style="margin-bottom: 15px;">
            You requested a password reset for your account.
          </p>

          <p style="margin-bottom: 10px;">
            Your verification token is:
          </p>

          <div style="text-align: center; margin: 20px 0;">
            <span style="
              display: inline-block;
              padding: 10px 18px;
              font-size: 18px;
              letter-spacing: 2px;
              font-weight: bold;
              color: #003686;
              background: #eef3ff;
              border-radius: 8px;
              box-sizing: border-box;
              max-width: 100%;
            ">
              ${token}
            </span>
          </div>

          <p style="margin-bottom: 15px;">
            This token will expire in <b>1 hour</b>.
          </p>

          <p style="margin-bottom: 0;">
            If you did not request this, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          © 2026 Your Company. All rights reserved.
        </div>

      </div>
    </div>
        `
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log("EMAIL ERROR:", err);
          return res.send("Failed to send email");
        }

        console.log("Email sent:", info.response);

        req.session.resetToken = token;

        res.redirect("/verify-token");
        });
        }
      );
    }
  );
});

app.post("/verify-token", (req, res) => {
  const { token } = req.body;

  db.query(
    "SELECT * FROM user.requester WHERE reset_token=? AND reset_token_expiry > NOW()",
    [token],
    (err, results) => {
      if (err) return res.send("Error");

      if (results.length === 0) {
      return res.send(`
        <script>
          alert("Wrong or expired Token");
          window.location.href = "/verify-token";
        </script>
      `);
    }

      req.session.verifiedToken = token;

      res.redirect("/new-password");
    }
  );
});

app.post("/reset-password-confirm", async (req, res) => {
  const { password, confirmpassword } = req.body;
  const token = req.session.verifiedToken;

  console.log("PASS:", password);
  console.log("CONFIRM:", confirmpassword);
  console.log("TOKEN:", token);

  if (!token) {
    return res.send("Invalid Access");
  }

  if (password !== confirmpassword) {
    return res.send("Password and confirm password do not match");
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

  if (!passwordRegex.test(password)) {
  return res.redirect("/new-password?error=password");
}

  const bcrypt = require("bcrypt");

  db.query(
    "SELECT * FROM user.requester WHERE reset_token=? AND reset_token_expiry > NOW()",
    [token],
    async (err, results) => {
      if (err) return res.send("Error");

      if (results.length === 0) {
        return res.send("Invalid Token");
      }

      const user = results[0];
      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        "UPDATE user.requester SET password=?, reset_token=NULL, reset_token_expiry=NULL WHERE email=?",
        [hashedPassword, user.email],
        (err, result) => {
          if (err) {
            console.log("UPDATE ERROR:", err);
            return res.send("Failed to update Password");
          }

          console.log("UPDATE RESULT:", result);

          if (result.affectedRows === 0) {
            return res.send("Password not updated");
          }

          req.session.verifiedToken = null;
          res.redirect("/login?reset=success");
        }
      );
    }
  );
});

app.use(express.json());

const RECEIVER_EMAIL = "dehausst@gmail.com";

app.post("/api/contact", async (req, res) => {
  try {
    const { email, subject, name, lastname, company, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan pesan wajib diisi"
      });
    }

    const defaultMessage = `
      ${name} send Contact Request through website.

      From:
      - Nama: ${name} ${lastname}
      - Email: ${email}
      - No HP: ${phone || "-"}
      - Company: ${company || "-"}
    `;

    const mailOptions = {
      from: `"TicketingIT" <dehausst@gmail.com>`,
      to: RECEIVER_EMAIL,
      replyTo: email,
      subject: `Contact Request - ${subject}`,
      html: `
      <div style="font-family: 'Poppins', Arial, Helvetica, sans-serif; background:#f4f6f8; padding:20px;">
      
      <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
        
        <div style="background:#003c96; color:white; padding:20px;">
          <h2 style="margin:0;">TicketingIT Contact Request</h2>
          <p style="margin:5px 0 0;">New message from TicketingIT Contact</p>
        </div>

        <div style="padding:20px; color:#333;">
          
          <p><strong>Mr/Mrs. ${lastname}</strong> send contact request.</p>

          <table style="width:100%; margin-top:15px; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;"><strong>Nama</strong></td>
              <td>: ${name} ${lastname}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Email</strong></td>
              <td>: ${email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Phone</strong></td>
              <td>: ${phone || "-"}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>Company</strong></td>
              <td>: ${company || "-"}</td>
            </tr>
          </table>

          <p>Mr/Mrs. ${lastname} has submitted a contact request via the website and is interested in obtaining further information regarding the services offered.<br><br>
            Kindly contact the user using the provided email address or telephone number to proceed with follow-up.</p>

        </div>

        <div style="background:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#777;">
          This Email automaticaly sent from TicketingIT contact form.
        </div>

      </div>
      
    </div>
    `
    };

    await transporter.sendMail(mailOptions);

    res.send(`
      <script>
        alert('Pesan berhasil dikirim!');
        window.location.href = "/contact";
      </script>
    `);

  } catch (err) {
    console.error("EMAIL ERROR:", err);

    res.status(500).send(`
      <script>
        alert('Terjadi kesalahan saat mengirim email!');
        window.location.href = "/contact";
      </script>
    `);
  }
});

app.listen(3000, () => {
  console.log("Server running di http://localhost:3000");
});
