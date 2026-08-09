// job/holidayImporter.js
const axios = require("axios");
const pool = require("../config/db.js");

const COUNTRY = "IN";
const CALENDARIFIC_API_KEY = process.env.CALENDARIFIC_API_KEY;
const CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2/holidays";

/**
 * ================= CORE: Import holidays for a single year =================
 * Accepts an optional `client` (transaction connection). If not provided,
 * falls back to the global pool. Passing the client is REQUIRED when this
 * is called from inside an existing transaction (e.g. createAcademicSetup),
 * otherwise the insert will race/deadlock against the uncommitted
 * academic_year_id row.
 *
 * Uses Calendarific (https://calendarific.com) instead of Nager.Date,
 * since Nager.Date does not have holiday data implemented for India (IN)
 * — it returns 200 OK with an empty array instead of an error.
 */
async function importHolidaysForYear(year, academicYearId, client = null, country = COUNTRY) {
  console.log(`[HolidayImporter] ▶ Starting import for year=${year}, academicYearId=${academicYearId}, country=${country}, usingClient=${!!client}`);

  const db = client || pool;

  if (!CALENDARIFIC_API_KEY) {
    console.error(`[HolidayImporter] ❌ Missing CALENDARIFIC_API_KEY in environment variables. Skipping import for year=${year}.`);
    return;
  }

  try {
    // Skip if this year already has holidays imported
    console.log(`[HolidayImporter] Checking if year=${year} already imported...`);
    const exists = await db.query(
      `SELECT 1 FROM calendar 
       WHERE event_type = 'holiday' 
       AND EXTRACT(YEAR FROM start_time) = $1 
       LIMIT 1`,
      [year]
    );
    console.log(`[HolidayImporter] Existing rows found for year=${year}: ${exists.rows.length}`);

    if (exists.rows.length > 0) {
      console.log(`[HolidayImporter] Year ${year} already imported, skipping`);
      return;
    }

    const requestUrl = `${CALENDARIFIC_BASE_URL}?api_key=${CALENDARIFIC_API_KEY}&country=${country}&year=${year}`;
    console.log(`[HolidayImporter] Fetching holidays from API: ${CALENDARIFIC_BASE_URL}?api_key=***&country=${country}&year=${year}`);

    const response = await axios.get(requestUrl);

    const holidays = response.data?.response?.holidays || [];
    console.log(`[HolidayImporter] API responded with ${holidays.length} holidays for year=${year}`);

    if (!holidays.length) {
      console.warn(`[HolidayImporter] ⚠ No holidays returned by API for year=${year}`);
    }

    for (const holiday of holidays) {
      const isoDate = holiday?.date?.iso;
      const name = holiday?.name;
      const description = holiday?.description || null;

      if (!isoDate || !name) {
        console.warn(`[HolidayImporter] ⚠ Skipping malformed holiday entry:`, holiday);
        continue;
      }

      console.log(`[HolidayImporter] Inserting: ${isoDate} - ${name}`);
      await db.query(
        `INSERT INTO calendar (
          title, description, start_time, event_type, is_all_day, academic_year_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, description, isoDate, "holiday", true, academicYearId]
      );
    }

    console.log(`[HolidayImporter] ✅ Imported ${holidays.length} holidays for year=${year}`);
  } catch (err) {
    console.error(`[HolidayImporter] ❌ FAILED for year=${year}, academicYearId=${academicYearId}`);
    console.error(`[HolidayImporter] Error name: ${err.name}`);
    console.error(`[HolidayImporter] Error message: ${err.message}`);
    if (err.response) {
      // axios error with an HTTP response
      console.error(`[HolidayImporter] API status: ${err.response.status}`);
      console.error(`[HolidayImporter] API response data:`, err.response.data);
    } else if (err.request) {
      // axios error with no response (network/DNS/timeout)
      console.error(`[HolidayImporter] No response received from API (network/DNS/timeout issue)`);
    }
    if (err.code) {
      console.error(`[HolidayImporter] Postgres/Node error code: ${err.code}`);
    }
    console.error(err.stack);
    throw err; // re-throw so the caller's catch (in the repository) still logs/handles it
  }
}

/**
 * ================= Import holidays for an academic year label =================
 * e.g. "2025-2026" → imports 2025 AND 2026 (if missing)
 * e.g. "2026-2027" → imports only 2027 (2026 already exists, skipped)
 */
async function importHolidaysForLabel(label, academicYearId, client = null, country = COUNTRY) {
  console.log(`[HolidayImporter] ==== importHolidaysForLabel called with label="${label}", academicYearId=${academicYearId} ====`);

  const [startYear, endYear] = label.split("-").map(Number);
  console.log(`[HolidayImporter] Parsed label → startYear=${startYear}, endYear=${endYear}`);

  const years = [...new Set([startYear, endYear])]; // avoid duplicate if same year
  console.log(`[HolidayImporter] Years to process: ${years.join(", ")}`);

  for (const year of years) {
    await importHolidaysForYear(year, academicYearId, client, country);
  }

  console.log(`[HolidayImporter] ==== Done processing label="${label}" ====`);
}

module.exports = { importHolidaysForYear, importHolidaysForLabel };