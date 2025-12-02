// controllers/usuarioController.js COMPLETO
const pool = require('../config/bd');
const bcrypt = require('bcryptjs');

// ===================================================
// 1. OBTENER USUARIOS ACTIVOS (NUEVO MÉTODO)
// ===================================================
exports.obtenerUsuariosActivos = async (req, res) => {
  try {
    console.log('👥 [obtenerUsuariosActivos] Obteniendo usuarios activos...');
    
    const result = await pool.query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        email, 
        tipo_usuario, 
        estado_cuenta, 
        estado_validacion,
        rol_id,
        fecha_creacion, 
        ultima_conexion,
        avatar_url, 
        telefono,
        matricula,
        cedula_profesional
      FROM usuario 
      WHERE estado_cuenta = 'activo'
      ORDER BY ultima_conexion DESC NULLS LAST, fecha_creacion DESC
      LIMIT 50
    `);

    console.log(`✅ [obtenerUsuariosActivos] ${result.rows.length} usuarios activos encontrados`);
    
    res.json({
      success: true,
      mensaje: 'Usuarios activos obtenidos exitosamente',
      total: result.rows.length,
      usuarios: result.rows
    });
  } catch (error) {
    console.error('❌ [obtenerUsuariosActivos] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al obtener usuarios activos', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 2. OBTENER TODOS LOS USUARIOS
// ===================================================
exports.obtenerUsuarios = async (req, res) => {
  try {
    console.log('📋 [obtenerUsuarios] Obteniendo todos los usuarios...');
    
    const result = await pool.query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        email, 
        tipo_usuario, 
        matricula, 
        cedula_profesional, 
        telefono,
        estado_validacion, 
        estado_cuenta, 
        avatar_url,
        rol_id,
        fecha_creacion, 
        ultima_conexion,
        validado_por,
        fecha_validacion
      FROM usuario 
      ORDER BY fecha_creacion DESC
    `);

    console.log(`✅ [obtenerUsuarios] ${result.rows.length} usuarios encontrados`);
    
    res.json({
      success: true,
      mensaje: 'Usuarios obtenidos exitosamente',
      total: result.rows.length,
      usuarios: result.rows
    });
  } catch (error) {
    console.error('❌ [obtenerUsuarios] Error al obtener usuarios:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al obtener usuarios', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 3. OBTENER USUARIO POR ID
// ===================================================
exports.obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  console.log(`📋 [obtenerUsuarioPorId] Obteniendo usuario ID: ${id}`);

  try {
    // Validar que el ID sea un número
    const usuarioId = parseInt(id);
    
    if (isNaN(usuarioId) || usuarioId <= 0) {
      console.log(`❌ [obtenerUsuarioPorId] ID inválido: ${id}`);
      return res.status(400).json({ 
        success: false,
        mensaje: 'ID de usuario inválido. Debe ser un número positivo',
        error_code: 'INVALID_ID_FORMAT'
      });
    }

    const result = await pool.query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        email, 
        tipo_usuario, 
        matricula, 
        cedula_profesional, 
        telefono,
        estado_validacion, 
        estado_cuenta, 
        avatar_url, 
        rol_id,
        fecha_creacion, 
        fecha_actualizacion, 
        ultima_conexion,
        validado_por,
        fecha_validacion,
        comentario_validacion
      FROM usuario 
      WHERE id = $1
    `, [usuarioId]);

    if (result.rows.length === 0) {
      console.log(`❌ [obtenerUsuarioPorId] Usuario ${usuarioId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        mensaje: 'Usuario no encontrado',
        error_code: 'USER_NOT_FOUND'
      });
    }

    console.log(`✅ [obtenerUsuarioPorId] Usuario encontrado: ${result.rows[0].nombre}`);
    
    // Omitir password_hash por seguridad
    const usuario = result.rows[0];
    delete usuario.password_hash;
    
    res.json({
      success: true,
      mensaje: 'Usuario encontrado',
      usuario: usuario
    });
  } catch (error) {
    console.error('❌ [obtenerUsuarioPorId] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al obtener usuario', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 4. CREAR NUEVO USUARIO
// ===================================================
exports.crearUsuario = async (req, res) => {
  console.log('📋 [crearUsuario] Creando nuevo usuario...');
  console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));
  
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    email,
    password,
    tipo_usuario,
    matricula,
    cedula_profesional,
    telefono,
    rol_id = 3  // Valor por defecto: usuario normal
  } = req.body;

  // Validaciones exhaustivas
  const errores = [];
  
  if (!nombre || nombre.trim() === '') errores.push('nombre');
  if (!apellido_paterno || apellido_paterno.trim() === '') errores.push('apellido_paterno');
  if (!email || email.trim() === '') errores.push('email');
  if (!password || password.trim() === '') errores.push('password');
  if (!tipo_usuario || !['estudiante', 'profesor', 'administrador'].includes(tipo_usuario)) {
    errores.push('tipo_usuario (debe ser: estudiante, profesor, administrador)');
  }

  if (errores.length > 0) {
    console.log('❌ [crearUsuario] Faltan campos obligatorios:', errores);
    return res.status(400).json({ 
      success: false,
      mensaje: 'Faltan campos obligatorios: ' + errores.join(', '),
      campos_faltantes: errores
    });
  }

  if (!email.endsWith('@cucep.edu.mx')) {
    console.log('❌ [crearUsuario] Email no válido (debe ser @cucep.edu.mx)');
    return res.status(400).json({ 
      success: false,
      mensaje: 'El email debe ser del dominio @cucep.edu.mx',
      error_code: 'INVALID_EMAIL_DOMAIN'
    });
  }

  if (tipo_usuario === 'estudiante' && (!matricula || matricula.trim() === '')) {
    console.log('❌ [crearUsuario] Estudiante sin matrícula');
    return res.status(400).json({ 
      success: false,
      mensaje: 'Los estudiantes deben proporcionar una matrícula',
      error_code: 'MISSING_MATRICULA'
    });
  }

  if (tipo_usuario === 'profesor' && (!cedula_profesional || cedula_profesional.trim() === '')) {
    console.log('❌ [crearUsuario] Profesor sin cédula profesional');
    return res.status(400).json({ 
      success: false,
      mensaje: 'Los profesores deben proporcionar una cédula profesional',
      error_code: 'MISSING_CEDULA'
    });
  }

  if (password.length < 6) {
    console.log('❌ [crearUsuario] Contraseña muy corta');
    return res.status(400).json({ 
      success: false,
      mensaje: 'La contraseña debe tener al menos 6 caracteres',
      error_code: 'PASSWORD_TOO_SHORT'
    });
  }

  try {
    // Verificar si el email ya existe
    const emailExiste = await pool.query(
      'SELECT id FROM usuario WHERE email = $1',
      [email]
    );

    if (emailExiste.rows.length > 0) {
      console.log(`❌ [crearUsuario] Email ya registrado: ${email}`);
      return res.status(409).json({ 
        success: false,
        mensaje: 'El email ya está registrado',
        error_code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Verificar matrícula única para estudiantes
    if (tipo_usuario === 'estudiante' && matricula) {
      const matriculaExiste = await pool.query(
        'SELECT id FROM usuario WHERE matricula = $1',
        [matricula]
      );
      
      if (matriculaExiste.rows.length > 0) {
        console.log(`❌ [crearUsuario] Matrícula ya registrada: ${matricula}`);
        return res.status(409).json({ 
          success: false,
          mensaje: 'La matrícula ya está registrada',
          error_code: 'MATRICULA_ALREADY_EXISTS'
        });
      }
    }

    // Verificar cédula única para profesores
    if (tipo_usuario === 'profesor' && cedula_profesional) {
      const cedulaExiste = await pool.query(
        'SELECT id FROM usuario WHERE cedula_profesional = $1',
        [cedula_profesional]
      );
      
      if (cedulaExiste.rows.length > 0) {
        console.log(`❌ [crearUsuario] Cédula ya registrada: ${cedula_profesional}`);
        return res.status(409).json({ 
          success: false,
          mensaje: 'La cédula profesional ya está registrada',
          error_code: 'CEDULA_ALREADY_EXISTS'
        });
      }
    }

    // Hashear contraseña
    const passwordHash = bcrypt.hashSync(password, 10);

    // Determinar estado de validación inicial
    let estadoValidacion = 'pendiente';
    if (tipo_usuario === 'estudiante') {
      estadoValidacion = 'automatica';
    }

    const result = await pool.query(`
      INSERT INTO usuario (
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        email, 
        password_hash,
        tipo_usuario, 
        matricula, 
        cedula_profesional, 
        telefono,
        rol_id,
        estado_cuenta, 
        estado_validacion,
        fecha_creacion,
        fecha_actualizacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo', $11, NOW(), NOW())
      RETURNING 
        id, 
        nombre, 
        apellido_paterno, 
        email, 
        tipo_usuario, 
        estado_validacion, 
        estado_cuenta,
        rol_id,
        fecha_creacion
    `, [
      nombre.trim(), 
      apellido_paterno.trim(), 
      apellido_materno ? apellido_materno.trim() : null, 
      email.trim(), 
      passwordHash,
      tipo_usuario, 
      matricula ? matricula.trim() : null, 
      cedula_profesional ? cedula_profesional.trim() : null, 
      telefono ? telefono.trim() : null,
      rol_id,
      estadoValidacion
    ]);

    console.log(`✅ [crearUsuario] Usuario creado exitosamente: ${result.rows[0].email}`);
    
    res.status(201).json({
      success: true,
      mensaje: 'Usuario creado exitosamente',
      usuario: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [crearUsuario] Error:', error);
    
    let mensajeError = 'Error al crear usuario';
    let statusCode = 500;
    let errorCode = 'DATABASE_ERROR';
    
    if (error.code === '23505') { // Unique violation
      mensajeError = 'El email, matrícula o cédula ya están registrados';
      statusCode = 409;
      errorCode = 'UNIQUE_VIOLATION';
    } else if (error.code === '23503') { // Foreign key violation
      mensajeError = 'Error de referencia. El rol especificado no existe.';
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_VIOLATION';
    } else if (error.code === '23502') { // NOT NULL violation
      mensajeError = 'Faltan campos obligatorios en la base de datos';
      statusCode = 400;
      errorCode = 'NOT_NULL_VIOLATION';
    }
    
    res.status(statusCode).json({ 
      success: false,
      mensaje: mensajeError,
      error: error.message,
      error_code: errorCode,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 5. ACTUALIZAR USUARIO
// ===================================================
exports.actualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    telefono,
    avatar_url,
    estado_cuenta,
    estado_validacion,
    rol_id
  } = req.body;

  console.log(`📋 [actualizarUsuario] Actualizando usuario ID: ${id}`);
  console.log('📦 Datos a actualizar:', JSON.stringify(req.body, null, 2));

  try {
    // Validar ID
    const usuarioId = parseInt(id);
    if (isNaN(usuarioId) || usuarioId <= 0) {
      console.log(`❌ [actualizarUsuario] ID inválido: ${id}`);
      return res.status(400).json({ 
        success: false,
        mensaje: 'ID de usuario inválido',
        error_code: 'INVALID_ID_FORMAT'
      });
    }

    // Verificar que el usuario existe
    const usuarioExiste = await pool.query(
      'SELECT id, email FROM usuario WHERE id = $1',
      [usuarioId]
    );

    if (usuarioExiste.rows.length === 0) {
      console.log(`❌ [actualizarUsuario] Usuario ${usuarioId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        mensaje: 'Usuario no encontrado',
        error_code: 'USER_NOT_FOUND'
      });
    }

    const usuarioActual = usuarioExiste.rows[0];
    
    // Validar que no se intente modificar el admin principal
    if (usuarioActual.email === 'admin@cucep.edu.mx' && estado_cuenta === 'inactivo') {
      console.log('❌ [actualizarUsuario] Intento de desactivar administrador principal');
      return res.status(403).json({ 
        success: false,
        mensaje: 'No se puede desactivar el administrador principal del sistema',
        error_code: 'CANNOT_DEACTIVATE_ADMIN'
      });
    }

    // Construir dinámicamente la query de actualización
    const campos = [];
    const valores = [];
    let contador = 1;

    // Campos que se pueden actualizar
    const camposPermitidos = {
      nombre: nombre,
      apellido_paterno: apellido_paterno,
      apellido_materno: apellido_materno,
      telefono: telefono,
      avatar_url: avatar_url,
      estado_cuenta: estado_cuenta,
      estado_validacion: estado_validacion,
      rol_id: rol_id
    };

    for (const [campo, valor] of Object.entries(camposPermitidos)) {
      if (valor !== undefined) {
        // Validaciones específicas por campo
        if (campo === 'estado_cuenta' && !['activo', 'inactivo', 'suspendido'].includes(valor)) {
          return res.status(400).json({
            success: false,
            mensaje: 'Estado de cuenta inválido. Debe ser: activo, inactivo o suspendido',
            error_code: 'INVALID_ACCOUNT_STATUS'
          });
        }
        
        if (campo === 'estado_validacion' && !['pendiente', 'aprobado', 'rechazado', 'automatica'].includes(valor)) {
          return res.status(400).json({
            success: false,
            mensaje: 'Estado de validación inválido. Debe ser: pendiente, aprobado, rechazado o automatica',
            error_code: 'INVALID_VALIDATION_STATUS'
          });
        }
        
        if (campo === 'rol_id' && (valor < 1 || valor > 3)) {
          return res.status(400).json({
            success: false,
            mensaje: 'Rol inválido. Debe ser: 1 (admin), 2 (profesor) o 3 (usuario)',
            error_code: 'INVALID_ROLE'
          });
        }

        campos.push(`${campo} = $${contador}`);
        valores.push(valor);
        contador++;
      }
    }

    if (campos.length === 0) {
      console.log('❌ [actualizarUsuario] No hay campos para actualizar');
      return res.status(400).json({ 
        success: false,
        mensaje: 'No se proporcionaron campos válidos para actualizar',
        error_code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    // Agregar siempre fecha_actualizacion
    campos.push('fecha_actualizacion = NOW()');
    
    // Agregar ID al final de los valores
    valores.push(usuarioId);

    const query = `
      UPDATE usuario 
      SET ${campos.join(', ')}
      WHERE id = $${valores.length}
      RETURNING 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        email, 
        tipo_usuario, 
        estado_cuenta,
        estado_validacion,
        rol_id,
        telefono,
        avatar_url,
        fecha_actualizacion
    `;

    console.log('🔍 [actualizarUsuario] Query:', query);
    console.log('🔍 [actualizarUsuario] Valores:', valores);

    const result = await pool.query(query, valores);

    console.log(`✅ [actualizarUsuario] Usuario ${usuarioId} actualizado exitosamente`);
    
    res.json({
      success: true,
      mensaje: 'Usuario actualizado exitosamente',
      usuario: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [actualizarUsuario] Error:', error);
    
    let mensajeError = 'Error al actualizar usuario';
    let statusCode = 500;
    
    if (error.code === '23503') { // Foreign key violation
      mensajeError = 'Error de referencia. El rol especificado no existe.';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      mensaje: mensajeError,
      error: error.message,
      error_code: error.code,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 6. ACTUALIZAR CONTRASEÑA
// ===================================================
exports.actualizarPassword = async (req, res) => {
  const { id } = req.params;
  const { password_actual, password_nuevo } = req.body;

  console.log(`📋 [actualizarPassword] Actualizando contraseña para usuario ID: ${id}`);

  // Validaciones exhaustivas
  if (!password_actual || !password_nuevo) {
    console.log('❌ [actualizarPassword] Faltan contraseñas');
    return res.status(400).json({ 
      success: false,
      mensaje: 'Se requiere la contraseña actual y la nueva contraseña',
      error_code: 'MISSING_PASSWORDS'
    });
  }

  if (password_nuevo.length < 6) {
    console.log('❌ [actualizarPassword] Contraseña nueva muy corta');
    return res.status(400).json({ 
      success: false,
      mensaje: 'La nueva contraseña debe tener al menos 6 caracteres',
      error_code: 'PASSWORD_TOO_SHORT'
    });
  }

  if (password_actual === password_nuevo) {
    console.log('❌ [actualizarPassword] La nueva contraseña es igual a la actual');
    return res.status(400).json({ 
      success: false,
      mensaje: 'La nueva contraseña debe ser diferente a la actual',
      error_code: 'SAME_PASSWORD'
    });
  }

  try {
    // Validar ID
    const usuarioId = parseInt(id);
    if (isNaN(usuarioId) || usuarioId <= 0) {
      console.log(`❌ [actualizarPassword] ID inválido: ${id}`);
      return res.status(400).json({ 
        success: false,
        mensaje: 'ID de usuario inválido',
        error_code: 'INVALID_ID_FORMAT'
      });
    }

    const result = await pool.query(
      'SELECT id, password_hash, email FROM usuario WHERE id = $1',
      [usuarioId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ [actualizarPassword] Usuario ${usuarioId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        mensaje: 'Usuario no encontrado',
        error_code: 'USER_NOT_FOUND'
      });
    }

    const usuario = result.rows[0];

    // Verificar contraseña actual
    const passwordValida = bcrypt.compareSync(password_actual, usuario.password_hash);
    
    if (!passwordValida) {
      console.log(`❌ [actualizarPassword] Contraseña actual incorrecta para usuario ${usuario.email}`);
      return res.status(401).json({ 
        success: false,
        mensaje: 'La contraseña actual es incorrecta',
        error_code: 'INCORRECT_CURRENT_PASSWORD'
      });
    }

    // Hashear nueva contraseña
    const nuevoHash = bcrypt.hashSync(password_nuevo, 10);

    await pool.query(
      'UPDATE usuario SET password_hash = $1, fecha_actualizacion = NOW() WHERE id = $2',
      [nuevoHash, usuarioId]
    );

    console.log(`✅ [actualizarPassword] Contraseña actualizada para usuario ${usuario.email}`);
    
    res.json({ 
      success: true,
      mensaje: 'Contraseña actualizada exitosamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [actualizarPassword] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al actualizar contraseña', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 7. ELIMINAR/DESACTIVAR USUARIO
// ===================================================
exports.eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  console.log(`📋 [eliminarUsuario] Eliminando/desactivando usuario ID: ${id}`);

  try {
    // Validar ID
    const usuarioId = parseInt(id);
    if (isNaN(usuarioId) || usuarioId <= 0) {
      console.log(`❌ [eliminarUsuario] ID inválido: ${id}`);
      return res.status(400).json({ 
        success: false,
        mensaje: 'ID de usuario inválido',
        error_code: 'INVALID_ID_FORMAT'
      });
    }

    const usuarioExiste = await pool.query(
      'SELECT id, email, tipo_usuario FROM usuario WHERE id = $1',
      [usuarioId]
    );

    if (usuarioExiste.rows.length === 0) {
      console.log(`❌ [eliminarUsuario] Usuario ${usuarioId} no encontrado`);
      return res.status(404).json({ 
        success: false,
        mensaje: 'Usuario no encontrado',
        error_code: 'USER_NOT_FOUND'
      });
    }

    const usuario = usuarioExiste.rows[0];

    // Proteger administrador principal
    if (usuario.email === 'admin@cucep.edu.mx') {
      console.log('❌ [eliminarUsuario] Intento de eliminar administrador principal');
      return res.status(403).json({ 
        success: false,
        mensaje: 'No se puede eliminar el administrador principal del sistema',
        error_code: 'CANNOT_DELETE_ADMIN'
      });
    }

    // Desactivar en lugar de eliminar (soft delete)
    await pool.query(
      `UPDATE usuario 
       SET estado_cuenta = 'inactivo', 
           fecha_actualizacion = NOW() 
       WHERE id = $1`,
      [usuarioId]
    );

    console.log(`✅ [eliminarUsuario] Usuario ${usuario.email} desactivado exitosamente`);
    
    res.json({ 
      success: true,
      mensaje: 'Usuario desactivado exitosamente',
      nota: 'El usuario fue desactivado (soft delete) pero no eliminado permanentemente',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        estado: 'inactivo'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [eliminarUsuario] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al eliminar usuario', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 8. OBTENER USUARIOS POR TIPO
// ===================================================
exports.obtenerUsuariosPorTipo = async (req, res) => {
  const { tipo } = req.params;

  console.log(`📋 [obtenerUsuariosPorTipo] Obteniendo usuarios de tipo: ${tipo}`);

  // Validar tipo de usuario
  const tiposValidos = ['estudiante', 'profesor', 'administrador'];
  if (!tiposValidos.includes(tipo)) {
    console.log(`❌ [obtenerUsuariosPorTipo] Tipo inválido: ${tipo}`);
    return res.status(400).json({ 
      success: false,
      mensaje: 'Tipo de usuario inválido. Debe ser: estudiante, profesor o administrador',
      error_code: 'INVALID_USER_TYPE',
      tipos_validos: tiposValidos
    });
  }

  try {
    const result = await pool.query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        email, 
        tipo_usuario, 
        matricula, 
        cedula_profesional, 
        estado_validacion,
        estado_cuenta, 
        fecha_creacion, 
        rol_id,
        telefono,
        avatar_url
      FROM usuario 
      WHERE tipo_usuario = $1
      ORDER BY fecha_creacion DESC
    `, [tipo]);

    console.log(`✅ [obtenerUsuariosPorTipo] ${result.rows.length} usuarios de tipo ${tipo} encontrados`);
    
    res.json({
      success: true,
      mensaje: `Usuarios de tipo ${tipo} obtenidos exitosamente`,
      total: result.rows.length,
      usuarios: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [obtenerUsuariosPorTipo] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al obtener usuarios', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 9. OBTENER PROFESORES PENDIENTES
// ===================================================
exports.obtenerProfesoresPendientes = async (req, res) => {
  try {
    console.log('📋 [obtenerProfesoresPendientes] Obteniendo profesores pendientes...');
    
    // Primero verificamos si la vista existe
    const vistaExiste = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'v_profesor_pendiente'
      )
    `);

    if (!vistaExiste.rows[0].exists) {
      console.log('⚠️ [obtenerProfesoresPendientes] Vista no existe, usando consulta directa');
      
      // Consulta alternativa si la vista no existe
      const result = await pool.query(`
        SELECT 
          id, 
          nombre, 
          apellido_paterno, 
          apellido_materno, 
          email,
          cedula_profesional, 
          telefono, 
          fecha_creacion,
          estado_validacion, 
          estado_cuenta,
          avatar_url,
          rol_id
        FROM usuario 
        WHERE tipo_usuario = 'profesor' 
        AND estado_validacion = 'pendiente'
        ORDER BY fecha_creacion DESC
      `);
      
      console.log(`✅ [obtenerProfesoresPendientes] ${result.rows.length} profesores pendientes encontrados (consulta directa)`);
      
      return res.json({
        success: true,
        mensaje: 'Profesores pendientes obtenidos exitosamente',
        total: result.rows.length,
        profesores: result.rows,
        nota: 'Datos obtenidos mediante consulta directa (vista no disponible)',
        timestamp: new Date().toISOString()
      });
    }

    // Si la vista existe, usarla
    const result = await pool.query(`
      SELECT * FROM v_profesor_pendiente
      ORDER BY fecha_creacion DESC
    `);

    console.log(`✅ [obtenerProfesoresPendientes] ${result.rows.length} profesores pendientes encontrados (desde vista)`);
    
    res.json({
      success: true,
      mensaje: 'Profesores pendientes obtenidos exitosamente',
      total: result.rows.length,
      profesores: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [obtenerProfesoresPendientes] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error al obtener profesores pendientes', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 10. VALIDAR PROFESOR (NUEVO MÉTODO)
// ===================================================
exports.validarProfesor = async (req, res) => {
  const { id } = req.params;
  const { 
    accion, // 'aprobar' o 'rechazar'
    comentario_validacion,
    validado_por // ID del administrador que valida
  } = req.body;

  console.log(`📋 [validarProfesor] Validando profesor ID: ${id}, Acción: ${accion}`);

  try {
    // Validaciones
    const usuarioId = parseInt(id);
    if (isNaN(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de usuario inválido',
        error_code: 'INVALID_ID_FORMAT'
      });
    }

    if (!['aprobar', 'rechazar'].includes(accion)) {
      return res.status(400).json({
        success: false,
        mensaje: 'Acción inválida. Debe ser: aprobar o rechazar',
        error_code: 'INVALID_ACTION'
      });
    }

    if (!validado_por) {
      return res.status(400).json({
        success: false,
        mensaje: 'Se requiere el ID del administrador que valida',
        error_code: 'MISSING_VALIDATOR'
      });
    }

    // Verificar que el profesor existe y es profesor
    const profesor = await pool.query(
      `SELECT id, nombre, email, tipo_usuario, estado_validacion 
       FROM usuario 
       WHERE id = $1 AND tipo_usuario = 'profesor'`,
      [usuarioId]
    );

    if (profesor.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Profesor no encontrado o no es un profesor',
        error_code: 'PROFESSOR_NOT_FOUND'
      });
    }

    const profesorActual = profesor.rows[0];
    
    // Verificar que está pendiente de validación
    if (profesorActual.estado_validacion !== 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: `El profesor ya está ${profesorActual.estado_validacion}`,
        error_code: 'ALREADY_VALIDATED'
      });
    }

    // Determinar nuevo estado
    const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
    
    // Actualizar profesor
    await pool.query(
      `UPDATE usuario 
       SET estado_validacion = $1,
           validado_por = $2,
           fecha_validacion = NOW(),
           comentario_validacion = $3,
           fecha_actualizacion = NOW()
       WHERE id = $4`,
      [nuevoEstado, validado_por, comentario_validacion || null, usuarioId]
    );

    // Registrar en historial
    await pool.query(
      `INSERT INTO historial_validacion 
       (usuario_id, administrador_id, accion, comentario, fecha_accion)
       VALUES ($1, $2, $3, $4, NOW())`,
      [usuarioId, validado_por, accion, comentario_validacion]
    );

    console.log(`✅ [validarProfesor] Profesor ${profesorActual.email} ${accion} exitosamente`);
    
    res.json({
      success: true,
      mensaje: `Profesor ${accion} exitosamente`,
      profesor: {
        id: profesorActual.id,
        nombre: profesorActual.nombre,
        email: profesorActual.email,
        estado_validacion: nuevoEstado
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [validarProfesor] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al validar profesor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};