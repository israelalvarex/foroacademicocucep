const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

pool.connect()
  .then(() => console.log('Conectado a la base de datos foro_academico'))
  .catch(err => console.error(' Error de conexión a la base de datos', err));

module.exports = pool;
