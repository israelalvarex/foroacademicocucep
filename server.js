const express = require('express');
const app = express();
const rutas = require('./routes/index.js');
const path = require('path');

// Silenciar dotenv
process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ silent: true });

app.use(express.json());

// Servir archivos estáticos CORRECTAMENTE
app.use(express.static('public'));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`📦 ${req.method} ${req.url}`);
  next();
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.use('/api', rutas);

// 👇 RUTAS ESPECÍFICAS PARA CADA PÁGINA HTML
const pages = [
  'login',
  'registro', 
  'inicio',
  'foro',
  'canal',
  'categoria_foro',
  'publicacion_de_foro',
  'dashboard_admin',
  'gestion_usuarios_admin',
  'gestion_canales_admin',
  'gestion_publicaciones_admin',
  'config_sistema_admin'
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
  console.log(`✅ Ruta registrada: /${page}`);
});

// Para cualquier otra ruta, servir index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`
  ====================================
  🚀 SERVIDOR INICIADO
  📍 http://localhost:${PORT}
  📂 Archivos: ./public/
  ====================================
  `);
});