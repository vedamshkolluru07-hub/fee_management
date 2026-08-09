const pool = require("../../../config/db");

class ParentRepository {

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

    // ================= UPSERT PARENT =================
    static async upsertParent(data, client = pool) {
        const db = this.getClient(client);
        const items = this.normalize(data);

        const results = [];

        for (const d of items) {
            const {
                parents_id = null,
                contact_number,
                fathers_first_name,
                fathers_sur_name,
                mothers_first_name = null,
                mothers_sur_name = null,
                secondary_contact_number = null,
                email = null,
                address = null,
                occupation = null,
                is_connected = false
            } = d;

            const { rows } = await db.query(
                `
                INSERT INTO Parents (
                    parents_id,
                    contact_number,
                    fathers_first_name,
                    fathers_sur_name,
                    mothers_first_name,
                    mothers_sur_name,
                    secondary_contact_number,
                    email,
                    address,
                    occupation,
                    is_connected
                )
                VALUES (
                    COALESCE($1, gen_random_uuid()),
                    $2,$3,$4,$5,$6,$7,$8,$9,$10,$11
                )
                ON CONFLICT (parents_id)
                DO UPDATE SET
                    contact_number = EXCLUDED.contact_number,
                    fathers_first_name = EXCLUDED.fathers_first_name,
                    fathers_sur_name = EXCLUDED.fathers_sur_name,
                    mothers_first_name = EXCLUDED.mothers_first_name,
                    mothers_sur_name = EXCLUDED.mothers_sur_name,
                    secondary_contact_number = EXCLUDED.secondary_contact_number,
                    email = EXCLUDED.email,
                    address = EXCLUDED.address,
                    occupation = EXCLUDED.occupation,
                    is_connected = EXCLUDED.is_connected
                RETURNING *;
                `,
                [
                    parents_id,
                    contact_number,
                    fathers_first_name,
                    fathers_sur_name,
                    mothers_first_name,
                    mothers_sur_name,
                    secondary_contact_number,
                    email,
                    address,
                    occupation,
                    is_connected
                ]
            );

            results.push(rows[0]);
        }

        return this.isArray(data) ? results : results[0];
    }

    // ================= GET BY ID =================
    static async getParentById(parents_id, client = pool) {
        const db = this.getClient(client);
        const ids = this.normalize(parents_id);

        const { rows } = await db.query(
            `
            SELECT *
            FROM Parents
            WHERE parents_id = ANY($1);
            `,
            [ids]
        );

        return this.isArray(parents_id) ? rows : rows[0] || null;
    }

    // ================= GET BY CONTACT =================
    static async getParentByContact(contact1, contact2 = null, client = pool) {
        const db = this.getClient(client);

        const { rows } = await db.query(
            `
            SELECT *
            FROM Parents
            WHERE contact_number = $1
               OR contact_number = $2
               OR secondary_contact_number = $1
               OR secondary_contact_number = $2
            LIMIT 1;
            `,
            [contact1, contact2]
        );

        return rows[0] || null;
    }

    // ================= EXISTS =================
    static async contactExists(contact_number, client = pool) {
        const db = this.getClient(client);

        const { rows } = await db.query(
            `
            SELECT 1
            FROM Parents
            WHERE contact_number = $1
            LIMIT 1;
            `,
            [contact_number]
        );

        return rows.length > 0;
    }

    // ================= ALLOWED UPDATE FIELDS =================
    static allowedUpdateFields = new Set([
        "contact_number",
        "fathers_first_name",
        "fathers_sur_name",
        "mothers_first_name",
        "mothers_sur_name",
        "secondary_contact_number",
        "email",
        "address",
        "occupation",
        "is_connected"
    ]);

    // ================= SAFE UPDATE =================
    static async updateParent(parents_id, data, client = pool) {
        const db = this.getClient(client);

        const ids = this.normalize(parents_id);
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
                UPDATE Parents
                SET ${fields.join(", ")}
                WHERE parents_id = $${idx}
                RETURNING *;
                `,
                values
            );

            results.push(rows[0]);
        }

        return this.isArray(parents_id) ? results : results[0];
    }

    // ================= DELETE =================
    static async deleteParent(parents_id, client = pool) {
        const db = this.getClient(client);
        const ids = this.normalize(parents_id);

        const { rows } = await db.query(
            `
            DELETE FROM Parents
            WHERE parents_id = ANY($1)
            RETURNING *;
            `,
            [ids]
        );

        return this.isArray(parents_id) ? rows : rows[0] || null;
    }

    // ================= SEARCH =================
    static async searchParentsByFatherName(query, limit = 20, client = pool) {
        const db = this.getClient(client);

        const { rows } = await db.query(
            `
            SELECT *
            FROM Parents
            WHERE fathers_first_name ILIKE $1
               OR fathers_sur_name ILIKE $1
            LIMIT $2;
            `,
            [`%${query}%`, limit]
        );

        return rows;
    }
}

module.exports = ParentRepository;