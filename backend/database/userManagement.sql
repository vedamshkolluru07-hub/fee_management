-- ================= ENABLE UUID =================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================= USERS =================
CREATE TABLE IF NOT EXISTS Users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user', 'moderator')),
  email VARCHAR(255),
  phone VARCHAR(15) UNIQUE NOT NULL,
  can_manage_users BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES Users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON Users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON Users(is_approved, deleted);

-- ================= APP SETTINGS =================
CREATE TABLE IF NOT EXISTS AppSettings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT
);

-- ================= PASSWORD RESET TOKENS (UPDATED) =================
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL, -- stores SHA-256 hashed token
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON PasswordResetTokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON PasswordResetTokens(token);

-- ================= OTP =================
CREATE TABLE IF NOT EXISTS OTPRequests (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(user_id),
  otp VARCHAR(10) NOT NULL,
  method VARCHAR(10) CHECK (method IN ('email', 'phone')),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_user ON OTPRequests(user_id);

-- ================= AUDIT LOGS =================
CREATE TABLE IF NOT EXISTS AuditLogs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES Users(user_id),
  action VARCHAR(50) NOT NULL,
  role_at_time VARCHAR(20),
  category VARCHAR(10) CHECK (category IN ('create' , 'update', 'delete')),
  log_message TEXT,
  target_user_id UUID REFERENCES Users(user_id),
  target_entity_type VARCHAR(20) CHECK (target_entity_type IN ('user','student','payment','academic','calendar','notification','session','other')),
  changes JSONB,
  success BOOLEAN DEFAULT TRUE,
  severity VARCHAR(10) DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON AuditLogs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON AuditLogs(target_user_id);

-- ================= NOTIFICATIONS =================
CREATE TABLE IF NOT EXISTS Notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(user_id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);

-- ================= LOGIN ATTEMPTS =================
CREATE TABLE IF NOT EXISTS LoginAttempts (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(user_id),
  user_agent TEXT,
  device_info JSONB,
  ip_address VARCHAR(50),
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_login_user ON LoginAttempts(user_id);

-- ================= DEVICE SESSIONS =================
CREATE TABLE IF NOT EXISTS DeviceSessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES Users(user_id),
  session_date DATE NOT NULL,
  activity_periods JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON DeviceSessions(user_id);

-- ================= SESSIONS =================
CREATE TABLE IF NOT EXISTS Sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);