-- ================= ENABLE EXTENSION =================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ================= FULL NAME SEARCH TRIGGER =================
CREATE OR REPLACE FUNCTION update_student_name_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_vector :=
    to_tsvector('simple',
      COALESCE(NEW.student_name, '') || ' ' ||
      COALESCE(NEW.sur_name, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================= STUDENTS =================
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,

    student_name VARCHAR(255) NOT NULL,
    sur_name VARCHAR(255) NOT NULL,

    name_vector tsvector,

    dob DATE,

    gender VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),

    section CHAR(1) NOT NULL CHECK (section IN ('A','B')),

    email_id VARCHAR(255),

    admission_date DATE,

    is_connected BOOLEAN DEFAULT FALSE,

    status VARCHAR(10) CHECK (status IN ('Active','Inactive','Graduated'))
);

-- Drop trigger if exists (important for re-runs)
DROP TRIGGER IF EXISTS trg_student_name_vector ON students;

CREATE TRIGGER trg_student_name_vector
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_student_name_vector();


-- ================= PARENTS =================
CREATE TABLE IF NOT EXISTS parents (
    parents_id UUID PRIMARY KEY DEFAULT gen_random_uuid() UNIQUE,

    contact_number VARCHAR(15) UNIQUE NOT NULL
        CHECK (length(contact_number) >= 10),

    fathers_first_name VARCHAR(255) NOT NULL,
    fathers_sur_name VARCHAR(255) NOT NULL,

    mothers_first_name VARCHAR(255),
    mothers_sur_name VARCHAR(255),

    secondary_contact_number VARCHAR(15),

    email VARCHAR(255) UNIQUE,

    address TEXT,

    occupation VARCHAR(100),

    is_connected BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_parents_contact
ON parents(contact_number);


-- ================= PARENT-STUDENT RELATION =================
CREATE TABLE IF NOT EXISTS parentstudents (
    parents_id UUID,
    student_id VARCHAR(20),

    relationship VARCHAR(10)
        CHECK (relationship IN ('Father','Mother','Guardian')),

    PRIMARY KEY (parents_id, student_id),

    CONSTRAINT fk_parentstudents_parent
        FOREIGN KEY (parents_id)
        REFERENCES parents(parents_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_parentstudents_student
        FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parentstudents_student
ON parentstudents(student_id);

CREATE INDEX IF NOT EXISTS idx_parentstudents_parent
ON parentstudents(parents_id);