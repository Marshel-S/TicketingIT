const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../userdb");

router.post("/register", (req, res) => {
  const { identifier, email, password, confirmPassword } = req.body;

  if (!identifier || !email || !password || !confirmPassword) {
    return res.send("Field are required to fill");
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.redirect("/register?error=password");
  }

  if (password !== confirmPassword) {
    return res.redirect("/register?error=confirmPassword");
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.send("Error hashing password");
    }

    db.query(
      "INSERT INTO requester (email, mail, password) VALUES (?, ?, ?)",
      [identifier, email, hashedPassword],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.send("Gagal menyimpan ke database");
        }

        req.session.user = { email: identifier };
        res.redirect("/dashboard");
      }
    );
  });
});


// ================= LOGIN =================
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM requester WHERE email = ? OR mail = ?", [email, email], async (err, result) => {

    if (err) {
      console.log(err);
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.json({ success: false, message: "Wrong Identifier or Password" });
    }

    const user = result[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        req.session.user = {
          id: user.ID,
          username: user.username || user.email,
          email: user.email,
          role: user.role
        };

        if (typeof activeUsers !== "undefined") {
          activeUsers.push({
          username: req.session.user.username,
          role: req.session.user.role,
          sessionID: req.sessionID
        });
      }

        return res.json({ success: true });
      } else {
        return res.json({ success: false, message: "Wrong Identifier or Password" });
      }

    } catch (error) {
      console.log(error);
      return res.json({ success: false, message: "Terjadi kesalahan" });
    }

  });
});

router.post("/forgot-password", (req, res) => {
  
})

// ================= LOGOUT =================
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Destroy error:", err);
      return res.redirect("/dashboard");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/login");
  });
});

module.exports = router;