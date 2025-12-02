const API_URL = 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.baseUrl = API_URL;
    this.token = localStorage.getItem('token');
    console.log('🔧 ApiService inicializado');
  }

  getToken() {
    const token = localStorage.getItem('token');
    console.log('🔑 Token obtenido de localStorage:', token ? 'PRESENTE' : 'AUSENTE');
    if (token) {
      console.log('🔑 Token preview:', token.substring(0, 30) + '...');
      console.log('🔑 Token length:', token.length);
    }
    return token;
  }

  async request(endpoint, method = 'GET', body = null, headers = {}) {
    // Obtener token FRESCO cada vez
    const token = this.getToken();
    
    console.log('🎯 ========== [API REQUEST] ==========');
    console.log('🔗 Endpoint:', endpoint);
    console.log('📡 Método:', method);
    console.log('🔑 Token presente:', token ? '✅ SÍ' : '❌ NO');
    
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...headers
      },
      credentials: 'include'
    };
    
    // Manejo del body
    if (method !== 'GET' && body !== null) {
      requestOptions.body = JSON.stringify(body);
      console.log('📦 Body a enviar:', requestOptions.body);
    }
    
    console.log('🔍 URL completa:', fullUrl);
    console.log('🔍 Headers:', requestOptions.headers);
    
    try {
      console.log('🚀 Enviando request...');
      const response = await fetch(fullUrl, requestOptions);
      
      console.log('📨 Response status:', response.status, response.statusText);
      
      // Si es error 401/403, limpiar sesión
      if (response.status === 401 || response.status === 403) {
        console.log('❌ Error de autenticación/permisos, limpiando sesión...');
        this.limpiarSesion();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Error ${response.status}: ${response.statusText}`);
      }
      
      // Si es error 404, dar información más específica
      if (response.status === 404) {
        console.log('❌ Ruta no encontrada (404)');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Ruta no encontrada: ${endpoint}`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensaje || data.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      console.log('✅ Request exitoso');
      console.log('📊 Respuesta:', data);
      
      return data;
      
    } catch (error) {
      console.error('❌ Error en la petición:', error.message);
      
      // Manejo específico de errores
      if (error.message.includes('404') || error.message.includes('Ruta no encontrada')) {
        console.log('🔍 DEBUG para error 404:');
        console.log('1. Verifica que la ruta esté definida en routes/foros.js');
        console.log('2. Verifica que el método sea correcto (POST para crear mensajes)');
        console.log('3. Reinicia el servidor Node.js');
      }
      
      // Si es error de autenticación, redirigir a login
      if (error.message.includes('expirado') || 
          error.message.includes('401') || 
          error.message.includes('403') ||
          error.message.includes('Token')) {
        console.log('🔄 Redirigiendo a login por error de autenticación...');
        this.redirigirALogin();
      }
      
      throw error;
    } finally {
      console.log('🎯 ========== [FIN REQUEST] ==========\n');
    }
  }

  tokenExpirado(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('❌ Token no tiene formato JWT válido');
        return true;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const expiraEn = payload.exp * 1000;
      const ahora = Date.now();
      const minutosRestantes = (expiraEn - ahora) / 60000;
      
      console.log('⏰ Token expira en:', new Date(expiraEn).toLocaleString());
      console.log('⏰ Tiempo restante (min):', minutosRestantes.toFixed(2));
      
      return expiraEn - ahora < 60000;
    } catch (error) {
      console.log('❌ Error verificando token:', error);
      return true;
    }
  }

  async login(email, password) {
    console.log('🔐 Intentando login para:', email);
    
    const result = await this.request('/auth/login', 'POST', { 
      correo: email, 
      contrasena: password 
    });
    
    if (result.token) {
      this.token = result.token;
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.usuario));
      console.log('✅ Login exitoso, token guardado');
      console.log('👤 Usuario:', result.usuario);
    } else {
      console.log('❌ Login falló, no hay token en respuesta');
    }
    
    return result;
  }

  logout() {
    this.limpiarSesion();
    console.log('✅ Sesión cerrada');
  }

  limpiarSesion() {
    console.log('🧹 Limpiando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
  }

  redirigirALogin() {
    console.log('🔄 Redirigiendo a login...');
    setTimeout(() => {
      if (window.location.pathname !== '/login.html') {
        window.location.href = '/login.html';
      }
    }, 1000);
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      return false;
    }
    
    if (this.tokenExpirado(token)) {
      console.log('⚠️ Token expirado en isAuthenticated()');
      this.limpiarSesion();
      return false;
    }
    
    return true;
  }

  getUserData() {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('👤 Datos de usuario obtenidos:', userData);
      return userData;
    } catch (error) {
      console.error('❌ Error obteniendo datos de usuario:', error);
      return {};
    }
  }
  
  getTokenInfo() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        payload: payload,
        expira: new Date(payload.exp * 1000),
        usuario_id: payload.id,
        email: payload.email,
        rol: payload.rol,
        tiempoRestante: Math.floor((payload.exp * 1000 - Date.now()) / 60000)
      };
    } catch (error) {
      console.error('❌ Error obteniendo info del token:', error);
      return null;
    }
  }

  async testAuth() {
    console.log('🧪 Probando autenticación...');
    try {
      const result = await this.request('/foros/test-auth');
      console.log('✅ Test de autenticación exitoso:', result);
      return result;
    } catch (error) {
      console.error('❌ Test de autenticación falló:', error);
      throw error;
    }
  }

  // Método específico para publicar mensajes
  async publicarMensaje(foroId, contenido) {
    console.log('📤 Publicando mensaje para foro ID:', foroId);
    
    try {
      // Primero intentar con ruta principal
      const resultado = await this.request(`/foros/${foroId}/mensaje`, 'POST', {
        mensaje: contenido
      });
      
      return resultado;
    } catch (error) {
      console.log('🔄 Intentando ruta alternativa...');
      
      // Si falla, intentar con ruta alternativa
      try {
        const resultado = await this.request(`/foros/foro/${foroId}/mensaje`, 'POST', {
          mensaje: contenido
        });
        
        return resultado;
      } catch (error2) {
        console.error('❌ Ambas rutas fallaron:', error2.message);
        throw new Error(`No se pudo publicar el mensaje: ${error2.message}`);
      }
    }
  }

  // Método específico para obtener mensajes
  async obtenerMensajes(foroId) {
    console.log('📥 Obteniendo mensajes para foro ID:', foroId);
    
    try {
      // Primero intentar con ruta principal
      const resultado = await this.request(`/foros/${foroId}/mensajes`, 'GET');
      
      return resultado;
    } catch (error) {
      console.log('🔄 Intentando ruta alternativa...');
      
      // Si falla, intentar con ruta alternativa
      try {
        const resultado = await this.request(`/foros/foro/${foroId}/mensajes`, 'GET');
        
        return resultado;
      } catch (error2) {
        console.error('❌ Ambas rutas fallaron:', error2.message);
        throw new Error(`No se pudieron obtener mensajes: ${error2.message}`);
      }
    }
  }
}

// Crear instancia global
const api = new ApiService();