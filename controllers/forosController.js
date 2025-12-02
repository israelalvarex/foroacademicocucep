// controllers/forosController.js - VERSIÓN COMPLETA Y CORREGIDA
const db = require('../config/bd');

// ===================================================
// FUNCIÓN AUXILIAR: OBTENER O CREAR HILO PRINCIPAL
// ===================================================
const obtenerOCrearHiloPrincipal = async (foroId, usuarioId) => {
  console.log(`🔍 [obtenerOCrearHiloPrincipal] Foro: ${foroId}, Usuario: ${usuarioId}`);
  
  try {
    // 1. Buscar hilo principal existente
    const hiloExistente = await db.query(
      `SELECT id, titulo 
       FROM hilo 
       WHERE foro_id = $1 
       ORDER BY fecha_creacion ASC 
       LIMIT 1`,
      [foroId]
    );
    
    if (hiloExistente.rows.length > 0) {
      console.log(`✅ Hilo encontrado: ${hiloExistente.rows[0].id} - "${hiloExistente.rows[0].titulo}"`);
      return hiloExistente.rows[0].id;
    }
    
    // 2. Si no existe, obtener info del foro para crear hilo
    const foroInfo = await db.query(
      'SELECT nombre, creado_por FROM foro WHERE id = $1',
      [foroId]
    );
    
    if (foroInfo.rows.length === 0) {
      throw new Error(`Foro ${foroId} no existe`);
    }
    
    const foro = foroInfo.rows[0];
    const autorHilo = foro.creado_por || usuarioId;
    
    // 3. Crear nuevo hilo
    const nuevoHilo = await db.query(
      `INSERT INTO hilo (
        foro_id, 
        titulo, 
        autor_id, 
        slug,
        estado,
        es_fijado,
        es_cerrado,
        total_vistas,
        total_respuestas,
        fecha_creacion,
        fecha_actualizacion
      ) VALUES ($1, $2, $3, $4, 'abierto', false, false, 0, 0, NOW(), NOW())
      RETURNING id, titulo`,
      [
        foroId,
        `Hilo: ${foro.nombre}`,
        autorHilo,
        `hilo-${foroId}-${Date.now()}`
      ]
    );
    
    console.log(`✅ Nuevo hilo creado: ${nuevoHilo.rows[0].id} - "${nuevoHilo.rows[0].titulo}"`);
    return nuevoHilo.rows[0].id;
    
  } catch (error) {
    console.error(`❌ Error en obtenerOCrearHiloPrincipal:`, error);
    throw error;
  }
};

