CREATE OR REPLACE FUNCTION fn_reverse_tuition(
    p_payment_id UUID,
    p_reversed_concession NUMERIC DEFAULT 0
)
RETURNS VOID AS
$$
DECLARE
    v_fee NUMERIC(10,2);
    v_total_paid NUMERIC(10,2);
    v_concession NUMERIC(10,2);
BEGIN

    -- Reverse concession safely
    IF p_reversed_concession > 0 THEN
        UPDATE payments
        SET concession = GREATEST(
                COALESCE(concession,0) - p_reversed_concession,
                0
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE payment_id = p_payment_id;
    END IF;

    -- Get class fee
    SELECT COALESCE(MAX(c.fee_amount),0)
    INTO v_fee
    FROM student_classes sc
    JOIN classes c
        ON c.class_id = sc.class_id
    WHERE sc.payment_id = p_payment_id;

    -- Recalculate tuition paid from remaining transactions
    SELECT COALESCE(SUM(amount_paid),0)
    INTO v_total_paid
    FROM transactions
    WHERE payment_id = p_payment_id
      AND remarks = 'tuition';

    -- Current concession
    SELECT COALESCE(concession,0)
    INTO v_concession
    FROM payments
    WHERE payment_id = p_payment_id;

    -- Recalculate payment
    UPDATE payments
    SET
        total_amount_paid = v_total_paid,
        pending_amount = GREATEST(
            v_fee - v_concession - v_total_paid,
            0
        ),
        payment_status = CASE
            WHEN v_fee - v_concession - v_total_paid <= 0 THEN 'PAID'
            WHEN v_total_paid > 0 THEN 'PARTIAL'
            ELSE 'PENDING'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = p_payment_id;

END;
$$ LANGUAGE plpgsql;