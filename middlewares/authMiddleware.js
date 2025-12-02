// middlewares/authMiddleware.js COMPLETO
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🔐 JWT_SECRET cargado:', process.env.JWT_SECRET ? '✅ SÍ' : '❌ NO');
if (process.env.JWT_SECRET) {
  console.log('🔐 Longitud JWT_SECRET:', process.env.JWT_SECRET.length);
}

// ===================================================
// 1. VERIFICAR TOKEN (MEJORADO)
// ===================================================
exports.verificarToken = (req, res, next) => {
    console.log('\n🔐 ========== [MIDDLEWARE verificarToken] ==========');
    console.log('📋 URL:', req.originalUrl);
    console.log('📋 Método:', req.method);
    console.log('📋 Headers authorization:', req.headers['authorization'] ? 'PRESENTE' : 'AUSENTE');
    
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        console.log('❌ ERROR: No hay header Authorization');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Acceso no autorizado. Token no proporcionado.',
            error_code: 'NO_TOKEN',
            debug: {
                endpoint: req.originalUrl,
                metodo: req.method
            }
        });
    }

    console.log('🔍 Authorization header completo:', authHeader);
    
    // Verificar formato "Bearer token"
    if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ ERROR: Formato incorrecto. Debe ser "Bearer {token}"');
        console.log('🔍 Recibido:', authHeader.substring(0, 50));
        return res.status(401).json({ 
            success: false,
            mensaje: 'Formato de token inválido. Debe ser: Bearer {token}',
            error_code: 'INVALID_TOKEN_FORMAT',
            formato_recibido: authHeader.substring(0, 50) + '...'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        console.log('❌ ERROR: Token vacío después de "Bearer"');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Token inválido o ausente',
            error_code: 'EMPTY_TOKEN'
        });
    }

    console.log('✅ Token recibido, longitud:', token.length);
    console.log('🔍 Token (primeros 50 chars):', token.substring(0, 50) + '...');
    
    try {
        // Verificar el token
        console.log('🔍 Verificando token con JWT_SECRET...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // DEBUG: Mostrar datos decodificados
        console.log('🔍 Token decodificado COMPLETO:', decoded);
        
        // Compatibilidad: manejar tanto 'rol' como 'rol_id'
        if (decoded.rol_id && !decoded.rol) {
            console.log('⚠️  Token tiene rol_id pero no rol. Ajustando...');
            decoded.rol = decoded.rol_id;
        }
        
        if (!decoded.rol && decoded.rol_id) {
            console.log('⚠️  Token no tiene rol. Usando rol_id como fallback...');
            decoded.rol = decoded.rol_id;
        }
        
        console.log('✅ Token válido');
        console.log('👤 Usuario decodificado:', {
            id: decoded.id,
            email: decoded.email,
            rol: decoded.rol,  // Ahora siempre debería estar definido
            nombre: decoded.nombre,
            exp: new Date(decoded.exp * 1000).toLocaleString()
        });
        
        req.user = decoded;
        next();
        
    } catch (error) {
        console.error('❌ ERROR validando token:', error.message);
        console.error('❌ Tipo de error:', error.name);
        
        let mensaje = 'Token inválido';
        let status = 403;
        let errorCode = 'INVALID_TOKEN';
        
        if (error.name === 'TokenExpiredError') {
            mensaje = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            status = 401;
            errorCode = 'TOKEN_EXPIRED';
            console.log('⏰ Token expirado en:', error.expiredAt);
        } else if (error.name === 'JsonWebTokenError') {
            mensaje = 'Token inválido o mal formado';
            errorCode = 'MALFORMED_TOKEN';
        }
        
        return res.status(status).json({ 
            success: false,
            mensaje: mensaje,
            error: error.message,
            error_code: errorCode,
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
    
    console.log('🔐 ========== [FIN MIDDLEWARE] ==========\n');
};

// ===================================================
// 2. SOLO ADMINISTRADOR (MEJORADO)
// ===================================================
exports.soloAdmin = (req, res, next) => {
    console.log('👑 [MIDDLEWARE soloAdmin] Verificando rol admin...');
    console.log('👤 Usuario actual:', req.user);
    
    if (!req.user) {
        console.log('❌ No hay usuario en la request');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Usuario no autenticado',
            error_code: 'USER_NOT_AUTHENTICATED'
        });
    }
    
    // Obtener rol (compatibilidad con 'rol' o 'rol_id')
    const userRol = req.user.rol || req.user.rol_id;
    
    if (!userRol) {
        console.log('❌ Usuario no tiene rol definido en el token');
        console.log('🔍 Token completo:', req.user);
        return res.status(403).json({ 
            success: false,
            mensaje: 'Usuario no tiene rol definido',
            error_code: 'NO_ROLE_DEFINED',
            usuario: {
                id: req.user.id,
                email: req.user.email,
                tiene_rol: !!req.user.rol,
                tiene_rol_id: !!req.user.rol_id
            }
        });
    }
    
    // Si rol = 1 => administrador
    if (userRol !== 1) { 
        console.log('❌ Usuario no es admin. Rol:', userRol);
        console.log('🔍 Tipo de rol:', typeof userRol);
        return res.status(403).json({ 
            success: false,
            mensaje: 'Acceso denegado: solo administradores',
            usuario_actual: {
                id: req.user.id,
                email: req.user.email,
                rol: userRol,
                tipo_rol: typeof userRol
            },
            error_code: 'NOT_ADMIN'
        });
    }
    
    console.log('✅ Usuario es administrador (rol:', userRol, ')');
    next();
};

// ===================================================
// 3. ADMIN O PROFESOR (MEJORADO)
// ===================================================
exports.adminOProfesor = (req, res, next) => {
    console.log('🎓 [MIDDLEWARE adminOProfesor] Verificando rol admin/profesor...');
    console.log('👤 Usuario actual:', req.user);
    
    if (!req.user) {
        console.log('❌ No hay usuario en la request');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Usuario no autenticado',
            error_code: 'USER_NOT_AUTHENTICATED'
        });
    }
    
    // Obtener rol (compatibilidad con 'rol' o 'rol_id')
    const userRol = req.user.rol || req.user.rol_id;
    
    if (!userRol) {
        console.log('❌ Usuario no tiene rol definido en el token');
        console.log('🔍 Token completo:', req.user);
        return res.status(403).json({ 
            success: false,
            mensaje: 'Usuario no tiene rol definido',
            error_code: 'NO_ROLE_DEFINED',
            usuario: {
                id: req.user.id,
                email: req.user.email,
                tiene_rol: !!req.user.rol,
                tiene_rol_id: !!req.user.rol_id
            }
        });
    }
    
    // Convertir a número si es string
    const rolNumerico = typeof userRol === 'string' ? parseInt(userRol) : userRol;
    
    // rol = 1 => administrador, rol = 2 => profesor
    if (rolNumerico === 1 || rolNumerico === 2) { 
        console.log('✅ Usuario tiene permisos (rol:', rolNumerico, ')');
        return next();
    }
    
    console.log('❌ Usuario no tiene permisos. Rol:', rolNumerico, '(tipo:', typeof rolNumerico, ')');
    return res.status(403).json({ 
        success: false,
        mensaje: 'Acceso denegado: se requiere rol profesor o admin',
        usuario_actual: {
            id: req.user.id,
            email: req.user.email,
            rol: rolNumerico,
            tipo_rol: typeof rolNumerico
        },
        error_code: 'NOT_ADMIN_OR_PROFESSOR',
        roles_permitidos: [1, 2]
    });
};

