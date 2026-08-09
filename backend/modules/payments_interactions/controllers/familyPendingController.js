const {
  getFamilyPendingData
} = require('../services/getFamilyPendingData.js');

async function getFamilyPendingController(req, res) {
  try {
    console.log('🔵 [Controller] Incoming request');
    console.log('📌 Params:', req.params);

    const { studentId } = req.params;

    if (!studentId) {
      console.log('❌ Missing studentId in request');

      return res.status(400).json({
        success: false,
        message: 'studentId is required'
      });
    }

    console.log('🟡 Fetching data for studentId:', studentId);

    const data = await getFamilyPendingData(studentId);

    console.log('🟢 Data received from service:', data);
    console.log('📊 Total rows:', data ? data.length : 0);

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('🔥 Controller error occurred');
    console.error('❗ Message:', error.message);
    console.error('📍 Stack:', error.stack);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = {
  getFamilyPendingController
};