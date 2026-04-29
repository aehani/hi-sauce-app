import { useState } from 'react'
import { motion } from 'framer-motion'
import { SAUCES, DISPLAY_PRESETS } from '../../config/products'
import { saveOrder } from '../../lib/supabase'
import { createDraftOrder } from '../../lib/shopify'

const fmt = (n) => `$${n.toFixed(2)}`
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

const inputStyle = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff',
  fontSize: 14, fontFamily: 'Work Sans, sans-serif',
  outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.16em', marginBottom: 6, display: 'block',
  fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase',
}

export default function OrderTab({ staff, onOrderSaved }) {
  const [step, setStep]           = useState('build')
  const [cart, setCart]           = useState({})
  const [buyer, setBuyer]         = useState({ store:'', name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', fulfillment:'ship' })
  const [payMethod, setPayMethod] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [draftOrder, setDraftOrder] = useState(null)
  const [error, setError]         = useState(null)

  const updateQty = (id, delta) => {
    setCart(prev => {
      const next = { ...prev }
      const q = (next[id] || 0) + delta
      if (q <= 0) delete next[id]
      else next[id] = q
      return next
    })
  }

  const applyPreset = (preset) => {
    const next = {}
    SAUCES.forEach(s => {
      next[s.id + '-bottle'] = preset.multiplier * 6
      next[s.id + '-sachet'] = preset.multiplier * 20
    })
    setCart(next)
  }

  const cartItems = Object.entries(cart).map(([key, qty]) => {
    const [id, type] = key.split('-')
    const sauce = SAUCES.find(s => s.id === id)
    if (!sauce) return null
    const price = type === 'bottle' ? sauce.wholesale : sauce.sachetWholesale
    return { key, sauce, type, qty, price }
  }).filter(Boolean)

  const subtotal  = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const infoValid = buyer.store && buyer.name && buyer.email

  const submitOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const orderPayload = {
        staff: staff.name,
        buyer: { ...buyer },
        items: cartItems.map(i => ({
          key: i.key, name: i.sauce.name, type: i.type, qty: i.qty, price: i.price,
        })),
        subtotal,
        payMethod,
        timestamp: new Date().toISOString(),
      }

      if (payMethod === 'charge') {
        // Create draft order in Shopify — appears in POS for card reader
        const draft = await createDraftOrder({
          cartItems: orderPayload.items,
          buyer,
          staff: staff.name,
          subtotal,
        })
        orderPayload.shopifyOrderId = String(draft.id)
        orderPayload.draftOrderName = draft.name
        // Save to Supabase
        await saveOrder(orderPayload)
        setDraftOrder(draft)
      } else {
        // Invoice — just save to Supabase
        await saveOrder(orderPayload)
      }

      onOrderSaved?.(orderPayload)
      setStep('done')
    } catch (err) {
      console.error('Order error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setCart({})
    setBuyer({ store:'', name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', fulfillment:'ship' })
    setPayMethod(null)
    setStep('build')
    setError(null)
    setDraftOrder(null)
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', textAlign:'center', padding:'40px 32px', background:'#0A0A0A' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background: payMethod==='charge'?'rgba(39,201,106,0.15)':'rgba(59,130,246,0.15)', border:`2px solid ${payMethod==='charge'?'#27C96A':'#3B82F6'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginBottom:24 }}>
        {payMethod === 'charge' ? '✓' : '📧'}
      </div>
      <h2 style={{ fontFamily:'Impact, sans-serif', fontSize:34, fontWeight:900, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase',
        background: 'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
      }}>{payMethod==='charge' ? 'Draft Order Created' : 'Order Saved'}</h2>
      <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15, marginBottom:4, fontFamily:'Work Sans, sans-serif' }}>{buyer.store} — {fmt(subtotal)}</p>

      {payMethod === 'charge' && draftOrder ? (
        <div style={{ marginTop:16, padding:'16px 20px', background:'rgba(39,201,106,0.1)', border:'1px solid rgba(39,201,106,0.3)', borderRadius:16, width:'100%', maxWidth:320 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(39,201,106,0.7)', letterSpacing:'0.14em', marginBottom:6, fontFamily:'Work Sans, sans-serif' }}>DRAFT ORDER</p>
          <p style={{ fontSize:28, fontWeight:900, color:'#27C96A', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em', marginBottom:8 }}>{draftOrder.name}</p>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontFamily:'Work Sans, sans-serif', lineHeight:1.6 }}>
            Open <strong style={{color:'#fff'}}>Shopify POS</strong> on your device, go to <strong style={{color:'#fff'}}>Orders → Drafts</strong>, find <strong style={{color:'#27C96A'}}>{draftOrder.name}</strong> and tap the card reader to charge.
          </p>
        </div>
      ) : (
        <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, fontFamily:'Work Sans, sans-serif' }}>
          Invoice sent within 48 hours to {buyer.email}
        </p>
      )}
      <button onClick={reset} style={{ marginTop:36, padding:'15px 44px', background:'#E8341C', border:'none', borderRadius:14, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>
        NEW ORDER
      </button>
    </div>
  )

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if (step === 'review') return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'20px 16px 32px' }}>
      <p style={labelStyle}>Step 3 of 3</p>
      <h2 style={{ fontFamily:'Impact, sans-serif', fontSize:30, fontWeight:900, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:20,
        background:'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
      }}>Review & Pay</h2>

      {error && (
        <div style={{ background:'rgba(232,52,28,0.15)', border:'1px solid rgba(232,52,28,0.4)', borderRadius:12, padding:'12px 16px', marginBottom:16, color:'#E8341C', fontSize:13, fontFamily:'Work Sans, sans-serif' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:18, marginBottom:14 }}>
        <p style={labelStyle}>Buyer</p>
        <p style={{ fontSize:18, fontWeight:900, fontFamily:'Impact, sans-serif', letterSpacing:'0.04em' }}>{buyer.store}</p>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:3, fontFamily:'Work Sans, sans-serif' }}>{buyer.name} · {buyer.email}</p>
      </div>

      <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:18, padding:18, marginBottom:14 }}>
        <p style={labelStyle}>Order Summary</p>
        {cartItems.map(i => (
          <div key={i.key} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.65)', fontFamily:'Work Sans, sans-serif' }}>{i.sauce.name} {i.type} × {i.qty}</span>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'Impact, sans-serif', letterSpacing:'0.04em', color:'rgba(255,255,255,0.85)' }}>{fmt(i.price * i.qty)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
          <span style={{ fontFamily:'Work Sans, sans-serif', fontWeight:600, color:'rgba(255,255,255,0.5)', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase' }}>Total</span>
          <span style={{ fontFamily:'Impact, sans-serif', fontSize:22, letterSpacing:'0.04em', color:'#E8341C' }}>{fmt(subtotal)}</span>
        </div>
      </div>

      <p style={{...labelStyle, marginBottom:10}}>Payment Method</p>
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { id:'charge', label:'CHARGE NOW',    icon:'💳', color:'#27C96A', desc:'Opens Shopify checkout' },
          { id:'invoice', label:'INVOICE LATER', icon:'📧', color:'#3B82F6', desc:'Net 30 · sent within 48hrs' },
        ].map(m => (
          <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
            flex:1, padding:'18px 12px', borderRadius:16, cursor:'pointer', textAlign:'center',
            background: payMethod===m.id ? `${m.color}18` : 'rgba(255,255,255,0.04)',
            border:`2px solid ${payMethod===m.id ? m.color : 'rgba(255,255,255,0.09)'}`,
            transition:'all 0.2s',
          }}>
            <div style={{ fontSize:28 }}>{m.icon}</div>
            <div style={{ fontSize:13, fontWeight:900, color:payMethod===m.id?m.color:'rgba(255,255,255,0.7)', marginTop:8, fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>{m.label}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:4, fontFamily:'Work Sans, sans-serif' }}>{m.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => setStep('info')} style={{ flex:1, padding:15, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:13, color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif', letterSpacing:'0.08em' }}>BACK</button>
        <button onClick={submitOrder} disabled={!payMethod || loading} style={{ flex:2, padding:15, background:payMethod&&!loading?'#E8341C':'rgba(255,255,255,0.08)', border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:900, cursor:payMethod&&!loading?'pointer':'not-allowed', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em', opacity:payMethod&&!loading?1:0.4 }}>
          {loading ? 'PROCESSING...' : 'CONFIRM ORDER'}
        </button>
      </div>
    </div>
  )

  // ── INFO ──────────────────────────────────────────────────────────────────
  if (step === 'info') return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'20px 16px 32px' }}>
      <p style={labelStyle}>Step 2 of 3</p>
      <h2 style={{ fontFamily:'Impact, sans-serif', fontSize:30, fontWeight:900, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:20,
        background:'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
      }}>Buyer Info</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
        {[
          { key:'store',   label:'Store Name',      ph:'Cloud 9 Smoke Shop' },
          { key:'name',    label:'Buyer Name',       ph:'John Smith' },
          { key:'email',   label:'Email',            ph:'john@cloud9.com',  type:'email' },
          { key:'phone',   label:'Phone',            ph:'(555) 123-4567',   type:'tel' },
          { key:'address', label:'Shipping Address', ph:'123 Main St' },
        ].map(f => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input type={f.type||'text'} placeholder={f.ph} value={buyer[f.key]} onChange={e=>setBuyer({...buyer,[f.key]:e.target.value})} style={inputStyle} />
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.5fr', gap:10 }}>
          <div><label style={labelStyle}>City</label><input placeholder="Miami" value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})} style={inputStyle} /></div>
          <div><label style={labelStyle}>State</label>
            <select value={buyer.state} onChange={e=>setBuyer({...buyer,state:e.target.value})} style={{...inputStyle,appearance:'none'}}>
              <option value="">--</option>{US_STATES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Zip</label><input placeholder="33101" value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})} style={inputStyle} /></div>
        </div>
        <div>
          <label style={labelStyle}>Fulfillment</label>
          <div style={{ display:'flex', gap:8 }}>
            {[{id:'ship',label:'Ship to Store'},{id:'distro',label:'Demand Distro'},{id:'pickup',label:'Show Pickup'}].map(o => (
              <button key={o.id} onClick={()=>setBuyer({...buyer,fulfillment:o.id})} style={{
                flex:1, padding:'11px 6px', borderRadius:10, cursor:'pointer',
                background: buyer.fulfillment===o.id?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)',
                border:`1px solid ${buyer.fulfillment===o.id?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`,
                color: buyer.fulfillment===o.id?'#E8341C':'rgba(255,255,255,0.4)',
                fontSize:11, fontWeight:700, fontFamily:'Work Sans, sans-serif', letterSpacing:'0.04em',
              }}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginTop:22 }}>
        <button onClick={()=>setStep('build')} style={{ flex:1, padding:15, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:13, color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Work Sans, sans-serif', letterSpacing:'0.08em' }}>BACK</button>
        <button onClick={()=>setStep('review')} disabled={!infoValid} style={{ flex:2, padding:15, background:infoValid?'#E8341C':'rgba(255,255,255,0.08)', border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:900, cursor:infoValid?'pointer':'not-allowed', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em', opacity:infoValid?1:0.4 }}>REVIEW ORDER →</button>
      </div>
    </div>
  )

  // ── BUILD CART ────────────────────────────────────────────────────────────
  return (
    <div style={{ background:'#0A0A0A', height:'100%', overflowY:'auto', padding:'16px 14px' }}>
      <p style={labelStyle}>Step 1 of 3</p>
      <h2 style={{ fontFamily:'Impact, sans-serif', fontSize:30, fontWeight:900, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:16,
        background:'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
      }}>Build the Order</h2>

      {/* Presets */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {DISPLAY_PRESETS.map(p => (
          <button key={p.id} onClick={()=>applyPreset(p)} style={{ flex:1, padding:'14px 10px', borderRadius:14, cursor:'pointer', textAlign:'left', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
            <div style={{ fontSize:12, fontWeight:900, color:'#E8341C', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em', textTransform:'uppercase' }}>{p.name}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, fontFamily:'Work Sans, sans-serif' }}>{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Bottles */}
      <p style={{...labelStyle, marginBottom:10}}>Bottles — {fmt(SAUCES[0].wholesale)} ea</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
        {SAUCES.map(s => {
          const qty = cart[s.id+'-bottle'] || 0
          return (
            <div key={s.id} style={{ padding:'14px 10px', borderRadius:14, textAlign:'center', background:qty>0?'rgba(232,52,28,0.08)':'rgba(255,255,255,0.04)', border:`1px solid ${qty>0?'rgba(232,52,28,0.35)':'rgba(255,255,255,0.08)'}` }}>
              <div style={{ fontSize:26 }}>{s.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:6, fontFamily:'Work Sans, sans-serif', color:'rgba(255,255,255,0.7)' }}>{s.shortName}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:10 }}>
                <button onClick={()=>updateQty(s.id+'-bottle',-1)} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ fontSize:17, fontWeight:900, minWidth:22, textAlign:'center', fontFamily:'Impact, sans-serif', color: qty>0?'#E8341C':'#fff' }}>{qty}</span>
                <button onClick={()=>updateQty(s.id+'-bottle',1)} style={{ width:30, height:30, borderRadius:8, background:'#E8341C', border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sachets */}
      <p style={{...labelStyle, marginBottom:10}}>Sachets — {fmt(SAUCES[0].sachetWholesale)} ea</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:80 }}>
        {SAUCES.map(s => {
          const qty = cart[s.id+'-sachet'] || 0
          return (
            <div key={s.id} style={{ padding:'14px 10px', borderRadius:14, textAlign:'center', background:qty>0?'rgba(232,52,28,0.08)':'rgba(255,255,255,0.04)', border:`1px solid ${qty>0?'rgba(232,52,28,0.35)':'rgba(255,255,255,0.08)'}` }}>
              <div style={{ fontSize:26 }}>{s.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:6, fontFamily:'Work Sans, sans-serif', color:'rgba(255,255,255,0.7)' }}>{s.shortName}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:10 }}>
                <button onClick={()=>updateQty(s.id+'-sachet',-1)} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ fontSize:17, fontWeight:900, minWidth:22, textAlign:'center', fontFamily:'Impact, sans-serif', color: qty>0?'#E8341C':'#fff' }}>{qty}</span>
                <button onClick={()=>updateQty(s.id+'-sachet',1)} style={{ width:30, height:30, borderRadius:8, background:'#E8341C', border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating cart bar */}
      {cartItems.length > 0 && (
        <div style={{ position:'fixed', bottom:70, left:0, right:0, zIndex:50, background:'rgba(13,13,13,0.96)', borderTop:'1px solid rgba(255,255,255,0.1)', padding:'14px 16px 18px', backdropFilter:'blur(20px)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontFamily:'Work Sans, sans-serif' }}>
              {cartItems.reduce((s,i)=>s+i.qty,0)} items
            </span>
            <span style={{ fontFamily:'Impact, sans-serif', fontSize:26, fontWeight:900, color:'#E8341C', letterSpacing:'0.04em' }}>{fmt(subtotal)}</span>
          </div>
          <button onClick={()=>setStep('info')} style={{ width:'100%', padding:15, background:'#E8341C', border:'none', borderRadius:13, color:'#fff', fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'Impact, sans-serif', letterSpacing:'0.06em' }}>
            CONTINUE →
          </button>
        </div>
      )}
    </div>
  )
}