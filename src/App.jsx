import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)

  return (
    <div className="h-screen w-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {!session ? (
          <LoginPage key="login" onLogin={(staff) => setSession({ staff })} />
        ) : (
          <Dashboard key="dashboard" staff={session.staff} onLogout={() => setSession(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
