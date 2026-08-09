const pool = require("../../../config/db.js");

class StudentRepository {

    // ================= ALLOWED UPDATE FIELDS =================
    static allowedUpdateFields = new Set([
        "student_name",
        "sur_name",
        "dob",
        "gender",
        "section",
        "email_id",
        "admission_date",
        "is_connected",
        "status"
    ]);

    // ================= HELPERS =================
    static isArray(input) {
        return Array.isArray(input);
    }

    static normalize(input) {
        return this.isArray(input) ? input : [input];
    }

    static getClient(client) {
        return client || pool;
    }

    // ================= UPSERT =================
    static async upsertStudent(data, client = pool) {
        const db = this.getClient(client);
        const items = this.normalize(data);

        const results = [];

        for (const d of items) {
            const {
                student_id,
                student_name,
                sur_name,
                dob = null,
                gender,
                section,
                email_id = null,
                admission_date = null,
                is_connected = false,
                status
            } = d;

            const { rows } = await db.query(
                `
                INSERT INTO Students (
                    student_id,
                    student_name,
                    sur_name,
                    dob,
                    gender,
                    section,
                    email_id,
                    admission_date,
                    is_connected,
                    status
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                ON CONFLICT (student_id)
                DO UPDATE SET
                    student_name = EXCLUDED.student_name,
                    sur_name = EXCLUDED.sur_name,
                    dob = EXCLUDED.dob,
                    gender = EXCLUDED.gender,
                    section = EXCLUDED.section,
                    email_id = EXCLUDED.email_id,
                    admission_date = EXCLUDED.admission_date,
                    is_connected = EXCLUDED.is_connected,
                    status = EXCLUDED.status
                RETURNING *;
                `,
                [
                    student_id,
                    student_name,
                    sur_name,
                    dob,
                    gender,
                    section,
                    email_id,
                    admission_date,
                    is_connected,
                    status
                ]
            );

            results.push(rows[0]);
        }

        return this.isArray(data) ? results : results[0];
    }

    // ================= FIND BY ID =================
    static async findById(student_id, client = pool) {
        const db = this.getClient(client);
        const ids = this.normalize(student_id);

        const { rows } = await db.query(
            `
            SELECT *
            FROM Students
            WHERE student_id = ANY($1);
            `,
            [ids]
        );

        return this.isArray(student_id) ? rows : rows[0] || null;
    }

    // ================= SAFE UPDATE =================
    static async update(student_id, data, client = pool) {
        const db = this.getClient(client);
        const ids = this.normalize(student_id);
        const items = this.normalize(data);

        const results = [];

        for (let i = 0; i < ids.length; i++) {
            const updateData = items[i] || items[0];

            const fields = [];
            const values = [];
            let idx = 1;

            for (const key of Object.keys(updateData)) {
                if (!this.allowedUpdateFields.has(key)) continue;

                fields.push(`${key} = $${idx}`);
                values.push(updateData[key]);
                idx++;
            }

            if (fields.length === 0) {
                results.push(null);
                continue;
            }

            values.push(ids[i]);

            const { rows } = await db.query(
                `
                UPDATE Students
                SET ${fields.join(", ")}
                WHERE student_id = $${idx}
                RETURNING *;
                `,
                values
            );

            results.push(rows[0]);
        }

        return this.isArray(student_id) ? results : results[0];
    }

    // ================= DELETE =================
    static async delete(student_id, client = pool) {
        const db = this.getClient(client);
        const ids = this.normalize(student_id);

        const { rows } = await db.query(
            `
            DELETE FROM Students
            WHERE student_id = ANY($1)
            RETURNING *;
            `,
            [ids]
        );

        return this.isArray(student_id) ? rows : rows[0] || null;
    }

    // ================= EXISTS =================
    static async exists(student_id, client = pool) {
        const db = this.getClient(client);
        const ids = this.normalize(student_id);

        const { rows } = await db.query(
            `
            SELECT 1
            FROM Students
            WHERE student_id = ANY($1)
            LIMIT 1;
            `,
            [ids]
        );

        return rows.length > 0;
    }

    // ================= FULL-TEXT SEARCH =================
    static async searchByName(query, limit = 20, client = pool) {
        const db = this.getClient(client);

        const { rows } = await db.query(
            `
            SELECT *
            FROM Students
            WHERE name_vector @@ plainto_tsquery('simple', $1)
            ORDER BY ts_rank(name_vector, plainto_tsquery('simple', $1)) DESC
            LIMIT $2;
            `,
            [query, limit]
        );

        return rows;
    }

    // ================= LIKE SEARCH FALLBACK =================
    static async searchByNameLike(query, limit = 20, client = pool) {
        const db = this.getClient(client);

        const { rows } = await db.query(
            `
            SELECT *
            FROM Students
            WHERE student_name ILIKE $1
               OR sur_name ILIKE $1
            LIMIT $2;
            `,
            [`%${query}%`, limit]
        );

        return rows;
    }

    // ================= IMPORTANT NOTE =================
    /*
        ❌ REMOVED: updateStudentId()

        Reason:
        - Updating primary key (student_id) is unsafe
        - Breaks foreign key relationships (ParentStudents)
        - Your schema does NOT define ON UPDATE CASCADE

        ✔ Recommended:
        - Never update student_id
        - Treat it as immutable identifier
        - If needed, insert new + migrate relations
    */
}

module.exports = StudentRepository;