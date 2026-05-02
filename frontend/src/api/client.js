import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // Permitir que las cookies viajen en las peticiones
})

// Cola para manejar múltiples peticiones fallidas mientras se refresca el token
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// ── Mock mode: respuestas vacías para todas las rutas cuando hay token mock ──
const MOCK_RESPONSES = {
  '/services':             { data: [] },
  '/clientes':             { data: [] },
  '/availability':         { data: [] },
  '/incidencias':          { data: [] },
  '/notifications':        { data: [] },
  '/staff':                { data: { staff: [] } },
  '/settings':             { data: { cancellation_policy: '', anticipation_margin: 30, buffer_time: 10, whatsapp_enabled: false, commission_rate: 0, expense_categories: [] } },
  '/admin/auth/google/status': { data: { linked: false, updated_at: null } },
  '/appointments':         { data: [] },
  '/appointments/blocked-dates': { data: [] },
  '/sales':                { data: [] },
  '/expenses':             { data: [] },
  '/finances/summary':     { data: { total_income: 0, total_expenses: 0, net: 0, appointments_count: 0 } },
  '/finances/session':     { data: { session: null } },
  '/auth/profiles':        { data: [{ id: 'owner', name: 'Dueño (Mock)', role: 'owner' }] },
}

function getMockResponse(url) {
  // Busca coincidencia exacta primero, luego por prefijo
  if (MOCK_RESPONSES[url]) return MOCK_RESPONSES[url]
  const match = Object.keys(MOCK_RESPONSES).find(k => url.startsWith(k))
  return match ? MOCK_RESPONSES[match] : { data: [] }
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // En modo mock, cortocircuitar la petición y devolver datos vacíos directamente
  if (token && token.startsWith('mock.')) {
    const relativeUrl = config.url?.replace(config.baseURL || '', '') || config.url || ''
    const mockData = getMockResponse(relativeUrl)
    // Axios permite cancelar una request retornando un objeto con adapter custom
    config.adapter = () => Promise.resolve({
      data: mockData.data,
      status: 200,
      statusText: 'OK (Mock)',
      headers: {},
      config,
    })
  }

  return config
})


// Interceptor de respuesta para manejar 401 y refrescar token
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // En modo mock, no intentar refrescar — simplemente rechazar sin tocar la sesión
      const currentToken = localStorage.getItem('token')
      if (currentToken && currentToken.startsWith('mock.')) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${client.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newToken = data.token
        localStorage.setItem('token', newToken)
        
        processQueue(null, newToken)
        isRefreshing = false

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        
        localStorage.removeItem('token')
        localStorage.removeItem('business')
        
        if (!['/login', '/register'].some(p => window.location.pathname.startsWith(p))) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default client