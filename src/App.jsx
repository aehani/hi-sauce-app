import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'

export default function App() {
  const [session, setSession] = useState(null)

  return (
    <div className="h-screen w-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {!session ? (
          <LoginPage key="login" onLogin={(staff) => setSession({ staff })} />
        ) : session.staff.isAdmin ? (
          <AdminDashboard key="admin" admin={session.staff} onLogout={() => setSession(null)} />
        ) : (
          <Dashboard key="dashboard" staff={session.staff} onLogout={() => setSession(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}