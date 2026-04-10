import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

import BusinessPage from '@/pages/public/BusinessPage'
import BookingPage from '@/pages/public/BookingPage'
import ConfirmationPage from '@/pages/public/ConfirmationPage'
import LoginPage from '@/pages/panel/LoginPage'
import RegisterPage from '@/pages/panel/RegisterPage'
import DashboardPage from '@/pages/panel/DashboardPage'
import ServicesPage from '@/pages/panel/ServicesPage'
import AvailabilityPage from '@/pages/panel/AvailabilityPage'
import SettingsPage from '@/pages/panel/SettingsPage'

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <BrowserRouter>
        <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/p/:slug" element={<BusinessPage />} />
        <Route path="/p/:slug/reservar" element={<BookingPage />} />
        <Route path="/turno/:id" element={<ConfirmationPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/servicios" element={
          <ProtectedRoute><ServicesPage /></ProtectedRoute>
        } />
        <Route path="/disponibilidad" element={
          <ProtectedRoute><AvailabilityPage /></ProtectedRoute>
        } />
        <Route path="/dashboard/configuracion" element={
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        } />
      </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )
}