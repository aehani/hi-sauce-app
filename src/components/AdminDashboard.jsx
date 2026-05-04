import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STAFF } from '../config/staff'

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const STATUS_COLORS = {
  paid:             { bg: 'rgba(39,201,106,0.15)',  border: 'rgba(39,201,106,0.4)',  text: '#27C96A' },
  awaiting_payment: { bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.4)',  text: '#FBBF24' },
  pending:          { bg: 'rgba(59,130,246,0.15)',   border: 'rgba(59,130,246,0.4)',  text: '#3B82F6' },
  failed:           { bg: 'rgba(232,52,28,0.15)',    border: 'rgba(232,52,28,0.4)',   text: '#E8341C' },
}

const lbl = { fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'Work Sans, sans-serif' }
const card = { background: 'rgba(18,18,18,0.95)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '20px 22px' }

// ── EDIT ORDER MODAL ──────────────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSaved }) {
  const [status, setStatus]   = useState(order.payment_status || 'pending')
  const [notes, setNotes]     = useState(order.notes || '')
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('orders').update({ payment_status: status, notes }).eq('id', order.id)
    if (!error) { onSaved(); onClose() }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'Impact, sans-serif', fontSize: 22, color: '#fff', letterSpacing: '0.04em', margin: '0 0 4px' }}>{order.store_name}</h3>
            <p style={{ ...lbl, margin: 0 }}>{order.order_id}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ ...lbl, marginBottom: 8 }}>Order Items</p>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Work Sans, sans-serif' }}>
              <span>{item.name} {item.type} × {item.qty}</span>
              <span style={{ color: '#fff' }}>{fmt(item.price * item.qty)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ ...lbl }}>Total</span>
            <span style={{ fontFamily: 'Impact, sans-serif', fontSize: 18, color: '#E8341C' }}>{fmt(order.subtotal)}</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ ...lbl, marginBottom: 8 }}>Payment Status</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['pending', 'awaiting_payment', 'paid', 'failed'].map(s => {
              const c = STATUS_COLORS[s]
              return (
                <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', background: status === s ? c.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${status === s ? c.border : 'rgba(255,255,255,0.08)'}`, color: status === s ? c.text : 'rgba(255,255,255,0.3)' }}>
                  {s.replace('_', ' ')}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ ...lbl, marginBottom: 8 }}>Notes</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add internal notes..." rows={3}
            style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 13, fontFamily: 'Work Sans, sans-serif', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: 13, background: '#E8341C', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'Impact, sans-serif', letterSpacing: '0.06em', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ADMIN DASHBOARD ──────────────────────────────────────────────────
export default function AdminDashboard({ admin, onLogout }) {
  const [tab, setTab]           = useState('overview')
  const [orders, setOrders]     = useState([])
  const [leads, setLeads]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [editOrder, setEditOrder] = useState(null)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadData = async () => {
    setLoading(true)
    const [{ data: ordersData }, { data: leadsData }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    setOrders(ordersData || [])
    setLeads(leadsData || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // ── COMPUTED STATS ────────────────────────────────────────────────────────
  const totalRevenue    = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + parseFloat(o.subtotal || 0), 0)
  const totalPending    = orders.filter(o => o.payment_status === 'awaiting_payment').reduce((s, o) => s + parseFloat(o.subtotal || 0), 0)
  const paidCount       = orders.filter(o => o.payment_status === 'paid').length
  const totalOrders     = orders.length

  const staffStats = STAFF.map(s => ({
    ...s,
    orders: orders.filter(o => o.staff_name?.toLowerCase() === s.name.toLowerCase()).length,
    revenue: orders.filter(o => o.staff_name?.toLowerCase() === s.name.toLowerCase() && o.payment_status === 'paid').reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0),
    leads: leads.filter(l => l.staff_name?.toLowerCase() === s.name.toLowerCase()).length,
  })).sort((a, b) => b.orders - a.orders)

  // ── FILTERED ORDERS ───────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const matchSearch = !search ||
      o.store_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.staff_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.payment_status === statusFilter
    return matchSearch && matchStatus
  })

  const tabStyle = (id) => ({
    padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase',
    background: tab === id ? '#E8341C' : 'rgba(255,255,255,0.06)',
    color: tab === id ? '#fff' : 'rgba(255,255,255,0.4)',
    transition: 'all 0.18s',
  })

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#060606', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Work Sans, sans-serif' }}>

      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/hi-logo.png" alt="Hi!" style={{ height: 28, width: 'auto' }} />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E8341C', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={loadData} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>↻ Refresh</button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{admin.name}</span>
          <button onClick={onLogout} style={{ padding: '7px 14px', background: 'rgba(232,52,28,0.1)', border: '1px solid rgba(232,52,28,0.3)', borderRadius: 10, color: '#E8341C', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>Log Out</button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '14px 24px 0', background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'orders',   label: '📦 Orders' },
          { id: 'leads',    label: '🤝 Leads' },
          { id: 'staff',    label: '👥 Staff' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...tabStyle(t.id), marginBottom: -1, borderRadius: '12px 12px 0 0' }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading data...</div>
        ) : (

          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div>
                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Total Revenue', value: fmt(totalRevenue), color: '#27C96A', sub: `${paidCount} paid orders` },
                    { label: 'Pending Revenue', value: fmt(totalPending), color: '#FBBF24', sub: `${orders.filter(o=>o.payment_status==='awaiting_payment').length} orders awaiting` },
                    { label: 'Total Orders', value: totalOrders, color: '#E8341C', sub: `${orders.filter(o=>o.payment_status==='paid').length} paid · ${orders.filter(o=>o.payment_status==='invoice'||o.payment_status==='pending').length} invoiced` },
                    { label: 'Total Leads', value: leads.length, color: '#3B82F6', sub: 'contacts collected' },
                  ].map(k => (
                    <div key={k.label} style={{ ...card }}>
                      <p style={{ ...lbl, marginBottom: 8 }}>{k.label}</p>
                      <p style={{ fontFamily: 'Impact, sans-serif', fontSize: 32, color: k.color, letterSpacing: '0.04em', margin: '0 0 4px' }}>{k.value}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'Work Sans, sans-serif' }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue by staff */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ ...card }}>
                    <p style={{ ...lbl, marginBottom: 16 }}>Revenue by Staff</p>
                    {staffStats.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(232,52,28,0.15)', border: '1px solid rgba(232,52,28,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#E8341C', fontFamily: 'Work Sans, sans-serif', flexShrink: 0 }}>
                          {s.name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontFamily: 'Impact, sans-serif', fontSize: 14, color: '#27C96A' }}>{fmt(s.revenue)}</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#E8341C', borderRadius: 2, width: `${totalRevenue > 0 ? (s.revenue / totalRevenue * 100) : 0}%`, transition: 'width 0.6s' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', minWidth: 60, textAlign: 'right' }}>{s.orders} orders</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent orders */}
                  <div style={{ ...card }}>
                    <p style={{ ...lbl, marginBottom: 16 }}>Recent Orders</p>
                    {orders.slice(0, 6).map(o => {
                      const sc = STATUS_COLORS[o.payment_status] || STATUS_COLORS.pending
                      return (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => setEditOrder(o)}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, color: '#fff', fontWeight: 600 }}>{o.store_name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{o.staff_name} · {fmtDate(o.created_at)}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0 0 4px', fontFamily: 'Impact, sans-serif', fontSize: 15, color: '#fff' }}>{fmt(o.subtotal)}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{o.payment_status?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab === 'orders' && (
              <div>
                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                  <input
                    placeholder="Search orders, stores, staff..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, padding: '11px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, fontFamily: 'Work Sans, sans-serif', outline: 'none' }}
                  />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '11px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 13, fontFamily: 'Work Sans, sans-serif', outline: 'none', cursor: 'pointer' }}>
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="awaiting_payment">Awaiting Payment</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <p style={{ ...lbl, marginBottom: 12 }}>{filteredOrders.length} orders</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredOrders.map(o => {
                    const sc = STATUS_COLORS[o.payment_status] || STATUS_COLORS.pending
                    return (
                      <div key={o.id} onClick={() => setEditOrder(o)} style={{ ...card, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.18s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,52,28,0.35)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{o.store_name}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{o.payment_status?.replace('_', ' ')}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{o.buyer_name} · {o.buyer_email} · Staff: {o.staff_name}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{o.order_id} · {fmtDate(o.created_at)} · {o.fulfillment}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'Impact, sans-serif', fontSize: 22, color: '#E8341C', letterSpacing: '0.04em', margin: '0 0 4px' }}>{fmt(o.subtotal)}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{o.pay_method}</p>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── LEADS ── */}
            {tab === 'leads' && (
              <div>
                <p style={{ ...lbl, marginBottom: 16 }}>{leads.length} leads collected</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leads.map(l => (
                    <div key={l.id} style={{ ...card, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#3B82F6', flexShrink: 0 }}>
                        {(l.name || l.store_name || '?')[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>{l.name || l.store_name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{l.email} {l.phone ? '· ' + l.phone : ''}</p>
                        {l.notes && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>{l.notes}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>by {l.staff_name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{fmtDate(l.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>No leads yet</p>}
                </div>
              </div>
            )}

            {/* ── STAFF ── */}
            {tab === 'staff' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {staffStats.map(s => (
                    <div key={s.id} style={{ ...card }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(232,52,28,0.15)', border: '2px solid rgba(232,52,28,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Impact, sans-serif', fontSize: 20, color: '#E8341C' }}>
                          {s.name[0]}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontFamily: 'Impact, sans-serif', fontSize: 20, color: '#fff', letterSpacing: '0.04em' }}>{s.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Staff Member</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Orders', value: s.orders, color: '#E8341C' },
                          { label: 'Revenue', value: fmt(s.revenue), color: '#27C96A' },
                          { label: 'Leads', value: s.leads, color: '#3B82F6' },
                        ].map(stat => (
                          <div key={stat.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                            <p style={{ ...lbl, marginBottom: 4 }}>{stat.label}</p>
                            <p style={{ fontFamily: 'Impact, sans-serif', fontSize: 18, color: stat.color, margin: 0, letterSpacing: '0.04em' }}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Order list for this staff */}
                      <div style={{ marginTop: 16 }}>
                        <p style={{ ...lbl, marginBottom: 8 }}>Recent Orders</p>
                        {orders.filter(o => o.staff_name?.toLowerCase() === s.name.toLowerCase()).slice(0, 3).map(o => {
                          const sc = STATUS_COLORS[o.payment_status] || STATUS_COLORS.pending
                          return (
                            <div key={o.id} onClick={() => setEditOrder(o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{o.store_name}</span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{o.payment_status?.replace('_', ' ')}</span>
                                <span style={{ fontFamily: 'Impact, sans-serif', fontSize: 13, color: '#E8341C' }}>{fmt(o.subtotal)}</span>
                              </div>
                            </div>
                          )
                        })}
                        {orders.filter(o => o.staff_name?.toLowerCase() === s.name.toLowerCase()).length === 0 && (
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No orders yet</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Order Modal */}
      {editOrder && <EditOrderModal order={editOrder} onClose={() => setEditOrder(null)} onSaved={loadData} />}
    </div>
  )
}