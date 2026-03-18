const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'convex_manager_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'convex_manager_secret',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres',
    logging: false,
  }
);

// User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING, // Stored as bcrypt hash
    allowNull: true, // Allow null for users who are invited but haven't set a password yet
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user', // 'admin' or 'user'
  }
});

// Verification Code Model (for registration and password resets)
const VerificationCode = sequelize.define('VerificationCode', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // 'registration' or 'reset'
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  }
});

// Invitation Model
const Invitation = sequelize.define('Invitation', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user',
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  }
});

// Project Configuration Model
const ProjectConfig = sequelize.define('ProjectConfig', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  backendPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  siteProxyPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dashboardPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  overrides: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  adminKey: {
    type: DataTypes.STRING, // Should ideally be encrypted before saving
    allowNull: true,
  }
});

async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync models with database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = {
  sequelize,
  User,
  VerificationCode,
  Invitation,
  ProjectConfig,
  initDB
};