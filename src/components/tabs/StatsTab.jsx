import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { saveLead } from '../../lib/supabase'

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

function StatCard({ label, value, sub, color = '#E8341C', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: '18px 16px', borderRadius: 18,
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

export default function StatsTab({ staff, onLogout }) {
  const [myOrders, setMyOrders]   = useState([])
  const [myLeads, setMyLeads]     = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [allLeads, setAllLeads]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [editLead, setEditLead]     = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [savingLead, setSavingLead] = useState(false)

  const loadStats = async () => {
    setLoading(true)
    try {
      // Load this staff member's orders and leads + booth totals in parallel
      console.log('Loading stats for staff:', staff.name)

      const [myOrdersRes, myLeadsRes, allOrdersRes, allLeadsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .ilike('staff_name', staff.name)   // case-insensitive match
          .order('created_at', { ascending: false }),
        supabase
          .from('leads')
          .select('*')
          .ilike('staff_name', staff.name)   // case-insensitive match
          .order('created_at', { ascending: false }),
        Promise.resolve({ data: [] }), // booth totals removed
        Promise.resolve({ data: [] }), // booth totals removed
      ])

      console.log('My orders:', myOrdersRes.data?.length, 'All orders:', allOrdersRes.data?.length)
      if (myOrdersRes.error) console.error('Orders error:', myOrdersRes.error)

      setMyOrders(myOrdersRes.data || [])
      setMyLeads(myLeadsRes.data || [])
      setAllOrders(allOrdersRes.data || [])
      setAllLeads(allLeadsRes.data || [])
    } catch (err) {
      console.error('Stats load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveLeadEdit = async () => {
    if (!editLead) return
    setSavingLead(true)
    try {
      const updates = {
        name:       editForm.name,
        store_name: editForm.store_name,
        email:      editForm.email,
        phone:      editForm.phone,
        locations:  editForm.locations,
        states:     editForm.states,
        volume:     editForm.volume,
        infused:    editForm.infused,
        brands:     editForm.brands,
        notes:      editForm.notes,
      }
      const { error } = await supabase.from('leads').update(updates).eq('id', editLead.id)
      if (error) throw error
      setMyLeads(prev => prev.map(l => l.id === editLead.id ? { ...l, ...updates } : l))
      setEditLead(null)
    } catch (err) {
      console.error('Lead save error:', err)
      alert('Failed to save: ' + err.message)
    } finally { setSavingLead(false) }
  }

  useEffect(() => {
    loadStats()
    // Refresh every 30 seconds to pick up new orders
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [staff.name])

  const totalRevenue = myOrders.reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0)
  const paidRevenue  = myOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0)
  const avgOrder     = myOrders.length > 0 ? totalRevenue / myOrders.length : 0

  // Top flavor from items
  const topFlavors = {}
  myOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.name || 'Unknown'
      topFlavors[key] = (topFlavors[key] || 0) + (item.qty || 0)
    })
  })
  const topFlavor = Object.entries(topFlavors).sort((a, b) => b[1] - a[1])[0]

  return (
    <div style={{ background: '#0A0A0A', height: '100%', overflowY: 'auto', padding: '20px 16px 40px', position: 'relative' }}>

      {/* Glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: 'radial-gradient(ellipse at 50% 0%, rgba(232,52,28,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em' }}>MY SESSION</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            {staff.name}'s Stats
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={loadStats} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>↻ Refresh</button>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,52,28,0.15)', border: '1px solid rgba(232,52,28,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#E8341C' }}>
            {staff.name[0]}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 24, letterSpacing: '0.06em' }}>
        Booth 1107 · Champs Las Vegas
      </p>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40 }}>Loading stats...</p>
      ) : (
        <>
          {/* My stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <StatCard label="MY ORDERS"  value={myOrders.length}                                    sub="this convention"    color="#E8341C"              delay={0.05} />
            <StatCard label="MY LEADS"   value={myLeads.length}                                     sub="contacts saved"     color="#27C96A"              delay={0.1}  />
            <StatCard label="MY REVENUE" value={fmt(totalRevenue)}                                  sub={`${fmt(paidRevenue)} paid`} color="#E8341C"       delay={0.15} />
            <StatCard label="AVG ORDER"  value={myOrders.length > 0 ? fmt(avgOrder) : '—'}         sub="per transaction"    color="rgba(255,255,255,0.7)" delay={0.2}  />
          </div>

          {/* Top flavor */}
          {topFlavor && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              style={{ padding: '16px 18px', borderRadius: 16, marginBottom: 22, background: 'rgba(232,52,28,0.08)', border: '1px solid rgba(232,52,28,0.2)' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(232,52,28,0.6)', letterSpacing: '0.14em', marginBottom: 4 }}>TOP FLAVOR SOLD</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                {topFlavor[0]} <span style={{ color: '#E8341C' }}>×{topFlavor[1]}</span>
              </p>
            </motion.div>
          )}



          {/* Recent orders */}
          {myOrders.length > 0 && (
            <>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', marginBottom: 12 }}>MY RECENT ORDERS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {myOrders.slice(0, 8).map((o, i) => {
                  const isPaid = o.payment_status === 'paid'
                  return (
                    <div key={o.id || i} style={{ padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{o.store_name || 'Unknown store'}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                          {o.pay_method === 'charge' ? '💳' : '📧'} {fmtTime(o.created_at)}
                          {' · '}
                          <span style={{ color: isPaid ? '#27C96A' : 'rgba(251,191,36,0.8)' }}>
                            {isPaid ? '✓ Paid' : o.payment_status?.replace('_', ' ')}
                          </span>
                        </p>
                      </div>
                      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#E8341C' }}>{fmt(o.subtotal)}</p>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Leads list */}
          {myLeads.length > 0 && (
            <>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', marginBottom: 12 }}>MY LEADS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {myLeads.map((l, i) => (
                  <div key={l.id || i} style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(39,201,106,0.05)', border: '1px solid rgba(39,201,106,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{l.store_name || l.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{l.email} · {fmtTime(l.created_at)}</p>
                      {l.notes && <p style={{ fontSize: 11, color: 'rgba(39,201,106,0.6)', marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notes}</p>}
                    </div>
                    <button
                      onClick={() => { setEditLead(l); setEditForm({ name: l.name||'', store_name: l.store_name||'', email: l.email||'', phone: l.phone||'', locations: l.locations||'', states: l.states||[], volume: l.volume||'', infused: l.infused||'', brands: l.brands||'', notes: l.notes||'' }) }}
                      style={{ marginLeft: 12, flexShrink: 0, padding: '7px 12px', background: 'rgba(39,201,106,0.1)', border: '1px solid rgba(39,201,106,0.3)', borderRadius: 9, color: '#27C96A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>
                      ✏️ Edit
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Edit Lead Modal */}
          {editLead && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
              <div style={{ width: '100%', maxWidth: 560, background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>

                {/* Modal header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(39,201,106,0.6)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 2px' }}>Edit Lead</p>
                    <h3 style={{ fontFamily: 'Impact, sans-serif', fontSize: 20, color: '#fff', letterSpacing: '0.04em', margin: 0 }}>{editLead.store_name || editLead.name}</h3>
                  </div>
                  <button onClick={() => setEditLead(null)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Name + Store */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[{ key: 'name', label: 'Contact Name', ph: 'Jane Doe' }, { key: 'store_name', label: 'Store Name', ph: 'Cloud 9' }].map(f => (
                      <div key={f.key}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 5 }}>{f.label.toUpperCase()}</p>
                        <input value={editForm[f.key]} onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph}
                          style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'Work Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                  </div>

                  {/* Email + Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[{ key: 'email', label: 'Email', ph: 'jane@store.com', type: 'email' }, { key: 'phone', label: 'Phone', ph: '(555) 123-4567', type: 'tel' }].map(f => (
                      <div key={f.key}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 5 }}>{f.label.toUpperCase()}</p>
                        <input type={f.type} value={editForm[f.key]} onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph}
                          style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'Work Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                  </div>

                  {/* Locations */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 8 }}>NUMBER OF LOCATIONS</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['1','2-5','6-20','20+'].map(o => (
                        <button key={o} onClick={() => setEditForm(p => ({...p, locations: o}))}
                          style={{ flex: 1, padding: '10px 6px', borderRadius: 9, cursor: 'pointer', background: editForm.locations===o?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)', border: `1px solid ${editForm.locations===o?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`, color: editForm.locations===o?'#E8341C':'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, fontFamily: 'Work Sans, sans-serif' }}>{o}</button>
                      ))}
                    </div>
                  </div>

                  {/* Monthly volume */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 8 }}>MONTHLY VOLUME</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Just starting','50–100','100–500','500+'].map(o => (
                        <button key={o} onClick={() => setEditForm(p => ({...p, volume: o}))}
                          style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', background: editForm.volume===o?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)', border: `1px solid ${editForm.volume===o?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`, color: editForm.volume===o?'#E8341C':'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, fontFamily: 'Work Sans, sans-serif' }}>{o}</button>
                      ))}
                    </div>
                  </div>

                  {/* Interested in infused */}
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 8 }}>INTERESTED IN INFUSED?</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Yes','No','Already carry'].map(o => (
                        <button key={o} onClick={() => setEditForm(p => ({...p, infused: o}))}
                          style={{ flex: 1, padding: '10px 8px', borderRadius: 9, cursor: 'pointer', background: editForm.infused===o?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)', border: `1px solid ${editForm.infused===o?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`, color: editForm.infused===o?'#E8341C':'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, fontFamily: 'Work Sans, sans-serif' }}>{o}</button>
                      ))}
                    </div>
                  </div>

                  {/* Brands + Notes */}
                  {[{ key: 'brands', label: 'Brands They Carry', ph: 'e.g. Truff, Cholula...' }, { key: 'notes', label: 'Notes', ph: 'Follow up details, observations...' }].map(f => (
                    <div key={f.key}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 5 }}>{f.label.toUpperCase()}</p>
                      <textarea value={editForm[f.key]} onChange={e => setEditForm(p => ({...p, [f.key]: e.target.value}))} placeholder={f.ph} rows={f.key==='notes'?3:2}
                        style={{ width: '100%', padding: '11px 13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'Work Sans, sans-serif', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setEditLead(null)} style={{ flex: 1, padding: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>Cancel</button>
                  <button onClick={saveLeadEdit} disabled={savingLead} style={{ flex: 2, padding: 13, background: '#27C96A', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 900, cursor: savingLead?'wait':'pointer', fontFamily: 'Impact, sans-serif', letterSpacing: '0.06em', opacity: savingLead?0.6:1 }}>
                    {savingLead ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {myOrders.length === 0 && myLeads.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 20, fontSize: 14 }}>No activity yet — go make some sales! 🔥</p>
          )}
        </>
      )}

      {/* Sign out */}
      <button onClick={onLogout} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 13, color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif', letterSpacing: '0.06em', marginTop: 8 }}>
        SIGN OUT
      </button>
    </div>
  )
}