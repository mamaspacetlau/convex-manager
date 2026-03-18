const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'convex_manager_db',
  'postgres',
  'convex_manager_secret',
  {
    host: 'localhost',
    port: 5433,
    dialect: 'postgres',
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
})();