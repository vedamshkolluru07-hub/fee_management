const pool = require("../../../config/db");

class ParentStudentRepository {

    static allowedRelationships = ["Father", "Mother", "Guardian"];

    // ================= HELPERS =================
    static _isArray(input) {
        return Array.isArray(input);
    }

    static _normalize(input) {
        return this._isArray(input) ? input : [input];
    }

    static _validateRelationship(rel) {
        if (!this.allowedRelationships.includes(rel)) {
            throw new Error("Invalid relationship type");
        }
    }

    static _getClient(client) {
        return client || pool;
    }

    // ================= UPSERT RELATION =================
    static async upsertRelation(data, client = pool) {
        const db = this._getClient(client);
        const items = this._normalize(data);
        const results = [];

        for (const item of items) {
            const { parents_id, student_id, relationship } = item;

            this._validateRelationship(relationship);

            const { rows } = await db.query(
                `
                INSERT INTO ParentStudents (
                    parents_id,
                    student_id,
                    relationship
                )
                VALUES ($1, $2, $3)
                ON CONFLICT (parents_id, student_id)
                DO UPDATE SET
                    relationship = EXCLUDED.relationship
                RETURNING *;
                `,
                [parents_id, student_id, relationship]
            );

            results.push(rows[0]);
        }

        return this._isArray(data) ? results : results[0];
    }

    // ================= UPDATE STUDENT ID (SAFE TX) =================
    static async updateStudentId(old_student_id, new_student_id, client = pool) {
        const db = this._getClient(client);

        return await db.query(
            `
            UPDATE ParentStudents
            SET student_id = $1
            WHERE student_id = $2
            RETURNING *;
            `,
            [new_student_id, old_student_id]
        ).then(res => res.rows);
    }

    // ================= UPDATE PARENT ID (SAFE TX) =================
    static async updateParentId(old_parent_id, new_parent_id, client = pool) {
        const db = this._getClient(client);

        return await db.query(
            `
            UPDATE ParentStudents
            SET parents_id = $1
            WHERE parents_id = $2
            RETURNING *;
            `,
            [new_parent_id, old_parent_id]
        ).then(res => res.rows);
    }

    // ================= FIND RELATION =================
    static async findRelation(parents_id, student_id, client = pool) {
        const db = this._getClient(client);
        const ids = this._normalize(parents_id);

        const { rows } = await db.query(
            `
            SELECT *
            FROM ParentStudents
            WHERE parents_id = ANY($1)
            AND student_id = $2;
            `,
            [ids, this._isArray(student_id) ? student_id[0] : student_id]
        );

        return this._isArray(parents_id) ? rows : rows[0] || null;
    }

    // ================= GET BY STUDENT =================
    static async getRelationsByStudentId(student_id, client = pool) {
        const db = this._getClient(client);

        const { rows } = await db.query(
            `
            SELECT ps.*, p.*
            FROM ParentStudents ps
            JOIN Parents p ON p.parents_id = ps.parents_id
            WHERE ps.student_id = $1;
            `,
            [student_id]
        );

        return rows;
    }

    // ================= GET BY PARENT =================
    static async getRelationsByParentId(parents_id, client = pool) {
        const db = this._getClient(client);

        if (!parents_id) {
            throw new Error("parents_id is required");
        }

        const { rows } = await db.query(
            `
            SELECT *
            FROM ParentStudents
            WHERE parents_id = $1;
            `,
            [parents_id]
        );

        return rows;
    }

    // ================= DELETE RELATION =================
    static async deleteRelation(parents_id, student_id, client = pool) {
        const db = this._getClient(client);

        const pIds = this._normalize(parents_id);
        const sIds = this._normalize(student_id);

        const results = [];

        for (let i = 0; i < pIds.length; i++) {
            const { rows } = await db.query(
                `
                DELETE FROM ParentStudents
                WHERE parents_id = $1
                AND student_id = $2
                RETURNING *;
                `,
                [pIds[i], sIds[i] || sIds[0]]
            );

            results.push(rows[0] || null);
        }

        return this._isArray(parents_id) ? results : results[0] || null;
    }

    // ================= EXISTS CHECK =================
    static async exists(parents_id, student_id, client = pool) {
        const db = this._getClient(client);

        const pIds = this._normalize(parents_id);

        const { rows } = await db.query(
            `
            SELECT EXISTS (
                SELECT 1
                FROM ParentStudents
                WHERE parents_id = ANY($1)
                AND student_id = $2
            ) AS exists;
            `,
            [pIds, this._isArray(student_id) ? student_id[0] : student_id]
        );

        return rows[0].exists;
    }
}

module.exports = ParentStudentRepository;