const pool = require('../config/bd');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Login de usuario
exports.login = async (req, res) => {
  console.log(' Inicio de login');
  console.log(' Body recibido:', req.body);
  
  const { correo, contrasena } = req.body;

  // Validar que lleguen los datos
  if (!correo || !contrasena) {
    console.log(' Faltan datos en la petición');
    return res.status(400).json({ mensaje: 'Correo y contraseña son requeridos' });
  }

  try {
    console.log(' Buscando usuario con email:', correo);
    
    const result = await pool.query(
      'SELECT id, nombre, apellido_paterno, email, password_hash, tipo_usuario, rol_id, estado_cuenta FROM usuario WHERE email = $1',
      [correo]
    );

    console.log(' Resultados encontrados:', result.rows.length);

    if (result.rows.length === 0) {
      console.log(' Usuario no encontrado');
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];
    console.log(' Usuario encontrado:', {
      id: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo_usuario,
      estado: usuario.estado_cuenta
    });

    // Verificar que la cuenta esté activa
    if (usuario.estado_cuenta !== 'activo') {
      console.log('Cuenta no está activa:', usuario.estado_cuenta);
      return res.status(403).json({ mensaje: 'Cuenta inactiva o suspendida' });
    }

    console.log('Verificando contraseña...');
    const passwordValida = await bcrypt.compare(contrasena, usuario.password_hash);
    console.log('Contraseña válida:', passwordValida);
    
    if (!passwordValida) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    console.log(' Generando token JWT...');
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        tipo_usuario: usuario.tipo_usuario,
        rol_id: usuario.rol_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Aumentado a 24 horas
    );

    console.log(' Login exitoso');
    res.json({ 
      mensaje: 'Login exitoso', 
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        rol_id: usuario.rol_id
      }
    });
    
  } catch (error) {
    console.error(' ERROR COMPLETO:', error);
    res.status(500).json({ 
      mensaje: 'Error interno del servidor', 
      error: error.message
    });
  }
};

// Logout de usuario (opcional, para invalidar tokens si usas blacklist)
exports.logout = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ mensaje: 'Token no proporcionado' });
    }
    
    // Aquí podrías agregar el token a una blacklist si quisieras invalidarlo
    // Por ahora solo confirmamos que el logout fue solicitado
    console.log(' Usuario solicitó logout. Token:', token.substring(0, 20) + '...');
    
    res.json({ 
      mensaje: 'Logout exitoso',
      detalle: 'Token será invalidado al expirar'
    });
    
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ mensaje: 'Error en logout', error: error.message });
  }
};

// Verificar token (para validar sesión activa)
exports.verificarToken = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        valido: false, 
        mensaje: 'Token no proporcionado' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar si el usuario aún existe en la base de datos
    const usuario = await pool.query(
      'SELECT id, nombre, apellido_paterno, email, tipo_usuario, rol_id, estado_cuenta FROM usuario WHERE id = $1',
      [decoded.id]
    );
    
    if (usuario.rows.length === 0) {
      return res.status(404).json({ 
        valido: false, 
        mensaje: 'Usuario no encontrado' 
      });
    }
    
    // Verificar que la cuenta esté activa
    if (usuario.rows[0].estado_cuenta !== 'activo') {
      return res.status(403).json({ 
        valido: false, 
        mensaje: 'Cuenta inactiva' 
      });
    }
    
    // Calcular tiempo restante del token
    const tiempoRestante = decoded.exp - Math.floor(Date.now() / 1000);
    const minutosRestantes = Math.floor(tiempoRestante / 60);
    
    res.json({
      valido: true,
      usuario: {
        id: usuario.rows[0].id,
        nombre: usuario.rows[0].nombre,
        apellido_paterno: usuario.rows[0].apellido_paterno,
        email: usuario.rows[0].email,
        tipo_usuario: usuario.rows[0].tipo_usuario,
        rol_id: usuario.rows[0].rol_id
      },
      token_info: {
        expira_en: new Date(decoded.exp * 1000),
        minutos_restantes: minutosRestantes,
        expira_soon: minutosRestantes < 30 // Avisar si falta menos de 30 min
      }
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        valido: false, 
        mensaje: 'Token expirado',
        error: 'TokenExpiredError'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        valido: false, 
        mensaje: 'Token inválido',
        error: 'JsonWebTokenError'
      });
    }
    
    console.error('Error verificando token:', error);
    res.status(500).json({ 
      valido: false, 
      mensaje: 'Error verificando token', 
      error: error.message 
    });
  }
};

// Obtener información del usuario actual
exports.getUsuarioActual = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }
    
    const usuario = await pool.query(
      'SELECT id, nombre, apellido_paterno, email, tipo_usuario, rol_id, fecha_registro, estado_cuenta FROM usuario WHERE id = $1',
      [req.user.id]
    );
    
    if (usuario.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    
    res.json(usuario.rows[0]);
    
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ mensaje: 'Error obteniendo usuario', error: error.message });
  }
}
  