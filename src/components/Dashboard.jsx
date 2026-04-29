import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SauceTab from './tabs/SauceTab'
import OrderTab from './tabs/OrderTab'
import ConnectTab from './tabs/ConnectTab'
import StatsTab from './tabs/StatsTab'

const TABS = [
  { id: 'sauce',   label: 'The Sauce', icon: '🔥' },
  { id: 'order',   label: 'Order',     icon: '💰' },
  { id: 'connect', label: 'Connect',   icon: '🤝' },
  { id: 'stats',   label: 'My Stats',  icon: '📊' },
]

export default function Dashboard({ staff, onLogout }) {
  const [tab, setTab] = useState('sauce')
  const [orders, setOrders] = useState([])
  const [leads, setLeads] = useState([])

  const handleOrderSaved = (order) => setOrders(prev => [...prev, order])
  const handleLeadSaved = (lead) => setLeads(prev => [...prev, lead])

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      background: '#0A0A0A', overflow: 'hidden',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 12px',
        background: 'rgba(10,10,10,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
      }}>
        <div>
          <img src="/hi-logo.png" alt="Hi!" style={{ height: 32, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#27C96A', boxShadow: '0 0 8px #27C96A' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{staff.name}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 2 }}>· Booth 1107</span>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {tab === 'sauce'   && <SauceTab />}
            {tab === 'order'   && <OrderTab staff={staff} onOrderSaved={handleOrderSaved} />}
            {tab === 'connect' && <ConnectTab staff={staff} onLeadSaved={handleLeadSaved} />}
            {tab === 'stats'   && <StatsTab staff={staff} orders={orders} leads={leads} onLogout={onLogout} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM TAB BAR ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        background: 'rgba(10,10,10,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                padding: '10px 0 12px',
                background: 'none', border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {/* Active indicator pill */}
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: 'absolute', top: 0, left: '20%', right: '20%',
                    height: 2, borderRadius: 2, background: '#E8341C',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span style={{ fontSize: 19 }}>{t.icon}</span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: active ? '#E8341C' : 'rgba(255,255,255,0.28)',
                transition: 'color 0.2s',
              }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}