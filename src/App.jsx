import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'

import Home from './pages/Home'
import Login from './pages/Login'
import Drivers from './pages/Drivers'
import DriverPage from './pages/DriverPage'
import Teams from './pages/Teams'
import TeamPage from './pages/TeamPage'
import Circuits from './pages/Circuits'
import CircuitPage from './pages/CircuitPage'
import Races from './pages/Races'
import RacePage from './pages/RacePage'
import Compare from './pages/Compare'
import SearchPage from './pages/Search'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminImport from './pages/admin/AdminImport'
import AdminDrivers from './pages/admin/AdminDrivers'
import AdminTeams from './pages/admin/AdminTeams'
import AdminCircuits from './pages/admin/AdminCircuits'
import AdminRaces from './pages/admin/AdminRaces'
import AdminSync from './pages/admin/AdminSync'

function PublicRoute({ children }) {
  return <Layout>{children}</Layout>
}

function AdminRoute({ children }) {
  return <AdminLayout>{children}</AdminLayout>
}

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Public routes */}
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        <Route path="/drivers" element={<PublicRoute><Drivers /></PublicRoute>} />
        <Route path="/driver/:id" element={<PublicRoute><DriverPage /></PublicRoute>} />
        <Route path="/teams" element={<PublicRoute><Teams /></PublicRoute>} />
        <Route path="/team/:id" element={<PublicRoute><TeamPage /></PublicRoute>} />
        <Route path="/circuits" element={<PublicRoute><Circuits /></PublicRoute>} />
        <Route path="/circuit/:id" element={<PublicRoute><CircuitPage /></PublicRoute>} />
        <Route path="/races" element={<PublicRoute><Races /></PublicRoute>} />
        <Route path="/race/:id" element={<PublicRoute><RacePage /></PublicRoute>} />
        <Route path="/compare" element={<PublicRoute><Compare /></PublicRoute>} />
        <Route path="/search" element={<PublicRoute><SearchPage /></PublicRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/import" element={<AdminRoute><AdminImport /></AdminRoute>} />
        <Route path="/admin/drivers" element={<AdminRoute><AdminDrivers /></AdminRoute>} />
        <Route path="/admin/teams" element={<AdminRoute><AdminTeams /></AdminRoute>} />
        <Route path="/admin/circuits" element={<AdminRoute><AdminCircuits /></AdminRoute>} />
        <Route path="/admin/races" element={<AdminRoute><AdminRaces /></AdminRoute>} />
        <Route path="/admin/sync" element={<AdminRoute><AdminSync /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
