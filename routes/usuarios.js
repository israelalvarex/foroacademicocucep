const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, soloAdmin } = require('../middlewares/authMiddleware');

// 🟢 PRIMERO verificar que el controlador tenga el método
if (!usuarioController.obtenerUsuariosActivos) {
  console.error('❌ ERROR: usuarioController.obtenerUsuariosActivos no está definido');
  // Crear un método dummy temporal para evitar el crash
  usuarioController.obtenerUsuariosActivos = async (req, res) => {
    console.log('⚠️ Método temporal obtenerUsuariosActivos ejecutado');
    res.json({
      success: true,
      mensaje: 'Método temporal - actualice el controlador',
      usuarios: [],
      total: 0
    });
  };
}

// ===============================
//     RUTAS ESPECÍFICAS PRIMERO
// ===============================

// 🟢 NUEVO: Obtener usuarios activos
router.get('/activos', verificarToken, soloAdmin, usuarioController.obtenerUsuariosActivos);

// Obtener profesores pendientes (solo admin)
router.get('/profesores/pendientes', verificarToken, soloAdmin, usuarioController.obtenerProfesoresPendientes);

// Obtener usuarios por tipo (solo admin)
router.get('/tipo/:tipo', verificarToken, soloAdmin, usuarioController.obtenerUsuariosPorTipo);

// ===============================
//     RUTAS GENERALES
// ===============================

// Obtener todos los usuarios (solo admin)
router.get('/', verificarToken, soloAdmin, usuarioController.obtenerUsuarios);

// Obtener un usuario por ID (admin o el mismo usuario)
router.get('/:id', verificarToken, usuarioController.obtenerUsuarioPorId);

// Crear un nuevo usuario (solo admin)
router.post('/', verificarToken, soloAdmin, usuarioController.crearUsuario);

// Actualizar contraseña (propietario o admin)
router.put('/:id/password', verificarToken, usuarioController.actualizarPassword);

// Actualizar un usuario (admin o dueño)
router.put('/:id', verificarToken, usuarioController.actualizarUsuario);

// Eliminar usuario (solo admin)
router.delete('/:id', verificarToken, soloAdmin, usuarioController.eliminarUsuario);

module.exports = router;