const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/test-insert", (req, res) => {
  db.query(
    "INSERT INTO ticket (subject, requester, email, attachment, message, status, priority) VALUES ('TEST', 'ADMIN', 'a@gmail.com', 'foto.jpg', 'HALO', 'Unassigned', 'High')",
    (err) => {
      if (err) return res.send(err);
      res.send("INSERT OK");
    }
  );
});

router.get("/api/tickets", (req, res) => {
  const { subject, requester, email, attachment, message, status, priority } = req.body;

  if (!subject || !requester || !email || !attachment || !message || !status || !priority) {
    return res.status(400).send("Data tidak lengkap");
  }

  const sql = `
    INSERT INTO ticket
    (subject, requester, email, attachment, message, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [subject, requester, email, attachment, message, status, priority], (err, result) => {
    if (err) return res.status(500).send("Gagal menyimpan data");

    res.json({
      message: "Data berhasil disimpan",
      id: result.insertId,
    });
  });
});

router.get("/api/tickets", (req, res) => {
  db.query("SELECT * FROM ticket", (err, result) => {
    if (err) return res.status(500).send("Gagal mengambil data");
    res.json(result);
  });
});

module.exports = router;
