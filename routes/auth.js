const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const registerController = require('../controllers/registerController');

console.log('📦 Cargando rutas de autenticación...');

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

// LOGIN
router.post('/login', authController.login);

// REGISTRO - ¡ESTA ES LA QUE FALTABA!
router.post('/register', registerController.register);

// ACTUALIZAR CONTRASEÑA (temporal para desarrollo)
router.post('/update-password', registerController.actualizarPassword);

// VERIFICAR SI EMAIL EXISTE
router.get('/check-email/:email', registerController.checkUserExists);

// RUTA DE PRUEBA
router.get('/test-login', (req, res) => {
  res.json({ 
    mensaje: "Endpoint de autenticación funcionando",
    rutas_disponibles: {
      login: "POST /api/auth/login",
      register: "POST /api/auth/register",  // ← Ahora aparece aquí
      check_email: "GET /api/auth/check-email/:email"
    },
    instrucciones_login: "Para hacer login, envía una petición POST a /api/auth/login con:",
    ejemplo_login: {
      correo: "usuario@ejemplo.com",
      contrasena: "tu_contraseña"
    },
    instrucciones_register: "Para registrarte, envía una petición POST a /api/auth/register con:",
    ejemplo_register: {
      nombre: "Nombre",
      apellido: "Apellido (opcional)",
      email: "usuario@cucep.edu.mx",
      password: "contraseña_segura"
    },
    nota: "Esta ruta GET es solo para pruebas."
  });
});

console.log('✅ Rutas de autenticación cargadas:');
console.log('   - POST /api/auth/login');
console.log('   - POST /api/auth/register');
console.log('   - GET  /api/auth/test-login');

module.exports = router;
