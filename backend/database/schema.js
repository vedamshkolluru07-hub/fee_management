const fs = require("fs");
const path = require("path");
const db = require("../config/db.js");

const runFile = async (file) => {
  const sql = fs.readFileSync(
    path.join(__dirname, file),
    "utf8"
  );

  await db.query(sql);
};

const initSchema = async () => {
  const files = [
    "001_cms_schema.sql",
    "userManagement.sql",
    "academicManagement.sql",   // ✅ creates academic_years first
    "calanderManagement.sql",   // ✅ now academic_years exists for the FK
    "studentManagement.sql",
    "paymentManagement.sql",
    "paymentFunction.sql"
  ];

  for (const file of files) {
    await runFile(file);
  }

  console.log("Schema initialized successfully");
};

module.exports = initSchema;