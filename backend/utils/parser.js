const ExcelJS = require("exceljs");
const csv = require("csv-parser");
const stream = require("stream");

function parseFile(req) {
  return new Promise(async (resolve, reject) => {
    try {
      // ================= JSON INPUT =================
      if (req.body?.type === "json") {
        if (!req.body.data) {
          return reject(new Error("No JSON data provided"));
        }
        return resolve(req.body.data);
      }

      const file = req.file;

      if (!file) {
        return reject(new Error("No file uploaded"));
      }

      const fileName = file.originalname?.toLowerCase();

      // ================= EXCEL (.xlsx) =================
      const isExcel = fileName?.endsWith(".xlsx");

      if (isExcel) {
        try {
          const workbook = new ExcelJS.Workbook();

          // works ONLY with multer memoryStorage
          await workbook.xlsx.load(file.buffer);

          const sheet = workbook.worksheets[0];

          if (!sheet) {
            return reject(new Error("No sheets found in Excel file"));
          }

          const data = [];

          sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header

            data.push({
              name: row.getCell(1).value,
              email: row.getCell(2).value,
              class: row.getCell(3).value,
            });
          });

          return resolve(data);
        } catch (err) {
          return reject(new Error("Failed to parse Excel file"));
        }
      }

      // ================= CSV =================
      const isCSV = fileName?.endsWith(".csv");

      if (isCSV) {
        try {
          const results = [];

          const bufferStream = new stream.PassThrough();
          bufferStream.end(file.buffer);

          bufferStream
            .pipe(csv())
            .on("data", (row) => results.push(row))
            .on("end", () => resolve(results))
            .on("error", () => reject(new Error("Failed to parse CSV file")));

          return;
        } catch (err) {
          return reject(new Error("Failed to parse CSV file"));
        }
      }

      // ================= UNSUPPORTED FILE =================
      return reject(new Error("Unsupported file format. Use CSV or XLSX."));
    } catch (err) {
      return reject(err);
    }
  });
}

module.exports = parseFile;