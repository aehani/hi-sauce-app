import { useState, useEffect, useRef } from 'react'
import { SAUCES } from '../../config/products'
import { saveOrder, subscribeToPayment, pollPaymentStatus } from '../../lib/supabase'

const fmt = (n) => `$${n.toFixed(2)}`
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
const genOrderId = () => `HIS-${Date.now().toString(36).toUpperCase()}`

const inp = { width:'100%', padding:'13px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#fff', fontSize:14, fontFamily:'Work Sans, sans-serif', outline:'none', boxSizing:'border-box' }
const lbl = { fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.16em', marginBottom:6, display:'block', fontFamily:'Work Sans, sans-serif', textTransform:'uppercase' }
const hdg = { fontFamily:'Impact, sans-serif', fontSize:30, fontWeight:900, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:20, background:'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }

export default function OrderTab({ staff }) {
  const [step, setStep]             = useState('build')
  const [cart, setCart]             = useState({})
  const [buyer, setBuyer]           = useState({ store:'', name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', fulfillment:'ship' })
  const [payMethod, setPayMethod]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [orderId]                   = useState(genOrderId)
  const [paymentUrl, setPaymentUrl] = useState(null)
  const [payStatus, setPayStatus]   = useState('idle')
  const cleanupRef                  = useRef(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  const updateQty = (id, delta) => setCart(prev => {
    const next = { ...prev }
    const q = (next[id] || 0) + delta
    if (q <= 0) delete next[id]; else next[id] = q
    return next
  })

  const cartItems = Object.entries(cart).map(([key, qty]) => {
    const [id, type] = key.split('-')
    const sauce = SAUCES.find(s => s.id === id)
    if (!sauce) return null
    return { key, sauce, type, qty, price: type === 'bottle' ? sauce.wholesale : sauce.sachetWholesale }
  }).filter(Boolean)

  const subtotal  = cartItems.reduce((s, i) => s + i.price * i.qty, 0)
  const infoValid = buyer.store && buyer.name && buyer.email

  const startPolling = (oid) => {
    const unsub = subscribeToPayment(oid, () => { setPayStatus('paid'); cleanupRef.current?.() })
    pollPaymentStatus(oid, () => { setPayStatus('paid'); cleanupRef.current?.() }).then(stop => {
      cleanupRef.current = () => { unsub(); stop() }
    })
    cleanupRef.current = unsub
  }

  const submitOrder = async () => {
    setLoading(true); setError(null)
    try {
      const orderPayload = {
        orderId, staff: staff?.name || 'Staff', buyer: { ...buyer },
        items: cartItems.map(i => ({ key: i.key, name: i.sauce.name, type: i.type, qty: i.qty, price: i.price })),
        subtotal, payMethod, timestamp: new Date().toISOString(),
      }
      await saveOrder(orderPayload)
      if (payMethod === 'charge') {
        const res  = await fetch('/.netlify/functions/create-payment-link', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orderId, amount: subtotal, buyer: orderPayload.buyer }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create payment link')
        setPaymentUrl(data.paymentUrl)
        setPayStatus('waiting')
        setStep('waiting')
        startPolling(orderId)
      } else {
        setStep('done')
      }
    } catch (err) {
      console.error('Order error:', err)
      setError(err.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  const reset = () => {
    cleanupRef.current?.()
    setCart({}); setBuyer({ store:'', name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', fulfillment:'ship' })
    setPayMethod(null); setStep('build'); setError(null); setPaymentUrl(null); setPayStatus('idle')
  }

  // WAITING
  if (step === 'waiting') return (
    <div style={{ background:'#0A0A0A', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', textAlign:'center' }}>
      {payStatus === 'paid' ? (
        <>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(39,201,106,0.15)', border:'2px solid #27C96A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:24 }}>✓</div>
          <h2 style={{ ...hdg, fontSize:34, marginBottom:8 }}>Payment Complete!</h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:15, marginBottom:4, fontFamily:'Work Sans, sans-serif' }}>{buyer.store} — {fmt(subtotal)}</p>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, fontFamily:'Work Sans, sans-serif', marginBottom:32 }}>Order {orderId} · Receipt sent to {buyer.email}</p>
          <button onClick={reset} style={{ padding:'15px 44px', background:'#E8341C', border:'none', borderRadius:14, color:'#fff', fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>NEW ORDER</button>
        </>
      ) : (
        <>
          <div style={{ position:'relative', width:80, height:80, marginBottom:28 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(232,52,28,0.2)', animation:'ping 1.5s ease-in-out infinite' }} />
            <div style={{ position:'relative', width:80, height:80, borderRadius:'50%', background:'rgba(232,52,28,0.15)', border:'2px solid #E8341C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>💳</div>
          </div>
          <h2 style={{ ...hdg, fontSize:28, marginBottom:8 }}>Waiting for Payment</h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, marginBottom:24, fontFamily:'Work Sans, sans-serif' }}>Send the link to <strong style={{color:'#fff'}}>{buyer.name}</strong></p>
          <div style={{ width:'100%', maxWidth:380, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:20, marginBottom:20 }}>
            <p style={{...lbl, marginBottom:10}}>Payment Link — {fmt(subtotal)}</p>
            <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:10, padding:'10px 14px', marginBottom:14, wordBreak:'break-all', fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'monospace' }}>{paymentUrl}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => navigator.clipboard.writeText(paymentUrl)} style={{ flex:1, padding:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif' }}>📋 Copy</button>
              {buyer.email && <button onClick={() => window.open(`mailto:${buyer.email}?subject=Hi! Sauce Payment ${fmt(subtotal)}&body=Hi ${buyer.name},%0D%0A%0D%0APlease complete your payment here:%0D%0A${paymentUrl}`, '_blank')} style={{ flex:1, padding:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif' }}>✉️ Email</button>}
              {buyer.phone && <button onClick={() => window.open(`sms:${buyer.phone}?body=Hi ${buyer.name}! Complete your Hi! Sauce payment of ${fmt(subtotal)}: ${paymentUrl}`, '_blank')} style={{ flex:1, padding:12, background:'rgba(232,52,28,0.15)', border:'1px solid rgba(232,52,28,0.4)', borderRadius:10, color:'#E8341C', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif' }}>💬 SMS</button>}
            </div>
          </div>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:12, fontFamily:'Work Sans, sans-serif', marginBottom:20 }}>Screen updates automatically when payment is received</p>
          <button onClick={reset} style={{ padding:'10px 28px', background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, color:'rgba(255,255,255,0.4)', fontSize:12, cursor:'pointer', fontFamily:'Work Sans, sans-serif' }}>Cancel</button>
        </>
      )}
      <style>{`@keyframes ping { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.3);opacity:0} }`}</style>
    </div>
  )

  // DONE
  if (step === 'done') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', textAlign:'center', padding:'40px 32px', background:'#0A0A0A' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(59,130,246,0.15)', border:'2px solid #3B82F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:24 }}>📧</div>
      <h2 style={{ ...hdg, fontSize:34, marginBottom:8 }}>Order Saved</h2>
      <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15, marginBottom:4, fontFamily:'Work Sans, sans-serif' }}>{buyer.store} — {fmt(subtotal)}</p>
      <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, fontFamily:'Work Sans, sans-serif' }}>Invoice sent to {buyer.email} within 48 hours</p>
      <button onClick={reset} style={{ marginTop:36, padding:'15px 44px', background:'#E8341C', border:'none', borderRadius:14, color:'#fff', fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>NEW ORDER</button>
    </div>
  )

  // REVIEW
  if (step === 'review') return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'20px 16px 32px' }}>
      <p style={lbl}>Step 3 of 3</p>
      <h2 style={hdg}>Review & Pay</h2>
      {error && <div style={{ background:'rgba(232,52,28,0.15)', border:'1px solid rgba(232,52,28,0.4)', borderRadius:12, padding:'12px 16px', marginBottom:16, color:'#E8341C', fontSize:13, fontFamily:'Work Sans, sans-serif' }}>⚠️ {error}</div>}
      <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:18, marginBottom:14 }}>
        <p style={lbl}>Buyer</p>
        <p style={{ fontSize:18, fontWeight:900, fontFamily:'Impact, sans-serif', letterSpacing:'0.04em' }}>{buyer.store}</p>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:3, fontFamily:'Work Sans, sans-serif' }}>{buyer.name} · {buyer.email} · {buyer.phone}</p>
      </div>
      <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:18, marginBottom:14 }}>
        <p style={lbl}>Order {orderId}</p>
        {cartItems.map(i => (
          <div key={i.key} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.65)', fontFamily:'Work Sans, sans-serif' }}>{i.sauce.name} {i.type} × {i.qty}</span>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'Impact, sans-serif', color:'rgba(255,255,255,0.85)' }}>{fmt(i.price * i.qty)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
          <span style={{ fontFamily:'Work Sans, sans-serif', fontWeight:600, color:'rgba(255,255,255,0.5)', fontSize:12, textTransform:'uppercase', letterSpacing:'0.1em' }}>Total</span>
          <span style={{ fontFamily:'Impact, sans-serif', fontSize:22, color:'#E8341C' }}>{fmt(subtotal)}</span>
        </div>
      </div>
      <p style={{...lbl, marginBottom:10}}>Payment Method</p>
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { id:'charge',  label:'CHARGE NOW',    icon:'💳', color:'#27C96A', desc:'Send payment link via SMS/email' },
          { id:'invoice', label:'INVOICE LATER', icon:'📧', color:'#3B82F6', desc:'Net 30 · sent within 48hrs' },
        ].map(m => (
          <button key={m.id} onClick={() => setPayMethod(m.id)} style={{ flex:1, padding:'18px 12px', borderRadius:16, cursor:'pointer', textAlign:'center', background:payMethod===m.id?`${m.color}18`:'rgba(255,255,255,0.04)', border:`2px solid ${payMethod===m.id?m.color:'rgba(255,255,255,0.09)'}`, transition:'all 0.2s' }}>
            <div style={{ fontSize:28 }}>{m.icon}</div>
            <div style={{ fontSize:13, fontWeight:900, color:payMethod===m.id?m.color:'rgba(255,255,255,0.7)', marginTop:8, fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>{m.label}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:4, fontFamily:'Work Sans, sans-serif' }}>{m.desc}</div>
          </button>
        ))}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => setStep('info')} style={{ flex:1, padding:15, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:13, color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif' }}>BACK</button>
        <button onClick={submitOrder} disabled={!payMethod||loading} style={{ flex:2, padding:15, background:payMethod&&!loading?'#E8341C':'rgba(255,255,255,0.08)', border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:900, cursor:payMethod&&!loading?'pointer':'not-allowed', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em', opacity:payMethod&&!loading?1:0.4 }}>
          {loading ? 'PROCESSING...' : payMethod==='charge' ? 'SEND PAYMENT LINK →' : 'CONFIRM ORDER →'}
        </button>
      </div>
    </div>
  )

  // INFO
  if (step === 'info') return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'20px 16px 32px' }}>
      <p style={lbl}>Step 2 of 3</p>
      <h2 style={hdg}>Buyer Info</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
        {[{key:'store',label:'Store Name',ph:'Cloud 9 Smoke Shop'},{key:'name',label:'Buyer Name',ph:'John Smith'},{key:'email',label:'Email',ph:'john@store.com',type:'email'},{key:'phone',label:'Phone',ph:'(555) 123-4567',type:'tel'},{key:'address',label:'Shipping Address',ph:'123 Main St'}].map(f => (
          <div key={f.key}><label style={lbl}>{f.label}</label><input type={f.type||'text'} placeholder={f.ph} value={buyer[f.key]} onChange={e=>setBuyer({...buyer,[f.key]:e.target.value})} style={inp} /></div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr', gap:10 }}>
          <div><label style={lbl}>City</label><input placeholder="Miami" value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})} style={inp} /></div>
          <div><label style={lbl}>State</label><select value={buyer.state} onChange={e=>setBuyer({...buyer,state:e.target.value})} style={{...inp,appearance:'none'}}><option value="">--</option>{US_STATES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>Zip</label><input placeholder="33101" value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})} style={inp} /></div>
        </div>
        <div>
          <label style={lbl}>Fulfillment</label>
          <div style={{ display:'flex', gap:8 }}>
            {[{id:'ship',label:'Ship to Store'},{id:'distro',label:'Demand Distro'},{id:'pickup',label:'Show Pickup'}].map(o => (
              <button key={o.id} onClick={()=>setBuyer({...buyer,fulfillment:o.id})} style={{ flex:1, padding:'11px 6px', borderRadius:10, cursor:'pointer', background:buyer.fulfillment===o.id?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)', border:`1px solid ${buyer.fulfillment===o.id?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`, color:buyer.fulfillment===o.id?'#E8341C':'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, fontFamily:'Work Sans, sans-serif' }}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:22 }}>
        <button onClick={()=>setStep('build')} style={{ flex:1, padding:15, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:13, color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif' }}>BACK</button>
        <button onClick={()=>setStep('review')} disabled={!infoValid} style={{ flex:2, padding:15, background:infoValid?'#E8341C':'rgba(255,255,255,0.08)', border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:900, cursor:infoValid?'pointer':'not-allowed', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em', opacity:infoValid?1:0.4 }}>REVIEW ORDER →</button>
      </div>
    </div>
  )

  // BUILD
  return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'16px 14px' }}>
      <p style={lbl}>Step 1 of 3</p>
      <h2 style={hdg}>Build the Order</h2>
      <p style={{...lbl, marginBottom:10}}>Bottles — {fmt(SAUCES[0]?.wholesale || 4.5)} ea</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
        {SAUCES.map(s => {
          const qty = cart[s.id+'-bottle'] || 0
          return (
            <div key={s.id} style={{ padding:'14px 10px', borderRadius:14, textAlign:'center', background:qty>0?'rgba(232,52,28,0.08)':'rgba(255,255,255,0.04)', border:`1px solid ${qty>0?'rgba(232,52,28,0.35)':'rgba(255,255,255,0.08)'}` }}>
              <div style={{ fontSize:26 }}>{s.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:6, fontFamily:'Work Sans, sans-serif', color:'rgba(255,255,255,0.7)' }}>{s.shortName}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:10 }}>
                <button onClick={()=>updateQty(s.id+'-bottle',-1)} style={{ width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                <span style={{ fontSize:17,fontWeight:900,minWidth:22,textAlign:'center',fontFamily:'Impact, sans-serif',color:qty>0?'#E8341C':'#fff' }}>{qty}</span>
                <button onClick={()=>updateQty(s.id+'-bottle',1)} style={{ width:30,height:30,borderRadius:8,background:'#E8341C',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{...lbl, marginBottom:10}}>Sachets — {fmt(SAUCES[0]?.sachetWholesale || 0.75)} ea</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:80 }}>
        {SAUCES.map(s => {
          const qty = cart[s.id+'-sachet'] || 0
          return (
            <div key={s.id} style={{ padding:'14px 10px', borderRadius:14, textAlign:'center', background:qty>0?'rgba(232,52,28,0.08)':'rgba(255,255,255,0.04)', border:`1px solid ${qty>0?'rgba(232,52,28,0.35)':'rgba(255,255,255,0.08)'}` }}>
              <div style={{ fontSize:26 }}>{s.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:6, fontFamily:'Work Sans, sans-serif', color:'rgba(255,255,255,0.7)' }}>{s.shortName}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:10 }}>
                <button onClick={()=>updateQty(s.id+'-sachet',-1)} style={{ width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                <span style={{ fontSize:17,fontWeight:900,minWidth:22,textAlign:'center',fontFamily:'Impact, sans-serif',color:qty>0?'#E8341C':'#fff' }}>{qty}</span>
                <button onClick={()=>updateQty(s.id+'-sachet',1)} style={{ width:30,height:30,borderRadius:8,background:'#E8341C',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
              </div>
            </div>
          )
        })}
      </div>
      {cartItems.length > 0 && (
        <div style={{ position:'fixed', bottom:70, left:0, right:0, zIndex:50, background:'rgba(13,13,13,0.96)', borderTop:'1px solid rgba(255,255,255,0.1)', padding:'14px 16px 18px', backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontFamily:'Work Sans, sans-serif' }}>{cartItems.reduce((s,i)=>s+i.qty,0)} items</span>
            <span style={{ fontFamily:'Impact, sans-serif', fontSize:26, color:'#E8341C' }}>{fmt(subtotal)}</span>
          </div>
          <button onClick={()=>setStep('info')} style={{ width:'100%', padding:15, background:'#E8341C', border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>CONTINUE →</button>
        </div>
      )}
    </div>
  )
}