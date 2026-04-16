import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

import BusinessPage from '@/pages/public/BusinessPage'
import BookingPage from '@/pages/public/BookingPage'
import ConfirmationPage from '@/pages/public/ConfirmationPage'
import LoginPage from '@/pages/panel/LoginPage'
import RegisterPage from '@/pages/panel/RegisterPage'
import StaffLoginPage from '@/pages/panel/StaffLoginPage'
import NoAccessPage from '@/pages/panel/NoAccessPage'
import DashboardPage from '@/pages/panel/DashboardPage'
import SettingsPage from '@/pages/panel/SettingsPage'
import CajaPage from '@/pages/panel/CajaPage'

export default function App() {
  return (
    // AuthProvider envuelve todo: mantiene el JWT en React state
    // y expone role/isOwner/isEmployee a toda la app sin pasar props manualmente.
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            {/* ── Públicas ─────────────────────────────────────────────────── */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/staff-login" element={<StaffLoginPage />} />
            <Route path="/sin-acceso" element={<NoAccessPage />} />

            {/* ── Rutas de cliente público ──────────────────────────────────── */}
            <Route path="/p/:slug" element={<BusinessPage />} />
            <Route path="/p/:slug/reservar" element={<BookingPage />} />
            <Route path="/turno/:id" element={<ConfirmationPage />} />

            {/* ── Panel: cualquier usuario autenticado ──────────────────────── */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/dashboard/caja" element={
              <ProtectedRoute><CajaPage /></ProtectedRoute>
            } />

            <Route path="/dashboard/configuracion" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  )
}