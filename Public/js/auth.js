const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const registerController = require('../controllers/registerController');

// RUTAS DE AUTENTICACIÓN
router.post('/login', authController.login);
router.post('/register', registerController.register); // ← ¡NUEVA RUTA!

// RUTA TEMPORAL SOLO PARA DESARROLLO
router.post('/update-password', registerController.actualizarPassword);

// Verificar si usuario existe
router.get('/check-email/:email', registerController.checkUserExists);

// Ruta GET temporal de prueba
router.get('/test-login', (req, res) => {
  res.json({ 
    mensaje: "Endpoint de autenticación funcionando",
    rutas_disponibles: {
      login: "POST /api/auth/login",
      register: "POST /api/auth/register",
      check_email: "GET /api/auth/check-email/:email"
    },
    instrucciones_login: "Para hacer login, envía una petición POST a /api/auth/login con:",
    ejemplo_login_body: {
      correo: "usuario@ejemplo.com",
      contrasena: "tu_contraseña"
    },
    instrucciones_register: "Para registrar, envía una petición POST a /api/auth/register con:",
    ejemplo_register_body: {
      nombre: "Nombre del usuario",
      apellido: "Apellido (opcional)",
      email: "usuario@ejemplo.com",
      password: "contraseña",
      tipo_usuario: "estudiante" // opcional, por defecto 'estudiante'
    }
  });
});

module.exports = router;