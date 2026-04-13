require('dotenv').config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB1_HOST,
  user: process.env.DB1_USER,
  password: process.env.DB1_PASSWORD,
  database: process.env.DB1_NAME,
  port: process.env.DB1_PORT
});

db.connect(err => {
  if (err) {
    console.error("DB ERROR:", err);
  } else {
    console.log("Ticket Database connected!");
  }
});

module.exports = db;