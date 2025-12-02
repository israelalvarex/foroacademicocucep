const express = require('express');
const router = express.Router();

const forosRoutes = require('./foros');
const authRouter = require('./auth');
const usuariosRouter = require('./usuarios');
const categoriasRouter = require('./categorias');

// Ruta de prueba mejorada
router.get('/test', (req, res) => {
  console.log('✅ Test endpoint llamado');
  res.json({ 
    success: true,
    mensaje: "API funcionando",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth/login, /auth/register',
      foros: '/foros, /foros/recientes',
      usuarios: '/usuarios, /usuarios/activos',
      categorias: '/categorias'
    }
  });
});

// 🟢 MIDDLEWARE PARA DEBUG DE RUTAS
router.use((req, res, next) => {
  console.log(`🔄 [Routes Index] Ruta recibida: ${req.originalUrl}`);
  next();
});

// Rutas principales
router.use('/auth', authRouter);
router.use('/categorias', categoriasRouter);
router.use('/foros', forosRoutes);
router.use('/usuarios', usuariosRouter);

// Ruta 404 para API - CORREGIDA (sin asterisco)
router.use((req, res) => {
  console.log(`❌ Ruta API no encontrada: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    mensaje: 'Ruta API no encontrada',
    requested: req.originalUrl,
    available_routes: ['/auth', '/foros', '/usuarios', '/categorias']
  });
});

module.exports = router;