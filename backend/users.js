const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('./db');

// We are migrating away from JSON file storage to PostgreSQL
// The initUsers() logic is no longer needed as the database handles schema creation

async function getUsers() {
  return await User.findAll();
}

async function findUserByUsername(username) {
  return await User.findOne({ where: { username } });
}

async function findUserByEmail(email) {
  return await User.findOne({ where: { email } });
}

async function findUserByIdentifier(identifier) {
  return await User.findOne({ 
    where: { 
      [Op.or]: [
        { username: identifier },
        { email: identifier }
      ]
    } 
  });
}

async function findUserById(id) {
  return await User.findByPk(id);
}

async function hasAnyUsers() {
  const count = await User.count();
  return count > 0;
}

async function createUser(username, email, password, role = 'user') {
  const existingUsername = await findUserByUsername(username);
  if (existingUsername) {
    throw new Error('Username already exists');
  }

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    throw new Error('Email already exists');
  }
  
  // First user is always admin
  const userCount = await User.count();
  if (userCount === 0) {
    role = 'admin';
  }

  // If password is provided, hash it. Otherwise, it's null (e.g. for invited users)
  const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
  const newUser = await User.create({
    username,
    email,
    password: hashedPassword,
    role
  });
  
  return { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role };
}

module.exports = {
  getUsers,
  findUserByUsername,
  findUserByEmail,
  findUserByIdentifier,
  findUserById,
  createUser,
  hasAnyUsers
};