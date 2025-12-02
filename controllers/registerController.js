const pool = require('../config/bd');
const bcrypt = require('bcryptjs');

// REGISTRO DE USUARIO
exports.register = async (req, res) => {
  console.log('📝 Inicio de registro');
  console.log('📦 Body recibido:', req.body);
  
  const { nombre, apellido, email, password, tipo_usuario } = req.body;

  // Validaciones
  if (!nombre || !email || !password) {
    console.log('❌ Faltan datos requeridos');
    return res.status(400).json({ 
      mensaje: 'Nombre, email y contraseña son requeridos' 
    });
  }

  // Validar email institucional
  if (!email.endsWith('@cucep.edu.mx')) {
    console.log('❌ Email no es @cucep.edu.mx');
    return res.status(400).json({ 
      mensaje: 'El email debe ser del dominio @cucep.edu.mx' 
    });
  }

  // Validar longitud de contraseña
  if (password.length < 6) {
    return res.status(400).json({ 
      mensaje: 'La contraseña debe tener al menos 6 caracteres' 
    });
  }

  try {
    // Verificar si el usuario ya existe
    console.log(`🔍 Verificando si usuario existe: ${email}`);
    const userCheck = await pool.query(
      'SELECT id FROM usuario WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      console.log(`❌ Usuario ya existe: ${email}`);
      return res.status(409).json({ 
        mensaje: 'El email ya está registrado' 
      });
    }

    // Generar hash de contraseña
    console.log('🔐 Generando hash de contraseña...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✅ Hash generado');

    // Determinar tipo de usuario (estudiante por defecto)
    const userType = tipo_usuario || 'estudiante';

    // Determinar rol_id según tipo de usuario
    // 1 = Estudiante, 2 = Profesor, 3 = Administrador
    const rolId = userType === 'administrador' ? 3 : 
                  userType === 'profesor' ? 2 : 1;

    // ⭐ GENERAR MATRÍCULA AUTOMÁTICAMENTE PARA ESTUDIANTES
    let matricula = null;
    let cedula_profesional = null;
    
    if (userType === 'estudiante') {
      // Obtener el último número de matrícula usado
      const lastMatricula = await pool.query(
        `SELECT matricula FROM usuario 
         WHERE tipo_usuario = 'estudiante' 
         AND matricula IS NOT NULL 
         ORDER BY id DESC LIMIT 1`
      );
      
      let numeroMatricula = 1;
      if (lastMatricula.rows.length > 0 && lastMatricula.rows[0].matricula) {
        // Extraer número de la última matrícula (formato: EST2024001)
        const match = lastMatricula.rows[0].matricula.match(/\d+$/);
        if (match) {
          numeroMatricula = parseInt(match[0]) + 1;
        }
      }
      
      // Generar matrícula: EST + año + número secuencial
      const year = new Date().getFullYear();
      const numeroFormateado = numeroMatricula.toString().padStart(3, '0');
      matricula = `EST${year}${numeroFormateado}`;
      
      console.log('📋 Matrícula generada automáticamente:', matricula);
    }

    console.log('📝 Insertando nuevo usuario...');
    console.log('Datos a insertar:', {
      nombre,
      apellido_paterno: apellido || '',
      email,
      tipo_usuario: userType,
      rol_id: rolId,
      matricula: matricula,
      cedula_profesional: cedula_profesional
    });

    // Insertar usuario con todos los campos necesarios
    const result = await pool.query(
      `INSERT INTO usuario (
        nombre, 
        apellido_paterno, 
        email, 
        password_hash, 
        tipo_usuario,
        rol_id,
        matricula,
        cedula_profesional
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, nombre, apellido_paterno, email, tipo_usuario, estado_cuenta, estado_validacion, matricula`,
      [
        nombre,
        apellido || '',
        email,
        passwordHash,
        userType,
        rolId,
        matricula,
        cedula_profesional
      ]
    );

    const newUser = result.rows[0];
    
    console.log('✅ Usuario creado exitosamente:', newUser);
    
    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
        tipo: newUser.tipo_usuario,
        matricula: newUser.matricula,
        estado_validacion: newUser.estado_validacion
      }
    });

  } catch (error) {
    console.error('❌ ERROR EN REGISTRO:', error);
    console.error('Código de error:', error.code);
    console.error('Detalle:', error.detail);
    console.error('Constraint:', error.constraint);
    console.error('Stack:', error.stack);
    
    // Manejar errores específicos
    let mensajeError = 'Error al registrar usuario';
    
    if (error.code === '23505') {
      // Unique violation
      if (error.constraint === 'uq_usuario_email') {
        mensajeError = 'El email ya está registrado';
      } else if (error.constraint === 'uq_usuario_matricula') {
        mensajeError = 'La matrícula ya está registrada';
      } else {
        mensajeError = 'El email ya está registrado';
      }
    } else if (error.code === '23502') {
      // NOT NULL violation
      mensajeError = 'Faltan campos obligatorios en la base de datos';
    } else if (error.code === '23514') {
      // Check constraint violation
      if (error.constraint === 'ck_usuario_email_formato') {
        mensajeError = 'El formato del email no es válido. Debe ser @cucep.edu.mx';
      } else if (error.constraint === 'ck_usuario_estudiante_matricula') {
        mensajeError = 'Los estudiantes requieren matrícula';
      } else if (error.constraint === 'ck_usuario_profesor_cedula') {
        mensajeError = 'Los profesores requieren cédula profesional';
      } else {
        mensajeError = `Error de validación: ${error.constraint}`;
      }
    }
    
    res.status(500).json({ 
      mensaje: mensajeError,
      detalle: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verificar si usuario existe
exports.checkUserExists = async (req, res) => {
  const { email } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, email, nombre FROM usuario WHERE email = $1',
      [email]
    );
    
    res.json({
      existe: result.rows.length > 0,
      usuario: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ mensaje: 'Error al verificar usuario' });
  }
};

// Actualizar contraseña
exports.actualizarPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Email y password son requeridos' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    
    const result = await pool.query(
      'UPDATE usuario SET password_hash = $1 WHERE email = $2 RETURNING email',
      [hash, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ 
      mensaje: 'Contraseña actualizada exitosamente',
      email: result.rows[0].email
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ mensaje: 'Error al actualizar contraseña' });
  }
};