const {
  fetchFamilyPendingRows
} = require('../repositories/familyPendingRepository.js');

async function getFamilyPendingData(studentId) {
  try {
    const rows = await fetchFamilyPendingRows(studentId);
    return rows;
  } catch (error) {
    console.error('Service error fetching family pending data:', error);
    throw error;
  }
}

module.exports = {
  getFamilyPendingData
};