// ===================================================
// 4. SOLO ESTUDIANTE
// ===================================================
exports.soloEstudiante = (req, res, next) => {
    console.log('🎓 [MIDDLEWARE soloEstudiante] Verificando rol estudiante...');
    
    if (!req.user) {
        console.log('❌ No hay usuario en la request');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Usuario no autenticado'
        });
    }
    
    // Obtener rol (compatibilidad con 'rol' o 'rol_id')
    const userRol = req.user.rol || req.user.rol_id;
    
    if (!userRol) {
        console.log('❌ Usuario no tiene rol definido');
        return res.status(403).json({ 
            success: false,
            mensaje: 'Usuario no tiene rol definido'
        });
    }
    
    // rol = 3 => estudiante
    const rolNumerico = typeof userRol === 'string' ? parseInt(userRol) : userRol;
    
    if (rolNumerico === 3) { 
        console.log('✅ Usuario es estudiante (rol:', rolNumerico, ')');
        return next();
    }
    
    console.log('❌ Usuario no es estudiante. Rol:', rolNumerico);
    return res.status(403).json({ 
        success: false,
        mensaje: 'Acceso denegado: solo estudiantes',
        usuario_actual: {
            id: req.user.id,
            email: req.user.email,
            rol: rolNumerico
        }
    });
};

// ===================================================
// 5. CUALQUIER USUARIO AUTENTICADO
// ===================================================
exports.cualquierAutenticado = (req, res, next) => {
    console.log('👤 [MIDDLEWARE cualquierAutenticado] Verificando autenticación básica...');
    
    if (!req.user) {
        console.log('❌ No hay usuario en la request');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Usuario no autenticado'
        });
    }
    
    console.log('✅ Usuario autenticado:', req.user.email);
    next();
};

// ===================================================
// 6. VERIFICAR QUE EL USUARIO ES EL MISMO O ADMIN
// ===================================================
exports.mismoUsuarioOAdmin = (req, res, next) => {
    console.log('🔍 [MIDDLEWARE mismoUsuarioOAdmin] Verificando permisos...');
    
    if (!req.user) {
        console.log('❌ No hay usuario en la request');
        return res.status(401).json({ 
            success: false,
            mensaje: 'Usuario no autenticado'
        });
    }
    
    const userId = parseInt(req.params.id);
    const currentUserRol = req.user.rol || req.user.rol_id;
    
    // Convertir a número si es necesario
    const rolNumerico = typeof currentUserRol === 'string' ? parseInt(currentUserRol) : currentUserRol;
    
    // Si es administrador (rol 1) o es el mismo usuario
    if (rolNumerico === 1 || req.user.id === userId) {
        console.log('✅ Permiso concedido. Es admin o el mismo usuario');
        return next();
    }
    
    console.log('❌ Acceso denegado. No es admin ni el mismo usuario');
    return res.status(403).json({ 
        success: false,
        mensaje: 'Acceso denegado: solo el propio usuario o administradores',
        usuario_actual: {
            id: req.user.id,
            rol: rolNumerico
        },
        usuario_solicitado: userId
    });
};