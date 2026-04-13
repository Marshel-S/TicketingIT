require('dotenv').config();
const mysql = require("mysql2");

const userdb = mysql.createConnection({
  host: process.env.DB2_HOST,
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_NAME,
  port: process.env.DB2_PORT
});

userdb.connect(err => {
  if (err) {
    console.error("User DB ERROR:", err);
  } else {
    console.log("User Database connected!");
  }
});

module.exports = userdb;