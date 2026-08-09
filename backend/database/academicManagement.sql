-- ================= ENABLE EXTENSION =================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ================= UPDATED_AT TRIGGER FUNCTION =================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



-- ================= ACADEMIC YEARS =================
CREATE TABLE IF NOT EXISTS academic_years (
  academic_year_id SERIAL PRIMARY KEY,

  year_label VARCHAR(20) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,

  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  is_current_year BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_academic_year_dates
    CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_current_year
ON academic_years (is_current_year)
WHERE is_current_year = TRUE;

DROP TRIGGER IF EXISTS trg_academic_years_updated_at ON academic_years;

CREATE TRIGGER trg_academic_years_updated_at
BEFORE UPDATE ON academic_years
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();



-- ================= CLASSES =================
CREATE TABLE IF NOT EXISTS classes (
  class_id SERIAL PRIMARY KEY,
  academic_year_id INT NOT NULL,

  class_name VARCHAR(50) NOT NULL,
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  is_connected BOOLEAN NOT NULL DEFAULT TRUE,
  is_finance_connected BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_classes_academic_year
    FOREIGN KEY (academic_year_id)
    REFERENCES academic_years(academic_year_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_class_fee_non_negative
    CHECK (fee_amount >= 0),

  CONSTRAINT uq_class_per_year
    UNIQUE (academic_year_id, class_name)
);

CREATE INDEX IF NOT EXISTS idx_classes_academic_year
ON classes(academic_year_id);

DROP TRIGGER IF EXISTS trg_classes_updated_at ON classes;

CREATE TRIGGER trg_classes_updated_at
BEFORE UPDATE ON classes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();



-- ================= BOOKS =================
CREATE TABLE IF NOT EXISTS books (
  book_id SERIAL PRIMARY KEY,
  class_id INT NOT NULL,

  book_type VARCHAR(50) NOT NULL,
  book_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  is_connected BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_books_class
    FOREIGN KEY (class_id)
    REFERENCES classes(class_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_book_amount_non_negative
    CHECK (book_amount >= 0),

  CONSTRAINT uq_book_per_class
    UNIQUE (class_id, book_type)
);

CREATE INDEX IF NOT EXISTS idx_books_class_id
ON books(class_id);

DROP TRIGGER IF EXISTS trg_books_updated_at ON books;

CREATE TRIGGER trg_books_updated_at
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();



-- ================= UNIFORMS =================
CREATE TABLE IF NOT EXISTS uniforms (
  uniform_id SERIAL PRIMARY KEY,
  academic_year_id INT NOT NULL,

  gender VARCHAR(10) NOT NULL
    CHECK (gender IN ('Male', 'Female')),

  uniform_type VARCHAR(50) NOT NULL,
  sizes VARCHAR(20),

  uniform_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  is_connected BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_uniforms_academic_year
    FOREIGN KEY (academic_year_id)
    REFERENCES academic_years(academic_year_id)
    ON DELETE CASCADE,

  CONSTRAINT chk_uniform_amount_non_negative
    CHECK (uniform_amount >= 0),

  CONSTRAINT uq_uniform_definition
    UNIQUE (academic_year_id, gender, uniform_type, sizes)
);

CREATE INDEX IF NOT EXISTS idx_uniforms_search
ON uniforms(academic_year_id, gender, uniform_type);

DROP TRIGGER IF EXISTS trg_uniforms_updated_at ON uniforms;

CREATE TRIGGER trg_uniforms_updated_at
BEFORE UPDATE ON uniforms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();