import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { Spinner } from './components/ui'
import Home from './pages/Home'

// Lazy-loaded public pages
const Login          = lazy(() => import('./pages/Login'))
const Drivers        = lazy(() => import('./pages/Drivers'))
const DriverPage     = lazy(() => import('./pages/DriverPage'))
const Teams          = lazy(() => import('./pages/Teams'))
const TeamPage       = lazy(() => import('./pages/TeamPage'))
const Circuits       = lazy(() => import('./pages/Circuits'))
const CircuitPage    = lazy(() => import('./pages/CircuitPage'))
const Races          = lazy(() => import('./pages/Races'))
const RacePage       = lazy(() => import('./pages/RacePage'))
const Compare        = lazy(() => import('./pages/Compare'))
const Standings      = lazy(() => import('./pages/Standings'))
const Championships  = lazy(() => import('./pages/Championships'))
const SearchPage     = lazy(() => import('./pages/Search'))

// Lazy-loaded admin pages
const AdminLayout    = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminImport    = lazy(() => import('./pages/admin/AdminImport'))
const AdminDrivers   = lazy(() => import('./pages/admin/AdminDrivers'))
const AdminTeams     = lazy(() => import('./pages/admin/AdminTeams'))
const AdminCircuits  = lazy(() => import('./pages/admin/AdminCircuits'))
const AdminRaces     = lazy(() => import('./pages/admin/AdminRaces'))
const AdminPractice  = lazy(() => import('./pages/admin/AdminPractice'))
const AdminSync      = lazy(() => import('./pages/admin/AdminSync'))
const AdminMedia     = lazy(() => import('./pages/admin/AdminMedia'))

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="text-7xl font-black" style={{ color: 'var(--accent)', letterSpacing: '-0.05em' }}>404</div>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Page not found</h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary text-sm mt-2">Back to Home</Link>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner />
    </div>
  )
}

function StaticHostRedirector() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect')
    if (!redirect) return
    if (!redirect.startsWith('/')) return
    navigate(redirect, { replace: true })
  }, [location.search, navigate])

  return null
}

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />

      {/* Public */}
      <Route path="/" element={<Layout><Suspense fallback={<PageLoader />}><Home /></Suspense></Layout>} />
      <Route path="/drivers" element={<Layout><Suspense fallback={<PageLoader />}><Drivers /></Suspense></Layout>} />
      <Route path="/driver/:id" element={<Layout><Suspense fallback={<PageLoader />}><DriverPage /></Suspense></Layout>} />
      <Route path="/teams" element={<Layout><Suspense fallback={<PageLoader />}><Teams /></Suspense></Layout>} />
      <Route path="/team/:id" element={<Layout><Suspense fallback={<PageLoader />}><TeamPage /></Suspense></Layout>} />
      <Route path="/circuits" element={<Layout><Suspense fallback={<PageLoader />}><Circuits /></Suspense></Layout>} />
      <Route path="/circuit/:id" element={<Layout><Suspense fallback={<PageLoader />}><CircuitPage /></Suspense></Layout>} />
      <Route path="/races" element={<Layout><Suspense fallback={<PageLoader />}><Races /></Suspense></Layout>} />
      <Route path="/race/:id" element={<Layout><Suspense fallback={<PageLoader />}><RacePage /></Suspense></Layout>} />
      <Route path="/compare" element={<Layout><Suspense fallback={<PageLoader />}><Compare /></Suspense></Layout>} />
      <Route path="/standings" element={<Layout><Suspense fallback={<PageLoader />}><Standings /></Suspense></Layout>} />
      <Route path="/championships" element={<Layout><Suspense fallback={<PageLoader />}><Championships /></Suspense></Layout>} />
      <Route path="/search" element={<Layout><Suspense fallback={<PageLoader />}><SearchPage /></Suspense></Layout>} />

      {/* Admin */}
      <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminDashboard /></AdminLayout></Suspense>} />
      <Route path="/admin/import" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminImport /></AdminLayout></Suspense>} />
      <Route path="/admin/drivers" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminDrivers /></AdminLayout></Suspense>} />
      <Route path="/admin/teams" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminTeams /></AdminLayout></Suspense>} />
      <Route path="/admin/circuits" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminCircuits /></AdminLayout></Suspense>} />
      <Route path="/admin/races" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminRaces /></AdminLayout></Suspense>} />
      <Route path="/admin/practice" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminPractice /></AdminLayout></Suspense>} />
      <Route path="/admin/sync" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminSync /></AdminLayout></Suspense>} />
      <Route path="/admin/media" element={<Suspense fallback={<PageLoader />}><AdminLayout><AdminMedia /></AdminLayout></Suspense>} />

      {/* 404 */}
      <Route path="*" element={<Layout><NotFound /></Layout>} />
    </Routes>
  )
}

export default function App() {
  const { init } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    const wake = () => {
      init()
      queryClient.invalidateQueries({ refetchType: 'active' }).catch(() => {})
    }

    const sleep = () => {
      queryClient.cancelQueries({ type: 'active' }).catch(() => {})
    }

    // Initial load
    wake()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') wake()
      else sleep()
    }

    // focus/visibility are not always fired on BFCache restore (notably Safari),
    // but pageshow reliably is.
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pageshow', wake)
    window.addEventListener('online', wake)
    window.addEventListener('pagehide', sleep)

    return () => {
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pageshow', wake)
      window.removeEventListener('online', wake)
      window.removeEventListener('pagehide', sleep)
    }
  }, [init, queryClient])

  // Warm up route chunks so navigation feels instant.
  useEffect(() => {
    const warm = () => {
      Promise.allSettled([
        import('./pages/Drivers'),
        import('./pages/Teams'),
        import('./pages/Races'),
        import('./pages/Standings'),
        import('./pages/Championships'),
        import('./pages/Compare'),
        import('./pages/Search'),
        import('./pages/admin/AdminLayout'),
        import('./pages/admin/AdminDashboard'),
      ]).catch(() => {})
    }

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }

    const t = setTimeout(warm, 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <StaticHostRedirector />
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
