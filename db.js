const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ticketing",
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error("DB ERROR:", err);
  } else {
  console.log("Ticket Database connected!");
  }
});

module.exports = db;