// ===================================================
// 1. OBTENER TODOS LOS FOROS
// ===================================================
exports.obtenerForos = async (req, res) => {
  try {
    console.log('📋 [obtenerForos] Obteniendo todos los foros...');
    
    const { categoria_id, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        f.id,
        f.nombre as titulo,
        f.descripcion,
        f.categoria_id,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        u.nombre as autor_nombre,
        u.apellido_paterno as autor_apellido,
        f.creado_por as usuario_id,
        f.estado,
        f.total_hilos as vistas,
        f.total_publicaciones as respuestas,
        'discusion' as tipo,
        false as privado,
        f.slug as foro_slug,
        f.fecha_creacion,
        f.fecha_actualizacion,
        EXTRACT(EPOCH FROM (NOW() - f.fecha_creacion)) / 3600 as horas_desde_creacion
      FROM foro f
      LEFT JOIN categoria c ON f.categoria_id = c.id
      LEFT JOIN usuario u ON f.creado_por = u.id
      WHERE f.estado = 'activo'
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (categoria_id) {
      query += ` AND f.categoria_id = $${paramCount}`;
      params.push(categoria_id);
      paramCount++;
    }
    
    query += ` ORDER BY f.fecha_creacion DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    console.log('🔍 [obtenerForos] Query:', query);
    console.log('🔍 [obtenerForos] Params:', params);
    
    const result = await db.query(query, params);
    
    console.log(`✅ [obtenerForos] ${result.rows.length} foros encontrados`);
    
    res.json({
      success: true,
      foros: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      categoria_id: categoria_id || 'todas',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [obtenerForos] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener foros',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 2. OBTENER FOROS RECIENTES
// ===================================================
exports.obtenerForosRecientes = async (req, res) => {
  try {
    console.log('📋 [obtenerForosRecientes] Obteniendo foros recientes...');
    
    const limit = parseInt(req.query.limit) || 5;
    const categoriaId = req.query.categoria_id;
    
    console.log(`🔍 [obtenerForosRecientes] Parámetros: limit=${limit}, categoria_id=${categoriaId || 'todas'}`);
    
    let query = `
      SELECT 
        f.id,
        f.nombre as titulo,
        f.descripcion,
        f.categoria_id,
        c.nombre as categoria_nombre,
        u.nombre as autor_nombre,
        u.apellido_paterno as autor_apellido,
        f.creado_por as usuario_id,
        f.estado,
        f.total_hilos as vistas,
        f.total_publicaciones as respuestas,
        'discusion' as tipo,
        f.fecha_creacion,
        f.fecha_actualizacion
      FROM foro f
      LEFT JOIN categoria c ON f.categoria_id = c.id
      LEFT JOIN usuario u ON f.creado_por = u.id
      WHERE f.estado = 'activo'
    `;
    
    const params = [];
    
    if (categoriaId) {
      query += ' AND f.categoria_id = $1';
      params.push(categoriaId);
    }
    
    query += ' ORDER BY f.fecha_actualizacion DESC, f.fecha_creacion DESC';
    
    if (categoriaId) {
      query += ' LIMIT $2';
      params.push(limit);
    } else {
      query += ' LIMIT $1';
      params.push(limit);
    }
    
    console.log('🔍 [obtenerForosRecientes] Query:', query);
    console.log('🔍 [obtenerForosRecientes] Params:', params);
    
    const result = await db.query(query, params);
    
    console.log(`✅ [obtenerForosRecientes] ${result.rows.length} foros recientes encontrados`);
    
    res.json({
      success: true,
      foros: result.rows,
      total: result.rows.length,
      limit: limit,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [obtenerForosRecientes] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener foros recientes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 3. CREAR NUEVO FORO
// ===================================================
exports.crearForo = async (req, res) => {
  console.log('🎯 ========== [crearForo] INICIO ==========');
  
  const usuario_id = req.user?.id;
  
  if (!usuario_id) {
    console.log('❌ [crearForo] Usuario no autenticado o token inválido');
    return res.status(401).json({
      success: false,
      mensaje: 'Usuario no autenticado. Por favor inicia sesión.'
    });
  }
  
  console.log(`✅ [crearForo] Usuario autenticado: ID=${usuario_id}, Nombre=${req.user.nombre}, Rol=${req.user.rol}`);
  
  const { 
    titulo, 
    descripcion, 
    categoria_id
  } = req.body;
  
  console.log('🔍 [crearForo] Campos extraídos:', { titulo, descripcion, categoria_id });
  
  // Validaciones
  const camposFaltantes = [];
  if (!titulo || titulo.trim() === '') camposFaltantes.push('titulo');
  if (!descripcion || descripcion.trim() === '') camposFaltantes.push('descripcion');
  if (!categoria_id) camposFaltantes.push('categoria_id');
  
  if (camposFaltantes.length > 0) {
    console.log('❌ [crearForo] Faltan campos requeridos:', camposFaltantes);
    return res.status(400).json({ 
      success: false,
      mensaje: 'Faltan campos requeridos: ' + camposFaltantes.join(', ')
    });
  }

  try {
    // Verificar que la categoría existe
    console.log(`🔍 [crearForo] Verificando categoría ID: ${categoria_id}`);
    const categoriaCheck = await db.query(
      'SELECT id, nombre FROM categoria WHERE id = $1',
      [categoria_id]
    );

    if (categoriaCheck.rows.length === 0) {
      console.log(`❌ [crearForo] Categoría ${categoria_id} no existe`);
      return res.status(404).json({ 
        success: false,
        mensaje: 'La categoría especificada no existe'
      });
    }
    
    // Generar slug
    const slug = titulo
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const nombre = titulo;
    
    // Insertar el nuevo foro
    console.log('📝 [crearForo] Insertando nuevo foro...');
    
    const nuevoForo = await db.query(
      `INSERT INTO foro (
        categoria_id, 
        nombre, 
        descripcion, 
        slug, 
        creado_por,
        estado,
        total_hilos,
        total_publicaciones,
        fecha_creacion,
        fecha_actualizacion
      ) VALUES ($1, $2, $3, $4, $5, 'activo', 0, 0, NOW(), NOW())
      RETURNING *`,
      [
        categoria_id,
        nombre,
        descripcion,
        slug,
        usuario_id
      ]
    );

    console.log('✅ [crearForo] Foro creado exitosamente');
    
    res.status(201).json({
      success: true,
      mensaje: '🎉 ¡Foro creado exitosamente!',
      foro: {
        id: nuevoForo.rows[0].id,
        nombre: nuevoForo.rows[0].nombre,
        descripcion: nuevoForo.rows[0].descripcion,
        categoria_id: nuevoForo.rows[0].categoria_id,
        slug: nuevoForo.rows[0].slug,
        fecha_creacion: nuevoForo.rows[0].fecha_creacion
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [crearForo] ERROR EN CREACIÓN DE FORO:');
    console.error('❌ Código de error:', error.code);
    console.error('❌ Mensaje:', error.message);
    
    let mensajeError = 'Error al crear el foro';
    let statusCode = 500;
    
    if (error.code === '23505') {
      mensajeError = 'Ya existe un foro con un título similar. Intenta con un título diferente.';
      statusCode = 409;
    } else if (error.code === '23503') {
      mensajeError = 'Error de referencia. Verifica que la categoría exista.';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      mensaje: mensajeError,
      error_code: error.code,
      error_message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  console.log('🎯 ========== [crearForo] FIN ==========');
};

// ===================================================
// 4. OBTENER FOROS POR CATEGORÍA
// ===================================================
exports.obtenerForosPorCategoria = async (req, res) => {
  try {
    const { categoria_id } = req.params;
    
    console.log(`📋 [obtenerForosPorCategoria] Categoría ID: ${categoria_id}`);
    
    // Verificar que la categoría existe
    const categoriaCheck = await db.query(
      'SELECT id, nombre FROM categoria WHERE id = $1',
      [categoria_id]
    );
    
    if (categoriaCheck.rows.length === 0) {
      console.log(`❌ [obtenerForosPorCategoria] Categoría ${categoria_id} no encontrada`);
      return res.status(404).json({
        success: false,
        mensaje: 'Categoría no encontrada'
      });
    }
    
    const foros = await db.query(
      `SELECT 
        f.id,
        f.nombre as titulo,
        f.descripcion,
        f.slug,
        f.estado,
        f.total_hilos as vistas,
        f.total_publicaciones as respuestas,
        'discusion' as tipo,
        f.fecha_creacion,
        f.fecha_actualizacion,
        u.nombre as autor_nombre,
        u.apellido_paterno as autor_apellido,
        f.creado_por as usuario_id
       FROM foro f
       LEFT JOIN usuario u ON f.creado_por = u.id
       WHERE f.categoria_id = $1 AND f.estado = 'activo'
       ORDER BY f.fecha_creacion DESC`,
      [categoria_id]
    );
    
    console.log(`✅ [obtenerForosPorCategoria] ${foros.rows.length} foros encontrados en categoría`);
    
    res.json({
      success: true,
      categoria: categoriaCheck.rows[0],
      foros: foros.rows,
      total: foros.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [obtenerForosPorCategoria] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener foros por categoría',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 5. OBTENER ESTADÍSTICAS DE FOROS
// ===================================================
exports.obtenerEstadisticas = async (req, res) => {
  try {
    console.log('📊 [obtenerEstadisticas] Iniciando...');
    
    // Obtener total de foros activos
    const totalForos = await db.query(
      "SELECT COUNT(*) as total FROM foro WHERE estado = 'activo'"
    );
    
    // Obtener total de categorías activas
    const totalCategorias = await db.query(
      "SELECT COUNT(*) as total FROM categoria"
    );
    
    // Obtener foros más populares (más publicaciones)
    const forosPopulares = await db.query(`
      SELECT f.id, f.nombre, f.total_publicaciones as respuestas, c.nombre as categoria_nombre
      FROM foro f
      JOIN categoria c ON f.categoria_id = c.id
      WHERE f.estado = 'activo'
      ORDER BY f.total_publicaciones DESC
      LIMIT 5
    `);
    
    // Obtener foros más recientes
    const forosRecientes = await db.query(`
      SELECT f.id, f.nombre, f.fecha_creacion, c.nombre as categoria_nombre
      FROM foro f
      JOIN categoria c ON f.categoria_id = c.id
      WHERE f.estado = 'activo'
      ORDER BY f.fecha_creacion DESC
      LIMIT 5
    `);
    
    // Obtener categorías con más foros
    const categoriasActivas = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        COUNT(f.id) as total_foros,
        COALESCE(SUM(f.total_publicaciones), 0) as total_respuestas
      FROM categoria c
      LEFT JOIN foro f ON c.id = f.categoria_id AND f.estado = 'activo'
      GROUP BY c.id, c.nombre
      ORDER BY total_foros DESC
      LIMIT 5
    `);
    
    console.log('✅ [obtenerEstadisticas] Estadísticas calculadas');
    
    res.json({
      success: true,
      estadisticas: {
        total_foros: parseInt(totalForos.rows[0].total) || 0,
        total_categorias: parseInt(totalCategorias.rows[0].total) || 0,
        foros_populares: forosPopulares.rows,
        foros_recientes: forosRecientes.rows,
        categorias_activas: categoriasActivas.rows
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [obtenerEstadisticas] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener estadísticas',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 6. OBTENER CATEGORÍAS
// ===================================================
exports.obtenerCategorias = async (req, res) => {
  try {
    console.log('📋 [obtenerCategorias] Iniciando...');
    
    const categorias = await db.query(`
      SELECT c.id, c.nombre, c.descripcion, c.slug, c.orden
      FROM categoria c
      ORDER BY c.orden ASC, c.nombre ASC;
    `);

    console.log(`✅ [obtenerCategorias] ${categorias.rows.length} categorías encontradas`);
    res.json({
      success: true,
      categorias: categorias.rows,
      total: categorias.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ [obtenerCategorias] Error:", error);
    res.status(500).json({ 
      success: false,
      mensaje: "Error al obtener categorías",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 7. OBTENER CATEGORÍA CON FOROS
// ===================================================
exports.obtenerCategoriaConForos = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 [obtenerCategoriaConForos] Categoría ID: ${id}`);

    // Primero obtener la categoría
    const categoriaResult = await db.query(
      `SELECT id, nombre, descripcion, slug, orden
       FROM categoria
       WHERE id = $1`,
      [id]
    );

    if (categoriaResult.rows.length === 0) {
      console.log(`❌ [obtenerCategoriaConForos] Categoría ${id} no encontrada`);
      return res.status(404).json({ 
        success: false,
        mensaje: "Categoría no encontrada" 
      });
    }

    // Luego obtener los foros de esa categoría
    const forosResult = await db.query(
      `SELECT 
        f.id, 
        f.nombre,
        f.descripcion, 
        f.slug as foro_slug,
        f.estado, 
        'discusion' as tipo,
        false as privado,
        f.total_hilos as vistas,
        f.total_publicaciones as respuestas,
        f.fecha_creacion,
        f.fecha_actualizacion,
        u.nombre as autor_nombre,
        u.apellido_paterno as autor_apellido,
        f.creado_por as autor_id
       FROM foro f
       LEFT JOIN usuario u ON f.creado_por = u.id
       WHERE f.categoria_id = $1 AND f.estado = 'activo'
       ORDER BY f.fecha_creacion DESC`,
      [id]
    );

    console.log(`✅ [obtenerCategoriaConForos] ${forosResult.rows.length} foros encontrados en categoría ${id}`);
    
    res.json({
      success: true,
      categoria: categoriaResult.rows[0],
      foros: forosResult.rows,
      total_foros: forosResult.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [obtenerCategoriaConForos] Error:", error);
    res.status(500).json({ 
      success: false,
      mensaje: "Error al obtener categoría con foros",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 8. OBTENER FORO POR ID
// ===================================================
exports.obtenerForoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 [obtenerForoPorId] Foro ID: ${id}`);

    // Incrementar total_hilos (vistas)
    await db.query(
      'UPDATE foro SET total_hilos = total_hilos + 1 WHERE id = $1',
      [id]
    );

    const foro = await db.query(
      `SELECT 
        f.id,
        f.nombre,
        f.descripcion,
        f.categoria_id,
        f.creado_por,
        f.slug,
        f.estado,
        f.total_hilos as vistas,
        f.total_publicaciones as respuestas,
        f.fecha_creacion,
        f.fecha_actualizacion,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        u.nombre as autor_nombre,
        u.apellido_paterno as autor_apellido,
        u.email as autor_email,
        u.avatar_url as autor_avatar,
        u.tipo_usuario as autor_tipo
       FROM foro f
       LEFT JOIN categoria c ON f.categoria_id = c.id
       LEFT JOIN usuario u ON f.creado_por = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (foro.rows.length === 0) {
      console.log(`❌ [obtenerForoPorId] Foro ${id} no encontrado`);
      return res.status(404).json({ 
        success: false,
        mensaje: "Foro no encontrado" 
      });
    }

    console.log(`✅ [obtenerForoPorId] Foro encontrado: ${foro.rows[0].nombre}`);
    
    // Preparar respuesta estructurada
    const foroData = foro.rows[0];
    const respuesta = {
      success: true,
      foro: {
        id: foroData.id,
        nombre: foroData.nombre,
        descripcion: foroData.descripcion,
        categoria_id: foroData.categoria_id,
        creado_por: foroData.creado_por,
        slug: foroData.slug,
        estado: foroData.estado,
        vistas: foroData.vistas,
        respuestas: foroData.respuestas,
        fecha_creacion: foroData.fecha_creacion,
        fecha_actualizacion: foroData.fecha_actualizacion,
        categoria_nombre: foroData.categoria_nombre,
        categoria_slug: foroData.categoria_slug,
        autor: {
          nombre: foroData.autor_nombre,
          apellido: foroData.autor_apellido,
          email: foroData.autor_email,
          avatar: foroData.autor_avatar,
          tipo: foroData.autor_tipo
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(respuesta);

  } catch (error) {
    console.error("❌ [obtenerForoPorId] Error:", error);
    res.status(500).json({ 
      success: false,
      mensaje: "Error al obtener foro",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 9. OBTENER PUBLICACIONES DEL FORO (MENSAJES) - CORREGIDO
// ===================================================
exports.obtenerMensajes = async (req, res) => {
  try {
    const foroId = req.params.id;
    console.log('🔍 [obtenerMensajes] Foro ID:', foroId);

    // PRIMERO verificar que el foro existe
    const foroCheck = await db.query(
      'SELECT id, nombre FROM foro WHERE id = $1',
      [foroId]
    );

    if (foroCheck.rows.length === 0) {
      console.log(`❌ [obtenerMensajes] Foro ${foroId} no existe`);
      return res.status(404).json({
        success: false,
        mensaje: 'Foro no encontrado'
      });
    }

    // SEGUNDO: Buscar hilo(s) asociados a este foro
    const hilosResult = await db.query(
      'SELECT id FROM hilo WHERE foro_id = $1',
      [foroId]
    );
    
    if (hilosResult.rows.length === 0) {
      console.log(`ℹ️ [obtenerMensajes] No hay hilos para el foro ${foroId}`);
      return res.json({
        success: true,
        publicaciones: [],
        total: 0,
        foro: {
          id: foroCheck.rows[0].id,
          nombre: foroCheck.rows[0].nombre
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Obtener IDs de todos los hilos de este foro
    const hiloIds = hilosResult.rows.map(h => h.id);
    console.log(`🔍 Hilos encontrados para foro ${foroId}:`, hiloIds);
    
    // TERCERO: Buscar publicaciones de TODOS los hilos de este foro
    const result = await db.query(
      `SELECT 
        p.id, 
        p.contenido as mensaje, 
        p.fecha_creacion as fecha_envio,
        p.fue_editada as fue_editado, 
        p.fecha_edicion,
        p.numero_publicacion,
        p.es_primera_publicacion,
        p.hilo_id,
        u.id as usuario_id,
        u.nombre,
        u.apellido_paterno,
        u.email,
        u.rol_id,
        u.tipo_usuario,
        u.avatar_url,
        u.estado_cuenta,
        h.titulo as hilo_titulo
       FROM publicacion p
       JOIN usuario u ON u.id = p.autor_id
       JOIN hilo h ON h.id = p.hilo_id
       WHERE p.hilo_id = ANY($1)
       ORDER BY p.fecha_creacion ASC`,
      [hiloIds]
    );

    console.log(`✅ [obtenerMensajes] ${result.rows.length} publicaciones encontradas`);
    
    // Estructurar respuesta correctamente
    res.json({
      success: true,
      publicaciones: result.rows,
      total: result.rows.length,
      foro: {
        id: foroCheck.rows[0].id,
        nombre: foroCheck.rows[0].nombre
      },
      hilos: hiloIds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [obtenerMensajes] Error:", error);
    res.status(500).json({ 
      success: false,
      mensaje: "Error al obtener publicaciones", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 10. CREAR NUEVA PUBLICACIÓN - VERSIÓN UNIVERSAL CORREGIDA
// ===================================================
exports.crearMensaje = async (req, res) => {
  try {
    const foroId = req.params.id; // ID del foro desde la URL
    const { mensaje } = req.body;
    
    console.log('🔍 [crearMensaje] INICIANDO PUBLICACIÓN');
    console.log('📌 Foro ID recibido:', foroId);
    
    // Validaciones básicas
    if (!req.user || !req.user.id) {
      console.log('❌ [crearMensaje] Usuario no autenticado');
      return res.status(401).json({ 
        success: false,
        mensaje: 'Usuario no autenticado'
      });
    }
    
    if (!mensaje || mensaje.trim() === '') {
      console.log('❌ [crearMensaje] Mensaje vacío');
      return res.status(400).json({ 
        success: false,
        mensaje: 'El mensaje no puede estar vacío' 
      });
    }
    
    const usuarioId = req.user.id;
    const mensajeLimpio = mensaje.trim();
    
    // 1. Verificar si el foro existe
    const foroResult = await db.query(
      'SELECT id, nombre FROM foro WHERE id = $1',
      [foroId]
    );
    
    if (foroResult.rows.length === 0) {
      console.log(`❌ [crearMensaje] Foro ${foroId} no encontrado`);
      return res.status(404).json({
        success: false,
        mensaje: 'Foro no encontrado'
      });
    }
    
    const foro = foroResult.rows[0];
    console.log(`✅ [crearMensaje] Foro encontrado: "${foro.nombre}"`);
    
    // 2. Obtener o crear hilo principal para este foro
    const hiloId = await obtenerOCrearHiloPrincipal(foroId, usuarioId);
    
    // 3. Obtener siguiente número de publicación para este hilo
    const ultimaPub = await db.query(
      'SELECT COALESCE(MAX(numero_publicacion), 0) as max_num FROM publicacion WHERE hilo_id = $1',
      [hiloId]
    );
    
    const siguienteNumero = (ultimaPub.rows[0]?.max_num || 0) + 1;
    const esPrimera = siguienteNumero === 1;
    
    console.log(`📊 [crearMensaje] Insertando publicación #${siguienteNumero} en hilo ${hiloId} (primera: ${esPrimera})`);
    
    // 4. Insertar publicación en la tabla 'publicacion'
    const publicacionResult = await db.query(
      `INSERT INTO publicacion (
        hilo_id, 
        autor_id, 
        contenido, 
        contenido_html,
        es_primera_publicacion, 
        numero_publicacion,
        fue_editada, 
        fecha_creacion,
        fecha_edicion,
        ip_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW(), '0.0.0.0')
      RETURNING id, contenido, fecha_creacion, numero_publicacion, es_primera_publicacion`,
      [hiloId, usuarioId, mensajeLimpio, mensajeLimpio, esPrimera, siguienteNumero]
    );
    
    // 5. Actualizar contadores
    // a) En la tabla foro
    await db.query(
      `UPDATE foro 
       SET total_publicaciones = total_publicaciones + 1, 
           fecha_actualizacion = NOW() 
       WHERE id = $1`,
      [foroId]
    );
    
    // b) En la tabla hilo
    await db.query(
      `UPDATE hilo 
       SET total_respuestas = total_respuestas + 1,
           fecha_actualizacion = NOW()
       WHERE id = $1`,
      [hiloId]
    );
    
    // 6. Obtener datos completos de la publicación
    const publicacionCompleta = await db.query(
      `SELECT 
        p.id, 
        p.contenido as mensaje, 
        p.fecha_creacion as fecha_envio,
        p.fue_editada as fue_editado, 
        p.fecha_edicion,
        p.numero_publicacion,
        p.es_primera_publicacion,
        p.hilo_id,
        u.id as usuario_id,
        u.nombre,
        u.apellido_paterno,
        u.email,
        u.rol_id,
        u.tipo_usuario,
        u.avatar_url,
        h.titulo as hilo_titulo
       FROM publicacion p
       JOIN usuario u ON u.id = p.autor_id
       JOIN hilo h ON h.id = p.hilo_id
       WHERE p.id = $1`,
      [publicacionResult.rows[0].id]
    );
    
    console.log('✅ [crearMensaje] PUBLICACIÓN EXITOSA');
    console.log('📊 Resumen:', {
      foro_id: foroId,
      foro_nombre: foro.nombre,
      hilo_id: hiloId,
      publicacion_id: publicacionResult.rows[0].id,
      usuario_id: usuarioId,
      numero_publicacion: siguienteNumero
    });
    
    res.status(201).json({
      success: true,
      mensaje: '✅ Publicación creada exitosamente',
      publicacion: publicacionCompleta.rows[0],
      metadata: {
        foro_id: foroId,
        foro_nombre: foro.nombre,
        hilo_id: hiloId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [crearMensaje] ERROR:', error);
    
    // Manejo de errores específicos
    let mensajeUsuario = 'Error al crear mensaje';
    let codigoError = 'ERROR_GENERICO';
    
    if (error.code === '23503') { // Foreign key violation
      if (error.constraint === 'fk_publicacion_hilo') {
        mensajeUsuario = 'Error: No se pudo encontrar o crear un hilo para este foro';
        codigoError = 'HILO_NO_ENCONTRADO';
      } else if (error.constraint.includes('autor')) {
        mensajeUsuario = 'Error: Usuario no válido';
        codigoError = 'USUARIO_INVALIDO';
      }
    } else if (error.code === '23505') { // Unique violation
      mensajeUsuario = 'Error: Esta publicación ya existe';
      codigoError = 'PUBLICACION_DUPLICADA';
    }
    
    res.status(500).json({
      success: false,
      mensaje: mensajeUsuario,
      error_code: codigoError,
      error: error.message,
      detalle: error.detail,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 11. DIAGNÓSTICO DE BASE DE DATOS
// ===================================================
exports.diagnosticoDB = async (req, res) => {
  try {
    console.log('🔍 [diagnosticoDB] Haciendo diagnóstico de base de datos...');
    
    // 1. Verificar tablas relacionadas con foros
    const tablas = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('foro', 'publicacion', 'categoria', 'usuario', 'hilo')
      ORDER BY table_name
    `);
    
    // 2. Verificar estructura de foro
    const estructuraForo = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'foro'
      ORDER BY ordinal_position
    `);
    
    // 3. Datos de ejemplo
    const forosEjemplo = await db.query(`SELECT id, nombre, categoria_id, estado FROM foro LIMIT 5`);
    const hilosEjemplo = await db.query(`SELECT id, foro_id, titulo FROM hilo LIMIT 5`);
    const publicacionesEjemplo = await db.query(`SELECT id, hilo_id, autor_id FROM publicacion LIMIT 5`);

    const resultado = {
      timestamp: new Date().toISOString(),
      tablas_existentes: tablas.rows.map(t => t.table_name),
      estructura_foro: estructuraForo.rows,
      datos_ejemplo: {
        foros: forosEjemplo.rows,
        hilos: hilosEjemplo.rows,
        publicaciones: publicacionesEjemplo.rows
      },
      recomendaciones: []
    };
    
    console.log('✅ [diagnosticoDB] Diagnóstico completado');
    res.json({
      success: true,
      diagnostico: resultado
    });
    
  } catch (error) {
    console.error('❌ [diagnosticoDB] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error en diagnóstico', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 12. VERIFICAR ESTRUCTURA DB
// ===================================================
exports.verificarEstructuraDB = async (req, res) => {
  try {
    console.log('🔍 [verificarEstructuraDB] Verificando estructura de la base de datos...');
    
    // Tablas existentes
    const tablas = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Estructura de foro
    const estructuraForo = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'foro'
      ORDER BY ordinal_position
    `);
    
    // Estructura de hilo
    const estructuraHilo = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'hilo'
      ORDER BY ordinal_position
    `);
    
    // Datos de ejemplo
    const forosEjemplo = await db.query(`SELECT id, nombre FROM foro LIMIT 5`);
    const hilosEjemplo = await db.query(`SELECT id, foro_id, titulo FROM hilo LIMIT 5`);

    const resultado = {
      success: true,
      timestamp: new Date().toISOString(),
      tablas: tablas.rows.map(t => t.table_name),
      estructuras: {
        foro: estructuraForo.rows,
        hilo: estructuraHilo.rows
      },
      datos_ejemplo: {
        foros: forosEjemplo.rows,
        hilos: hilosEjemplo.rows
      }
    };
    
    console.log('✅ [verificarEstructuraDB] Verificación completada');
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ [verificarEstructuraDB] Error:', error);
    res.status(500).json({ 
      success: false,
      mensaje: 'Error verificando estructura', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 13. PRUEBA ENDPOINT
// ===================================================
exports.pruebaEndpoint = async (req, res) => {
  console.log('🧪 [pruebaEndpoint] Llamada a endpoint de prueba');
  
  res.json({
    success: true,
    mensaje: '✅ Endpoint de prueba funcionando correctamente',
    timestamp: new Date().toISOString(),
    request_info: {
      method: req.method,
      url: req.originalUrl,
      headers: {
        content_type: req.headers['content-type'],
        authorization_present: !!req.headers['authorization']
      }
    }
  });
};

// ===================================================
// 14. ACTUALIZAR FORO
// ===================================================
exports.actualizarForo = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      categoria_id, 
      estado 
    } = req.body;
    
    console.log(`📋 [actualizarForo] Actualizando foro ID: ${id}`);
    
    // Verificar que el foro existe
    const foroExiste = await db.query(
      'SELECT id, creado_por FROM foro WHERE id = $1',
      [id]
    );
    
    if (foroExiste.rows.length === 0) {
      console.log(`❌ [actualizarForo] Foro ${id} no encontrado`);
      return res.status(404).json({
        success: false,
        mensaje: 'Foro no encontrado'
      });
    }
    
    // Construir query dinámica
    const campos = [];
    const valores = [];
    let contador = 1;
    
    if (nombre !== undefined) {
      campos.push(`nombre = $${contador}`);
      valores.push(nombre);
      contador++;
    }
    
    if (descripcion !== undefined) {
      campos.push(`descripcion = $${contador}`);
      valores.push(descripcion);
      contador++;
    }
    
    if (categoria_id !== undefined) {
      // Verificar que la categoría existe
      const categoriaCheck = await db.query(
        'SELECT id FROM categoria WHERE id = $1',
        [categoria_id]
      );
      
      if (categoriaCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          mensaje: 'Categoría no existe'
        });
      }
      
      campos.push(`categoria_id = $${contador}`);
      valores.push(categoria_id);
      contador++;
    }
    
    if (estado !== undefined && ['activo', 'inactivo'].includes(estado)) {
      campos.push(`estado = $${contador}`);
      valores.push(estado);
      contador++;
    }
    
    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se proporcionaron campos para actualizar'
      });
    }
    
    // Agregar fecha de actualización
    campos.push('fecha_actualizacion = NOW()');
    
    // Agregar ID al final
    valores.push(id);
    
    const query = `
      UPDATE foro 
      SET ${campos.join(', ')}
      WHERE id = $${valores.length}
      RETURNING 
        id,
        nombre,
        descripcion,
        categoria_id,
        estado,
        fecha_actualizacion
    `;
    
    console.log('🔍 [actualizarForo] Query:', query);
    console.log('🔍 [actualizarForo] Valores:', valores);
    
    const result = await db.query(query, valores);
    
    console.log(`✅ [actualizarForo] Foro ${id} actualizado exitosamente`);
    
    res.json({
      success: true,
      mensaje: 'Foro actualizado exitosamente',
      foro: result.rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [actualizarForo] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar foro',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 15. ELIMINAR FORO (SOFT DELETE)
// ===================================================
exports.eliminarForo = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 [eliminarForo] Eliminando foro ID: ${id}`);
    
    // Verificar que el foro existe
    const foroExiste = await db.query(
      'SELECT id, nombre FROM foro WHERE id = $1',
      [id]
    );
    
    if (foroExiste.rows.length === 0) {
      console.log(`❌ [eliminarForo] Foro ${id} no encontrado`);
      return res.status(404).json({
        success: false,
        mensaje: 'Foro no encontrado'
      });
    }
    
    // Soft delete: cambiar estado a 'inactivo'
    await db.query(
      `UPDATE foro 
       SET estado = 'inactivo', fecha_actualizacion = NOW()
       WHERE id = $1`,
      [id]
    );
    
    console.log(`✅ [eliminarForo] Foro ${id} eliminado (soft delete)`);
    
    res.json({
      success: true,
      mensaje: 'Foro eliminado exitosamente',
      nota: 'El foro fue desactivado pero no eliminado permanentemente',
      foro_id: id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [eliminarForo] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar foro',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ===================================================
// 16. MÉTODO DE DEBUG PARA VER DATOS DEL FORO
// ===================================================
exports.debugForo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [debugForo] Debug foro ID: ${id}`);
    
    // Obtener datos completos del foro
    const foro = await db.query(`
      SELECT f.*, 
             c.nombre as categoria_nombre,
             u.nombre as autor_nombre,
             u.apellido_paterno as autor_apellido
      FROM foro f
      LEFT JOIN categoria c ON f.categoria_id = c.id
      LEFT JOIN usuario u ON f.creado_por = u.id
      WHERE f.id = $1
    `, [id]);
    
    if (foro.rows.length === 0) {
      return res.json({
        success: false,
        mensaje: 'Foro no encontrado'
      });
    }
    
    // Obtener hilos del foro
    const hilos = await db.query(
      'SELECT COUNT(*) as total FROM hilo WHERE foro_id = $1',
      [id]
    );
    
    // Obtener mensajes totales
    const mensajes = await db.query(`
      SELECT COUNT(*) as total 
      FROM publicacion p
      JOIN hilo h ON p.hilo_id = h.id
      WHERE h.foro_id = $1
    `, [id]);
    
    res.json({
      success: true,
      foro: foro.rows[0],
      total_hilos: parseInt(hilos.rows[0].total) || 0,
      total_mensajes: parseInt(mensajes.rows[0].total) || 0,
      columnas_foro: Object.keys(foro.rows[0]),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [debugForo] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error en debug',
      error: error.message
    });
  }
};

// ===================================================
// 17. OBTENER HILOS DEL FORO
// ===================================================
exports.obtenerHilosForo = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 [obtenerHilosForo] Foro ID: ${id}`);
    
    // Verificar que el foro existe
    const foroCheck = await db.query(
      'SELECT id, nombre FROM foro WHERE id = $1',
      [id]
    );
    
    if (foroCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Foro no encontrado'
      });
    }
    
    // Obtener hilos del foro
    const hilos = await db.query(`
      SELECT 
        h.id,
        h.titulo,
        h.slug,
        h.estado,
        h.es_fijado,
        h.es_cerrado,
        h.total_vistas,
        h.total_respuestas,
        h.fecha_creacion,
        h.fecha_actualizacion,
        u.nombre as autor_nombre,
        u.apellido_paterno as autor_apellido
      FROM hilo h
      LEFT JOIN usuario u ON h.autor_id = u.id
      WHERE h.foro_id = $1
      ORDER BY h.es_fijado DESC, h.fecha_actualizacion DESC
    `, [id]);
    
    res.json({
      success: true,
      foro: foroCheck.rows[0],
      hilos: hilos.rows,
      total: hilos.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [obtenerHilosForo] Error:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener hilos',
      error: error.message
    });
  }
};