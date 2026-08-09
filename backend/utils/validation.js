// utils/validation.js

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePhone = (phone) => {
  const regex = /^\+?[1-9]\d{7,14}$/; // supports international format
  return regex.test(phone);
};

const validatePasswordStrength = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePasswordStrength,
};
