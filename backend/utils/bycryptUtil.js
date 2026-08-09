const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const saltRounds = 10;
  console.log('🔐 [bcryptUtil] Hashing password:', password);
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('✅ [bcryptUtil] Generated hash:', hash);
  return hash;
};

const comparePassword = async (plainPassword, hashedPassword) => {
  console.log('🔍 [bcryptUtil] Comparing password...');
  console.log('📝 [bcryptUtil] Plain password:', plainPassword);
  console.log('🧪 [bcryptUtil] Hashed password:', hashedPassword);
  const result = await bcrypt.compare(plainPassword, hashedPassword);
  console.log('📊 [bcryptUtil] Comparison result:', result);
  return result;
};

module.exports = { hashPassword, comparePassword };
