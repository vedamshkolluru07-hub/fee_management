-- =====================================================================
--  PAYMENTS MODULE — CONSOLIDATED SCHEMA
--  (student_classes / payments / transactions / books / uniforms)
--
--  This file is idempotent: safe to run repeatedly against the same
--  database. All CREATE statements use IF NOT EXISTS / OR REPLACE,
--  and all constraints are added via guarded DO blocks so re-running
--  never errors out on "already exists".
--
--  Order of sections:
--    1. Extensions
--    2. Shared trigger function
--    3. Core tables (student_classes, payments, transactions)
--    4. Books / Uniforms payment tables
--    5. Constraints (FKs + uniqueness) added after all tables exist
--    6. updated_at triggers
--    7. Tuition functions
--    8. Books functions
--    9. Uniform functions
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. SHARED FUNCTION: updated_at maintenance
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 2. CORE TABLES
-- =====================================================================

-- One row per (student, class, academic_year) enrollment.
-- payment_id here is the master "enrollment id" that payments,
-- transactions, bookspayments and uniformpayments all key off of.
CREATE TABLE IF NOT EXISTS student_classes (
    payment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       VARCHAR(20) NOT NULL,
    class_id         INT NOT NULL,
    academic_year_id INT NOT NULL,
    is_connected     BOOLEAN DEFAULT FALSE,
    UNIQUE (student_id, class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_student_classes_student_id       ON student_classes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_class_id         ON student_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_academic_year_id ON student_classes(academic_year_id);

-- Tuition ledger summary — one row per enrollment (payment_id).
CREATE TABLE IF NOT EXISTS payments (
    payment_id        UUID PRIMARY KEY,
    concession        NUMERIC(10,2) DEFAULT 0 CHECK (concession >= 0),
    total_amount_paid NUMERIC(10,2) DEFAULT 0 CHECK (total_amount_paid >= 0),
    pending_amount    NUMERIC(10,2) DEFAULT 0 CHECK (pending_amount >= 0),
    payment_status    VARCHAR(15) DEFAULT 'PENDING'
                       CHECK (payment_status IN ('PENDING','PARTIAL','PAID')),
    due_date          DATE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_status         ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at     ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_updated_at     ON payments(updated_at);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(payment_status, created_at);

-- Raw payment/transaction log (tuition, books, uniform all logged here
-- for tuition; books/uniform amounts are additionally tracked as
-- cumulative rows in bookspayments/uniformpayments — see doubts below).
CREATE TABLE IF NOT EXISTS transactions (
    transaction_pk UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT DEFAULT NULL,
    payment_id     UUID NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','card','online')),
    amount_paid    NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
    remarks        VARCHAR(20) NOT NULL CHECK (remarks IN ('tuition','books','uniform')),
    payment_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_id      ON transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_remarks         ON transactions(remarks);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date    ON transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_remarks ON transactions(payment_id, remarks);

-- Prevents double-recording the same gateway/receipt reference,
-- while still allowing many NULLs (cash payments with no external ref).
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_transaction_id
    ON transactions(transaction_id) WHERE transaction_id IS NOT NULL;

-- =====================================================================
-- 3. BOOKS + UNIFORM PAYMENT TABLES
--    One cumulative row per (payment_id, book_id) / (payment_id, uniform_id).
-- =====================================================================
CREATE TABLE IF NOT EXISTS bookspayments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id            UUID NOT NULL,
    book_id               INT NOT NULL,
    book_type             VARCHAR(50) NOT NULL,
    books_amount          NUMERIC(10,2) DEFAULT 0,
    books_paid            NUMERIC(10,2) DEFAULT 0,
    books_discount        NUMERIC(10,2) DEFAULT 0,
    books_pending_amount  NUMERIC(10,2) DEFAULT 0,
    books_payment_status  VARCHAR(15) DEFAULT 'PENDING',
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received              BOOLEAN DEFAULT FALSE,
    received_at           TIMESTAMP DEFAULT NULL, -- FIX: was defaulting to CURRENT_TIMESTAMP even though received=false
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookspayments_payment_id   ON bookspayments(payment_id);
CREATE INDEX IF NOT EXISTS idx_bookspayments_book_id      ON bookspayments(book_id);
CREATE INDEX IF NOT EXISTS idx_bookspayments_status       ON bookspayments(books_payment_status);
CREATE INDEX IF NOT EXISTS idx_bookspayments_received     ON bookspayments(received);
CREATE INDEX IF NOT EXISTS idx_bookspayments_payment_book ON bookspayments(payment_id, book_id);

CREATE TABLE IF NOT EXISTS uniformpayments (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id             UUID NOT NULL,
    uniform_id             INT NOT NULL,
    uniform_type           VARCHAR(50) NOT NULL,
    uniform_amount         NUMERIC(10,2) DEFAULT 0,
    uniform_paid           NUMERIC(10,2) DEFAULT 0,
    uniform_discount       NUMERIC(10,2) DEFAULT 0,
    uniform_pending_amount NUMERIC(10,2) DEFAULT 0,
    uniform_payment_status VARCHAR(15) DEFAULT 'PENDING',
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received               BOOLEAN DEFAULT FALSE,
    received_at            TIMESTAMP DEFAULT NULL, -- FIX: same as above
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uniformpayments_payment_id   ON uniformpayments(payment_id);
CREATE INDEX IF NOT EXISTS idx_uniformpayments_uniform_id   ON uniformpayments(uniform_id);
CREATE INDEX IF NOT EXISTS idx_uniformpayments_status       ON uniformpayments(uniform_payment_status);
CREATE INDEX IF NOT EXISTS idx_uniformpayments_received     ON uniformpayments(received);
CREATE INDEX IF NOT EXISTS idx_uniformpayments_payment_uniform ON uniformpayments(payment_id, uniform_id);

-- =====================================================================
-- 4. CONSTRAINTS (added after all tables exist, guarded so re-runs are safe)
--
--    NOTE: transactions/bookspayments/uniformpayments FK against
--    student_classes(payment_id) — NOT payments(payment_id). The real
--    parent entity is the enrollment row in student_classes (its
--    payment_id is generated once, at enrollment); payments is only a
--    lazily-created summary row (upserted inside fn_handle_tuition /
--    fn_handle_book_payment / fn_handle_uniform_payment). FKing to
--    payments directly would force a payments row to exist before you
--    could log a transaction or a book/uniform payment for a brand-new
--    enrollment — pointing at student_classes instead removes that
--    ordering dependency entirely.
-- =====================================================================
DO $$
BEGIN
    -- One cumulative row per payment+book (required for the ON CONFLICT
    -- upsert used in fn_handle_book_payment below).
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_bookspayments_payment_book') THEN
        ALTER TABLE bookspayments
            ADD CONSTRAINT uq_bookspayments_payment_book UNIQUE (payment_id, book_id);
    END IF;

    -- Same for uniform payments.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_uniformpayments_payment_uniform') THEN
        ALTER TABLE uniformpayments
            ADD CONSTRAINT uq_uniformpayments_payment_uniform UNIQUE (payment_id, uniform_id);
    END IF;

    -- payments row belongs to exactly one enrollment.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_student_classes') THEN
        ALTER TABLE payments
            ADD CONSTRAINT fk_payments_student_classes
            FOREIGN KEY (payment_id) REFERENCES student_classes(payment_id) ON DELETE CASCADE;
    END IF;

    -- transactions, bookspayments, uniformpayments all hang off the
    -- enrollment (student_classes), not off payments — see note above.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_student_classes') THEN
        ALTER TABLE transactions
            ADD CONSTRAINT fk_transactions_student_classes
            FOREIGN KEY (payment_id) REFERENCES student_classes(payment_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookspayments_student_classes') THEN
        ALTER TABLE bookspayments
            ADD CONSTRAINT fk_bookspayments_student_classes
            FOREIGN KEY (payment_id) REFERENCES student_classes(payment_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_uniformpayments_student_classes') THEN
        ALTER TABLE uniformpayments
            ADD CONSTRAINT fk_uniformpayments_student_classes
            FOREIGN KEY (payment_id) REFERENCES student_classes(payment_id) ON DELETE CASCADE;
    END IF;

    -- NOTE: bookspayments.book_id -> books(book_id) and
    -- uniformpayments.uniform_id -> uniforms(uniform_id) FKs are
    -- intentionally NOT added here because the books/uniforms/classes
    -- table DDL wasn't included in what you shared. See "Doubts" below.
END $$;

-- =====================================================================
-- 5. UPDATED_AT TRIGGERS
-- =====================================================================
DROP TRIGGER IF EXISTS set_updated_payments ON payments;
CREATE TRIGGER set_updated_payments
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_books ON bookspayments;
CREATE TRIGGER set_updated_books
    BEFORE UPDATE ON bookspayments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_uniform ON uniformpayments;
CREATE TRIGGER set_updated_uniform
    BEFORE UPDATE ON uniformpayments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 6. TUITION FUNCTIONS
-- =====================================================================

-- Upserts the payments row and recalculates pending/status from the
-- transactions ledger. p_class_id is now actually used as a sanity
-- check against the enrollment's real class (previously accepted but
-- silently ignored).
CREATE OR REPLACE FUNCTION fn_handle_tuition(
    p_payment_id UUID,
    p_class_id INT,
    p_new_concession NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_fee            NUMERIC(10,2);
    v_total_paid     NUMERIC(10,2);
    v_concession     NUMERIC(10,2);
    v_actual_class_id INT;
BEGIN
    -- Ensure payment row exists (atomic upsert)
    INSERT INTO payments (payment_id, concession, total_amount_paid, pending_amount, payment_status, created_at, updated_at)
    VALUES (p_payment_id, 0, 0, 0, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (payment_id) DO NOTHING;

    -- Sanity check: p_class_id should match the enrollment's class.
    SELECT class_id INTO v_actual_class_id
    FROM student_classes
    WHERE payment_id = p_payment_id;

    IF v_actual_class_id IS NULL THEN
        RAISE EXCEPTION 'No enrollment found for Payment ID %', p_payment_id;
    ELSIF v_actual_class_id <> p_class_id THEN
        RAISE EXCEPTION 'Class ID % does not match enrollment class % for Payment ID %',
            p_class_id, v_actual_class_id, p_payment_id;
    END IF;

    -- Apply concession safely
    IF p_new_concession > 0 THEN
        UPDATE payments
        SET concession = COALESCE(concession, 0) + p_new_concession,
            updated_at = CURRENT_TIMESTAMP
        WHERE payment_id = p_payment_id;
    END IF;

    -- Get fee
    SELECT COALESCE(MAX(c.fee_amount), 0)
    INTO v_fee
    FROM student_classes sc
    JOIN classes c ON c.class_id = sc.class_id
    WHERE sc.payment_id = p_payment_id;

    -- Get total tuition paid
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_total_paid
    FROM transactions
    WHERE payment_id = p_payment_id
      AND remarks = 'tuition';

    -- Get concession
    SELECT COALESCE(concession, 0)
    INTO v_concession
    FROM payments
    WHERE payment_id = p_payment_id;

    -- Final recalculation
    UPDATE payments
    SET
        total_amount_paid = v_total_paid,
        pending_amount = GREATEST(v_fee - v_concession - v_total_paid, 0),
        payment_status = CASE
            WHEN v_fee - v_concession - v_total_paid <= 0 THEN 'PAID'
            WHEN v_total_paid > 0 THEN 'PARTIAL'
            ELSE 'PENDING'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = p_payment_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION fn_reverse_tuition(
    p_payment_id UUID,
    p_reversed_concession NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_fee        NUMERIC(10,2);
    v_total_paid NUMERIC(10,2);
    v_concession NUMERIC(10,2);
BEGIN
    -- Reverse concession safely
    IF p_reversed_concession > 0 THEN
        UPDATE payments
        SET concession = GREATEST(COALESCE(concession, 0) - p_reversed_concession, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE payment_id = p_payment_id;
    END IF;

    -- Get class fee
    SELECT COALESCE(MAX(c.fee_amount), 0)
    INTO v_fee
    FROM student_classes sc
    JOIN classes c ON c.class_id = sc.class_id
    WHERE sc.payment_id = p_payment_id;

    -- Recalculate tuition paid from remaining transactions
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_total_paid
    FROM transactions
    WHERE payment_id = p_payment_id
      AND remarks = 'tuition';

    -- Current concession
    SELECT COALESCE(concession, 0)
    INTO v_concession
    FROM payments
    WHERE payment_id = p_payment_id;

    -- Recalculate payment
    UPDATE payments
    SET
        total_amount_paid = v_total_paid,
        pending_amount = GREATEST(v_fee - v_concession - v_total_paid, 0),
        payment_status = CASE
            WHEN v_fee - v_concession - v_total_paid <= 0 THEN 'PAID'
            WHEN v_total_paid > 0 THEN 'PARTIAL'
            ELSE 'PENDING'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = p_payment_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 7. BOOKS FUNCTIONS
-- =====================================================================

DROP FUNCTION IF EXISTS fn_handle_book_payment(UUID, UUID, INT, NUMERIC, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS fn_handle_book_payment(UUID, INT, NUMERIC, NUMERIC, BOOLEAN);

-- Adds/updates a payment towards a book for a given enrollment.
-- Rewritten to use a single atomic INSERT ... ON CONFLICT upsert
-- instead of "UPDATE, then INSERT if not found" — the old two-step
-- pattern had a race condition under concurrent calls for the same
-- (payment_id, book_id), since nothing enforced uniqueness and both
-- statements could independently think no row existed yet.
CREATE OR REPLACE FUNCTION fn_handle_book_payment(
    p_payment_id UUID,
    p_book_id INT,
    p_books_paid NUMERIC DEFAULT 0,
    p_books_discount NUMERIC DEFAULT 0,
    p_received BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
    v_amount    NUMERIC(10,2);
    v_book_type VARCHAR(50);
BEGIN
    SELECT book_amount, book_type
    INTO v_amount, v_book_type
    FROM books
    WHERE book_id = p_book_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book ID % not found', p_book_id;
    END IF;

    -- Ensure the parent payments row exists (mirrors fn_handle_tuition,
    -- since bookspayments now has an FK to payments).
    INSERT INTO payments (payment_id, concession, total_amount_paid, pending_amount, payment_status, created_at, updated_at)
    VALUES (p_payment_id, 0, 0, 0, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (payment_id) DO NOTHING;

    INSERT INTO bookspayments (
        payment_id, book_id, book_type, books_amount,
        books_paid, books_discount, books_pending_amount,
        books_payment_status, received, received_at,
        created_at, updated_at
    )
    VALUES (
        p_payment_id, p_book_id, v_book_type, v_amount,
        p_books_paid, p_books_discount,
        GREATEST(v_amount - p_books_paid - p_books_discount, 0),
        CASE WHEN v_amount - p_books_paid - p_books_discount <= 0 THEN 'PAID' ELSE 'PENDING' END,
        p_received,
        CASE WHEN p_received THEN CURRENT_TIMESTAMP ELSE NULL END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (payment_id, book_id) DO UPDATE
    SET
        books_paid = bookspayments.books_paid + EXCLUDED.books_paid,
        books_discount = bookspayments.books_discount + EXCLUDED.books_discount,
        books_pending_amount = GREATEST(
            bookspayments.books_amount
            - (bookspayments.books_paid + EXCLUDED.books_paid)
            - (bookspayments.books_discount + EXCLUDED.books_discount),
            0
        ),
        books_payment_status = CASE
            WHEN bookspayments.books_amount
                 - (bookspayments.books_paid + EXCLUDED.books_paid)
                 - (bookspayments.books_discount + EXCLUDED.books_discount) <= 0
            THEN 'PAID' ELSE 'PENDING'
        END,
        received = EXCLUDED.received,
        received_at = CASE
            WHEN EXCLUDED.received THEN CURRENT_TIMESTAMP
            ELSE bookspayments.received_at
        END,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;


-- Reverses (partially or fully) a payment/discount on a book.
-- received / received_at are NEVER touched here. Row is deleted once
-- books_paid reaches 0 (per original design).
DROP FUNCTION IF EXISTS fn_reverse_book_payment(UUID, INT, NUMERIC, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_reverse_book_payment(
    p_payment_id UUID,
    p_book_id INT,
    p_books_paid NUMERIC DEFAULT 0,
    p_books_discount NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_amount           NUMERIC(10,2);
    v_current_paid     NUMERIC(10,2);
    v_current_discount NUMERIC(10,2);
    v_new_paid         NUMERIC(10,2);
    v_new_discount     NUMERIC(10,2);
BEGIN
    SELECT book_amount INTO v_amount
    FROM books
    WHERE book_id = p_book_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book ID % not found', p_book_id;
    END IF;

    SELECT books_paid, books_discount
    INTO v_current_paid, v_current_discount
    FROM bookspayments
    WHERE payment_id = p_payment_id AND book_id = p_book_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book payment record not found for Payment ID % and Book ID %',
            p_payment_id, p_book_id;
    END IF;

    v_new_paid := GREATEST(COALESCE(v_current_paid, 0) - p_books_paid, 0);
    v_new_discount := GREATEST(COALESCE(v_current_discount, 0) - p_books_discount, 0);

    IF v_new_paid <= 0 THEN
        DELETE FROM bookspayments
        WHERE payment_id = p_payment_id AND book_id = p_book_id;
    ELSE
        UPDATE bookspayments
        SET
            books_paid = v_new_paid,
            books_discount = v_new_discount,
            books_pending_amount = GREATEST(v_amount - v_new_paid - v_new_discount, 0),
            books_payment_status = CASE
                WHEN v_amount - v_new_paid - v_new_discount <= 0 THEN 'PAID'
                ELSE 'PENDING'
            END,
            updated_at = CURRENT_TIMESTAMP
            -- received / received_at intentionally untouched
        WHERE payment_id = p_payment_id AND book_id = p_book_id;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Dedicated toggle for received/not received, independent of payment flow.
CREATE OR REPLACE FUNCTION fn_mark_book_received(
    p_payment_id UUID,
    p_book_id INT,
    p_received BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE bookspayments
    SET
        received = p_received,
        received_at = CASE WHEN p_received THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = p_payment_id AND book_id = p_book_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book payment record not found for Payment ID % and Book ID %',
            p_payment_id, p_book_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 8. UNIFORM FUNCTIONS (mirrors books, same fixes applied)
-- =====================================================================

DROP FUNCTION IF EXISTS fn_handle_uniform_payment(UUID, UUID, INT, NUMERIC, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS fn_handle_uniform_payment(UUID, INT, NUMERIC, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_handle_uniform_payment(
    p_payment_id UUID,
    p_uniform_id INT,
    p_uniform_paid NUMERIC DEFAULT 0,
    p_uniform_discount NUMERIC DEFAULT 0,
    p_received BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
    v_amount       NUMERIC(10,2);
    v_uniform_type VARCHAR(50);
BEGIN
    SELECT uniform_amount, uniform_type
    INTO v_amount, v_uniform_type
    FROM uniforms
    WHERE uniform_id = p_uniform_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Uniform ID % not found', p_uniform_id;
    END IF;

    INSERT INTO payments (payment_id, concession, total_amount_paid, pending_amount, payment_status, created_at, updated_at)
    VALUES (p_payment_id, 0, 0, 0, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (payment_id) DO NOTHING;

    INSERT INTO uniformpayments (
        payment_id, uniform_id, uniform_type, uniform_amount,
        uniform_paid, uniform_discount, uniform_pending_amount,
        uniform_payment_status, received, received_at,
        created_at, updated_at
    )
    VALUES (
        p_payment_id, p_uniform_id, v_uniform_type, v_amount,
        p_uniform_paid, p_uniform_discount,
        GREATEST(v_amount - p_uniform_paid - p_uniform_discount, 0),
        CASE WHEN v_amount - p_uniform_paid - p_uniform_discount <= 0 THEN 'PAID' ELSE 'PENDING' END,
        p_received,
        CASE WHEN p_received THEN CURRENT_TIMESTAMP ELSE NULL END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (payment_id, uniform_id) DO UPDATE
    SET
        uniform_paid = uniformpayments.uniform_paid + EXCLUDED.uniform_paid,
        uniform_discount = uniformpayments.uniform_discount + EXCLUDED.uniform_discount,
        uniform_pending_amount = GREATEST(
            uniformpayments.uniform_amount
            - (uniformpayments.uniform_paid + EXCLUDED.uniform_paid)
            - (uniformpayments.uniform_discount + EXCLUDED.uniform_discount),
            0
        ),
        uniform_payment_status = CASE
            WHEN uniformpayments.uniform_amount
                 - (uniformpayments.uniform_paid + EXCLUDED.uniform_paid)
                 - (uniformpayments.uniform_discount + EXCLUDED.uniform_discount) <= 0
            THEN 'PAID' ELSE 'PENDING'
        END,
        received = EXCLUDED.received,
        received_at = CASE
            WHEN EXCLUDED.received THEN CURRENT_TIMESTAMP
            ELSE uniformpayments.received_at
        END,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;


DROP FUNCTION IF EXISTS fn_reverse_uniform_payment(UUID, INT, NUMERIC, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION fn_reverse_uniform_payment(
    p_payment_id UUID,
    p_uniform_id INT,
    p_uniform_paid NUMERIC DEFAULT 0,
    p_uniform_discount NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
    v_amount           NUMERIC(10,2);
    v_current_paid     NUMERIC(10,2);
    v_current_discount NUMERIC(10,2);
    v_new_paid         NUMERIC(10,2);
    v_new_discount     NUMERIC(10,2);
BEGIN
    SELECT uniform_amount INTO v_amount
    FROM uniforms
    WHERE uniform_id = p_uniform_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Uniform ID % not found', p_uniform_id;
    END IF;

    SELECT uniform_paid, uniform_discount
    INTO v_current_paid, v_current_discount
    FROM uniformpayments
    WHERE payment_id = p_payment_id AND uniform_id = p_uniform_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Uniform payment record not found for Payment ID % and Uniform ID %',
            p_payment_id, p_uniform_id;
    END IF;

    v_new_paid := GREATEST(COALESCE(v_current_paid, 0) - p_uniform_paid, 0);
    v_new_discount := GREATEST(COALESCE(v_current_discount, 0) - p_uniform_discount, 0);

    IF v_new_paid <= 0 THEN
        DELETE FROM uniformpayments
        WHERE payment_id = p_payment_id AND uniform_id = p_uniform_id;
    ELSE
        UPDATE uniformpayments
        SET
            uniform_paid = v_new_paid,
            uniform_discount = v_new_discount,
            uniform_pending_amount = GREATEST(v_amount - v_new_paid - v_new_discount, 0),
            uniform_payment_status = CASE
                WHEN v_amount - v_new_paid - v_new_discount <= 0 THEN 'PAID'
                ELSE 'PENDING'
            END,
            updated_at = CURRENT_TIMESTAMP
            -- received / received_at intentionally untouched
        WHERE payment_id = p_payment_id AND uniform_id = p_uniform_id;
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION fn_mark_uniform_received(
    p_payment_id UUID,
    p_uniform_id INT,
    p_received BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE uniformpayments
    SET
        received = p_received,
        received_at = CASE WHEN p_received THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = p_payment_id AND uniform_id = p_uniform_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Uniform payment record not found for Payment ID % and Uniform ID %',
            p_payment_id, p_uniform_id;
    END IF;
END;
$$ LANGUAGE plpgsql;