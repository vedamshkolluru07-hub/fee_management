const ExcelJS = require("exceljs");

const { processBulkStudents } = require("../services/bulkStudentEnrollment.js");
const parseFile = require("../../../utils/parser.js");

// ================= FAILED FILE GENERATOR (ExcelJS VERSION) =================
async function generateFailedFile(failedRows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Failed_Students");

  // Define columns
  sheet.columns = Object.keys(failedRows[0] || {}).map((key) => ({
    header: key,
    key: key,
    width: 20,
  }));

  // Add rows
  sheet.addRows(failedRows);

  const filePath = `/tmp/failed_students_${Date.now()}.xlsx`;

  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

// ================= CONTROLLER =================
const bulkStudentController = async (req, res) => {
  let uploadedFilePath;

  try {
    // ================= PARSE FILE =================
    const students = await parseFile(req);

    // ================= VALIDATION =================
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No student data found in file",
      });
    }

    // ================= ROW LIMIT CHECK =================
    if (students.length > 1000) {
      return res.status(413).json({
        success: false,
        message: "Max 1000 rows allowed",
      });
    }

    // ================= PROCESS BULK =================
    const result = await processBulkStudents(students, req.user);

    uploadedFilePath = req.file?.path;

    // ================= FAILED FILE RESPONSE =================
    if (result.failed?.length > 0) {
      const filePath = await generateFailedFile(result.failed);

      return res.download(filePath, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Failed to download error file",
          });
        }
      });
    }

    // ================= SUCCESS RESPONSE =================
    return res.status(200).json({
      success: true,
      message: "Bulk students processed successfully",
      inserted: result.inserted,
      failed: result.failed,
      metrics: result.metrics,
    });

  } catch (err) {
    console.error("Bulk upload error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });

  } finally {
    // ================= SAFE CLEANUP =================
    if (uploadedFilePath) {
      const fs = require("fs");

      fs.unlink(uploadedFilePath, (err) => {
        if (err) {
          console.error("File cleanup failed:", err.message);
        }
      });
    }
  }
};

const manualBulkStudentController = async (req, res) => {
  try {
    const students = req.body.students;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No student data received",
      });
    }

    const result = await processBulkStudents(students, req.user);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  bulkStudentController,
  manualBulkStudentController
};