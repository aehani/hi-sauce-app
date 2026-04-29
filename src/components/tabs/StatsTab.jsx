import { motion } from 'framer-motion'

const fmt = (n) => `$${n.toFixed(2)}`

function StatCard({ label, value, sub, color = '#E8341C', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: '18px 16px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{sub}</p>}
    </motion.div>
  )
}

export default function StatsTab({ staff, orders, leads, onLogout }) {
  const myOrders = orders.filter(o => o.staff === staff.name)
  const myLeads = leads.filter(l => l.staff === staff.name)
  const totalRevenue = myOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
  const avgOrder = myOrders.length > 0 ? totalRevenue / myOrders.length : 0

  const allOrders = orders
  const allRevenue = allOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)

  const topFlavors = {}
  myOrders.forEach(o => {
    o.items?.forEach(item => {
      const key = item.sauce?.name || item.name || 'Unknown'
      topFlavors[key] = (topFlavors[key] || 0) + (item.qty || 0)
    })
  })
  const topFlavor = Object.entries(topFlavors).sort((a,b) => b[1]-a[1])[0]

  return (
    <div style={{ background: '#0A0A0A', height: '100%', overflowY: 'auto', padding: '20px 16px 40px', position: 'relative' }}>

      {/* Glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 200,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(232,52,28,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em' }}>MY SESSION</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            {staff.name}'s Stats
          </h2>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(232,52,28,0.15)', border: '1px solid rgba(232,52,28,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#E8341C',
        }}>
          {staff.name[0]}
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 24, letterSpacing: '0.06em' }}>
        Booth 1107 · Champs Las Vegas
      </p>

      {/* My stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <StatCard label="MY ORDERS" value={myOrders.length} sub="this session" color="#E8341C" delay={0.05} />
        <StatCard label="MY LEADS" value={myLeads.length} sub="contacts saved" color="#27C96A" delay={0.1} />
        <StatCard label="MY REVENUE" value={fmt(totalRevenue)} sub="wholesale total" color="#E8341C" delay={0.15} />
        <StatCard label="AVG ORDER" value={myOrders.length > 0 ? fmt(avgOrder) : '—'} sub="per transaction" color="rgba(255,255,255,0.7)" delay={0.2} />
      </div>

      {topFlavor && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            padding: '16px 18px', borderRadius: 16, marginBottom: 22,
            background: 'rgba(232,52,28,0.08)', border: '1px solid rgba(232,52,28,0.2)',
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(232,52,28,0.6)', letterSpacing: '0.14em', marginBottom: 4 }}>TOP FLAVOR SOLD</p>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {topFlavor[0]} <span style={{ color: '#E8341C' }}>×{topFlavor[1]}</span>
          </p>
        </motion.div>
      )}

      {/* Booth totals */}
      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', marginBottom: 12 }}>BOOTH TOTALS (ALL STAFF)</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'ORDERS', value: allOrders.length, color: '#E8341C' },
          { label: 'LEADS', value: leads.length, color: '#27C96A' },
          { label: 'REVENUE', value: fmt(allRevenue), color: 'rgba(255,255,255,0.7)' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            style={{ padding: '14px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}
          >
            <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent orders list */}
      {myOrders.length > 0 && (
        <>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', marginBottom: 12 }}>MY RECENT ORDERS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {myOrders.slice(-5).reverse().map((o, i) => (
              <div key={i} style={{
                padding: '13px 16px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{o.buyer?.store || 'Unknown store'}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {o.payMethod === 'charge' ? '💳 Charged' : '📧 Invoice'} · {new Date(o.timestamp).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#E8341C' }}>{fmt(o.subtotal)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sign out */}
      <button
        onClick={onLogout}
        style={{
          width: '100%', padding: '14px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 13, color: 'rgba(255,255,255,0.4)',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Syne, sans-serif', letterSpacing: '0.06em',
        }}
      >
        SIGN OUT
      </button>
    </div>
  )
}