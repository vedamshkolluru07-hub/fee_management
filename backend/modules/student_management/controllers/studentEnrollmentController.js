// controllers/studentEnrollmentController.js

const studentEnrollmentService = require("../services/studentEnrollmentService.js");

/**
 * Create Student Enrollment Controller
 */
const createStudentEnrollment = async (req, res) => {
  console.log("createStudentEnrollment controller triggered");

  try {
    // Log incoming request body
    const payload = req.body;
    console.log("Incoming payload:", payload);

    // Call service
    console.log("Calling studentEnrollmentService.createStudentEnrollment");
    const result = await studentEnrollmentService.createStudentEnrollment(payload, req.user);

    // Log service result
    console.log("Service result:", result);

    // Handle failure case
    if (!result || result.success !== true) {
      console.warn("Enrollment creation failed");

      return res.status(400).json({
        success: false,
        message: result && result.message ? result.message : "Enrollment creation failed",
      });
    }

    // Success case
    console.log("Enrollment created successfully");

    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });

  } catch (error) {
    // Log error details
    console.error("Error in createStudentEnrollment controller");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createStudentEnrollment,
};