const studentClassesRepository = require("../repositories/studentClassRepository.js");

async function getPaymentId(academicYearId, classId, studentId) {
  const record = await studentClassesRepository.getPaymentId(
    academicYearId,
    classId,
    studentId
  );

  if (!record) {
    throw new Error("Student class record not found");
  }

  return {
    payment_id: record.payment_id,
  };
}

module.exports = {
  getPaymentId,
};