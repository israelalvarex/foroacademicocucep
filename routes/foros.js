// routes/foros.js - VERSIÓN SIMPLIFICADA Y CORRECTA
const express = require('express');
const router = express.Router();
const forosController = require('../controllers/forosController');
const { verificarToken } = require('../middlewares/authMiddleware');

// ===============================
// RUTAS DE FOROS - ORDEN SIMPLIFICADO
// ===============================

// Middleware de debug
router.use((req, res, next) => {
  console.log(`📂 [Foros Route] Ruta: ${req.method} ${req.originalUrl}`);
  next();
});

// Rutas básicas
router.get('/', forosController.obtenerForos);
router.get('/recientes', forosController.obtenerForosRecientes);
router.get('/estadisticas', forosController.obtenerEstadisticas);
router.get('/categorias', forosController.obtenerCategorias);
router.get('/categoria/:id', forosController.obtenerCategoriaConForos);

// Rutas de foro individual
router.get('/foro/:id', forosController.obtenerForoPorId);
router.get('/:id', forosController.obtenerForoPorId);

// ===============================
// RUTAS DE MENSAJES - CRÍTICAS
// ===============================

// POST para CREAR mensaje - DEBE estar definida
router.post('/:id/mensaje', verificarToken, forosController.crearMensaje);

// GET para OBTENER mensajes
router.get('/:id/mensajes', verificarToken, forosController.obtenerMensajes);

// Rutas alternativas por compatibilidad
router.post('/foro/:id/mensaje', verificarToken, forosController.crearMensaje);
router.get('/foro/:id/mensajes', verificarToken, forosController.obtenerMensajes);

// ===============================
// RUTAS ADICIONALES
// ===============================
router.post('/', verificarToken, forosController.crearForo);
router.post('/foro', verificarToken, forosController.crearForo);
router.put('/:id', verificarToken, forosController.actualizarForo);

// Test endpoint
router.get('/test-auth', verificarToken, (req, res) => {
  res.json({ success: true, message: 'Autenticado', user: req.user });
});

// Debug endpoint
router.get('/debug/rutas', (req, res) => {
  const rutas = [];
  router.stack.forEach((layer) => {
    if (layer.route) {
      rutas.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      });
    }
  });
  res.json({ rutas });
});

module.exports = router;