import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { SAUCES } from '../../config/products'
import { saveOrder, subscribeToPayment, pollPaymentStatus } from '../../lib/supabase'

const fmtN = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
const genOrderId = () => `HIS-${Date.now().toString(36).toUpperCase()}`

const PRESETS = [
  { id:'starter',    name:'Starter Pack',  icon:'🔥', desc:'6 bottles + 20 sachets per flavor\n+ Custom counter display unit', bottles:6,  sachets:20 },
  { id:'doubledown', name:'Double Down',   icon:'💥', desc:'12 bottles + 40 sachets per flavor\n+ Custom counter display unit', bottles:12, sachets:40 },
]

const inp = { width:'100%', padding:'13px 16px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#fff', fontSize:14, fontFamily:'Work Sans, sans-serif', outline:'none', boxSizing:'border-box' }
const lbl = { fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.16em', marginBottom:6, display:'block', fontFamily:'Work Sans, sans-serif', textTransform:'uppercase' }
const hdg = { fontFamily:'Impact, sans-serif', fontSize:30, fontWeight:900, letterSpacing:'0.04em', textTransform:'uppercase', marginBottom:20, background:'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }

export default function OrderTab({ staff }) {
  const [step, setStep]               = useState('build')
  const [cart, setCart]               = useState({})
  const [buyer, setBuyer]             = useState({ store:'', name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', fulfillment:'ship' })
  const [payMethod, setPayMethod]     = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [orderId]                     = useState(genOrderId)
  const [paymentUrl, setPaymentUrl]   = useState(null)
  const [payStatus, setPayStatus]     = useState('idle')
  const [emailSent, setEmailSent]     = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentPlan, setPaymentPlan]           = useState(null) // '50-50' | 'full' | 'custom'
  const [customDepositPct, setCustomDepositPct] = useState('25')
  const [qrDataUrl, setQrDataUrl]           = useState(null)
  const [showPhysicalConfirm, setShowPhysicalConfirm] = useState(false)
  const [physicalLoading, setPhysicalLoading]         = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountType, setDiscountType] = useState('%')
  const [discountValue, setDiscountValue] = useState('')
  const [shipping, setShipping]         = useState('0.00')
  const cleanupRef   = useRef(null)
  const orderDataRef  = useRef(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  const updateQty = (id, delta) => setCart(prev => {
    const next = { ...prev }
    const q = (next[id] || 0) + delta
    if (q <= 0) delete next[id]; else next[id] = q
    return next
  })

  const applyPreset = (preset) => {
    const next = {}
    SAUCES.forEach(s => {
      next[s.id + '-bottle'] = preset.bottles
      next[s.id + '-sachet'] = preset.sachets
    })
    setCart(next)
  }

  const cartItems = Object.entries(cart).map(([key, qty]) => {
    const [id, type] = key.split('-')
    const sauce = SAUCES.find(s => s.id === id)
    if (!sauce) return null
    return { key, sauce, type, qty, price: type === 'bottle' ? sauce.wholesale : sauce.sachetWholesale }
  }).filter(Boolean)

  const subtotal    = cartItems.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmt = (() => {
    const v = parseFloat(discountValue) || 0
    if (!v || !showDiscount) return 0
    return discountType === '%' ? Math.min(subtotal * v / 100, subtotal) : Math.min(v, subtotal)
  })()
  const shippingAmt = parseFloat(shipping) || 0
  const total       = Math.max(0, subtotal - discountAmt) + shippingAmt

  // Payment plan amounts
  const fullDiscount  = total * 0.05
  const fullAmount    = total - fullDiscount
  const depositAmount = (() => {
    if (paymentPlan === '50-50')  return total * 0.5
    if (paymentPlan === 'full')   return fullAmount
    if (paymentPlan === 'custom') return total * (Math.min(Math.max(parseFloat(customDepositPct)||0,1),99) / 100)
    return total
  })()
  const infoValid   = buyer.store && buyer.name && buyer.email

  const sendPaymentEmail = async () => {
    setEmailSending(true)
    try {
      const res  = await fetch('/.netlify/functions/send-payment-email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ buyerEmail:buyer.email, buyerName:buyer.name, storeName:buyer.store, orderId, amount:total, paymentUrl }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send email')
      setEmailSent(true)
    } catch (err) { alert('Failed to send email: ' + err.message) }
    finally { setEmailSending(false) }
  }

  const sendReceiptEmail = async (orderData) => {
    try {
      await fetch('/.netlify/functions/send-receipt-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerEmail:       orderData.buyer.email,
          buyerName:        orderData.buyer.name,
          storeName:        orderData.buyer.store,
          orderId:          orderData.orderId,
          items:            orderData.items,
          subtotal:         orderData.subtotal,
          discountAmt:      orderData.discountAmt,
          shippingAmt:      orderData.shippingAmt,
          total:            orderData.total,
          paymentPlan:      orderData.paymentPlan,
          customDepositPct: orderData.customDepositPct,
          amountCharged:    orderData.amountCharged,
          transactionId:    orderData.transactionId,
        }),
      })
    } catch (err) { console.error('Receipt email error:', err) }
  }

  // Generate QR code when payment URL is available
  useEffect(() => {
    if (!paymentUrl) return
    QRCode.toDataURL(paymentUrl, {
      width: 200, margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(setQrDataUrl).catch(console.error)
  }, [paymentUrl])

  // Mark order as physically charged — updates Supabase and sends receipt
  const markPhysicallyCharged = async (orderData) => {
    setPhysicalLoading(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      await supabase
        .from('orders')
        .update({ payment_status: 'paid', paid_at: new Date().toISOString(), transaction_id: 'PHYSICAL-MX' })
        .eq('order_id', orderData.orderId)
      setPayStatus('paid')
      setShowPhysicalConfirm(false)
      sendReceiptEmail({ ...orderData, transactionId: 'Physical — MX Merchant Reader' })
    } catch (err) {
      console.error('Physical charge error:', err)
      alert('Error updating order: ' + err.message)
    } finally { setPhysicalLoading(false) }
  }

  const startPolling = (oid, orderData) => {
    const onPaid = (data) => {
      setPayStatus('paid')
      cleanupRef.current?.()
      sendReceiptEmail({ ...orderData, transactionId: data?.transaction_id })
    }
    const unsub = subscribeToPayment(oid, onPaid)
    pollPaymentStatus(oid, onPaid).then(stop => { cleanupRef.current = () => { unsub(); stop() } })
    cleanupRef.current = unsub
    // Store orderData for physical charge button
    orderDataRef.current = orderData
  }

  const submitOrder = async () => {
    setLoading(true); setError(null)
    try {
      const orderPayload = { orderId, staff:staff?.name||'Staff', buyer:{...buyer}, items:cartItems.map(i=>({key:i.key,name:i.sauce.name,type:i.type,qty:i.qty,price:i.price})), subtotal, discountAmt, shippingAmt, total, payMethod, timestamp:new Date().toISOString() }
      await saveOrder(orderPayload)
      if (payMethod === 'charge') {
        const chargeNow = paymentPlan === 'full' ? fullAmount : depositAmount
        const res  = await fetch('/.netlify/functions/create-payment-link', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({orderId,amount:chargeNow,buyer:orderPayload.buyer}) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error||'Failed to create payment link')
        setPaymentUrl(data.paymentUrl); setPayStatus('waiting'); setStep('waiting')
        startPolling(orderId, {
          ...orderPayload,
          paymentPlan,
          customDepositPct: parseFloat(customDepositPct) || 0,
          amountCharged:    depositAmount,
        })
      } else { setStep('done') }
    } catch (err) { console.error('Order error:', err); setError(err.message||'Something went wrong.') }
    finally { setLoading(false) }
  }

  const reset = () => {
    cleanupRef.current?.()
    setCart({}); setBuyer({store:'',name:'',email:'',phone:'',address:'',city:'',state:'',zip:'',fulfillment:'ship'})
    setPayMethod(null); setStep('build'); setError(null); setPaymentUrl(null); setPayStatus('idle')
    setEmailSent(false); setEmailSending(false); setShowDiscount(false); setDiscountValue(''); setDiscountType('%'); setShipping('0.00'); setShowPaymentModal(false); setPaymentPlan(null); setCustomDepositPct('25'); setQrDataUrl(null); setShowPhysicalConfirm(false)
  }

  // WAITING
  if (step === 'waiting') return (
    <div style={{background:'#0A0A0A',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 24px',textAlign:'center'}}>
      {payStatus === 'paid' ? (
        <>
          <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(39,201,106,0.15)',border:'2px solid #27C96A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,marginBottom:24}}>✓</div>
          <h2 style={{...hdg,fontSize:34,marginBottom:8}}>Payment Complete!</h2>
          <p style={{color:'rgba(255,255,255,0.45)',fontSize:15,marginBottom:4,fontFamily:'Work Sans, sans-serif'}}>{buyer.store} — {fmtN(total)}</p>
          <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,fontFamily:'Work Sans, sans-serif',marginBottom:32}}>Order {orderId}</p>
          <button onClick={reset} style={{padding:'15px 44px',background:'#E8341C',border:'none',borderRadius:14,color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em'}}>NEW ORDER</button>
        </>
      ) : (
        <>
          <div style={{position:'relative',width:80,height:80,marginBottom:28}}>
            <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(232,52,28,0.2)',animation:'ping 1.5s ease-in-out infinite'}}/>
            <div style={{position:'relative',width:80,height:80,borderRadius:'50%',background:'rgba(232,52,28,0.15)',border:'2px solid #E8341C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>💳</div>
          </div>
          <h2 style={{...hdg,fontSize:28,marginBottom:6}}>Waiting for Payment</h2>
          <p style={{color:'rgba(255,255,255,0.45)',fontSize:14,marginBottom:20,fontFamily:'Work Sans, sans-serif'}}>
            {buyer.name} — <strong style={{color:'#E8341C'}}>{fmtN(depositAmount)}</strong>
          </p>

          <div style={{width:'100%',maxWidth:460,display:'flex',flexDirection:'column',gap:12}}>

            {/* Payment link card */}
            <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,padding:18}}>
              <p style={{...lbl,marginBottom:12}}>Send Payment Link</p>

              {/* QR code + actions side by side */}
              <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                {/* QR Code */}
                {qrDataUrl && (
                  <div style={{flexShrink:0,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:10,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                    <img src={qrDataUrl} alt="Payment QR" style={{width:110,height:110,borderRadius:8}}/>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:'Work Sans, sans-serif',letterSpacing:'0.08em'}}>SCAN TO PAY</span>
                  </div>
                )}
                {/* Actions */}
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                  <button onClick={()=>{const a=document.createElement('a');a.href=paymentUrl;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();document.body.removeChild(a)}}
                    style={{width:'100%',padding:'12px',background:'#E8341C',border:'none',borderRadius:11,color:'#fff',fontSize:13,fontWeight:900,cursor:'pointer',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em'}}>🔗 OPEN LINK</button>
                  <div style={{display:'flex',gap:7}}>
                    <button onClick={()=>navigator.clipboard.writeText(paymentUrl)} style={{flex:1,padding:10,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'Work Sans, sans-serif'}}>📋 Copy</button>
                    {buyer.email&&<button onClick={sendPaymentEmail} disabled={emailSending||emailSent}
                      style={{flex:1,padding:10,background:emailSent?'rgba(39,201,106,0.15)':'rgba(255,255,255,0.08)',border:`1px solid ${emailSent?'rgba(39,201,106,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:9,color:emailSent?'#27C96A':'#fff',fontSize:11,fontWeight:700,cursor:emailSent||emailSending?'default':'pointer',fontFamily:'Work Sans, sans-serif',opacity:emailSending?0.6:1}}>
                      {emailSending?'...':emailSent?'✓ Sent!':'✉️ Email'}
                    </button>}
                    {buyer.phone&&<button onClick={()=>window.open(`sms:${buyer.phone}?body=Hi ${buyer.name}! Complete your Hi! Sauce payment of ${fmtN(depositAmount)}: ${paymentUrl}`,'_blank')}
                      style={{flex:1,padding:10,background:'rgba(232,52,28,0.15)',border:'1px solid rgba(232,52,28,0.4)',borderRadius:9,color:'#E8341C',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'Work Sans, sans-serif'}}>💬 SMS</button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Physical charge card */}
            <div style={{background:'rgba(39,201,106,0.07)',border:'1px solid rgba(39,201,106,0.25)',borderRadius:18,padding:18}}>
              <p style={{...lbl,color:'rgba(39,201,106,0.6)',marginBottom:8}}>Charge with Card Reader</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',fontFamily:'Work Sans, sans-serif',margin:'0 0 12px',lineHeight:1.5}}>
                Use the MX Merchant app + CX3 reader to charge in person, then confirm below.
              </p>
              {!showPhysicalConfirm ? (
                <button onClick={()=>setShowPhysicalConfirm(true)}
                  style={{width:'100%',padding:'13px',background:'rgba(39,201,106,0.15)',border:'2px solid rgba(39,201,106,0.5)',borderRadius:11,color:'#27C96A',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em'}}>
                  ✓ MARK AS PHYSICALLY CHARGED
                </button>
              ) : (
                <div style={{background:'rgba(39,201,106,0.1)',border:'1px solid rgba(39,201,106,0.35)',borderRadius:12,padding:14}}>
                  <p style={{fontSize:13,fontWeight:700,color:'#27C96A',fontFamily:'Work Sans, sans-serif',margin:'0 0 12px'}}>
                    Confirm {fmtN(depositAmount)} was charged via card reader?
                  </p>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setShowPhysicalConfirm(false)}
                      style={{flex:1,padding:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Work Sans, sans-serif'}}>Cancel</button>
                    <button onClick={()=>markPhysicallyCharged(orderDataRef.current)} disabled={physicalLoading}
                      style={{flex:2,padding:'10px',background:'#27C96A',border:'none',borderRadius:9,color:'#fff',fontSize:14,fontWeight:900,cursor:physicalLoading?'wait':'pointer',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em',opacity:physicalLoading?0.7:1}}>
                      {physicalLoading ? 'CONFIRMING...' : '✓ CONFIRM PAYMENT'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p style={{color:'rgba(255,255,255,0.18)',fontSize:11,fontFamily:'Work Sans, sans-serif',textAlign:'center'}}>Screen updates automatically when online payment is received</p>
            <button onClick={reset} style={{padding:'8px 24px',background:'transparent',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,color:'rgba(255,255,255,0.3)',fontSize:12,cursor:'pointer',fontFamily:'Work Sans, sans-serif',alignSelf:'center'}}>Cancel Order</button>
          </div>
        </>
      )}
      <style>{`@keyframes ping{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.3);opacity:0}}`}</style>
    </div>
  )

  // DONE
  if (step === 'done') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:'40px 32px',background:'#0A0A0A'}}>
      <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(59,130,246,0.15)',border:'2px solid #3B82F6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,marginBottom:24}}>📧</div>
      <h2 style={{...hdg,fontSize:34,marginBottom:8}}>Order Saved</h2>
      <p style={{color:'rgba(255,255,255,0.4)',fontSize:15,marginBottom:4,fontFamily:'Work Sans, sans-serif'}}>{buyer.store} — {fmtN(total)}</p>
      <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,fontFamily:'Work Sans, sans-serif'}}>Invoice sent to {buyer.email} within 48 hours</p>
      <button onClick={reset} style={{marginTop:36,padding:'15px 44px',background:'#E8341C',border:'none',borderRadius:14,color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em'}}>NEW ORDER</button>
    </div>
  )

  // REVIEW
  if (step === 'review') return (
    <div style={{background:'#060606',height:'100%',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 12px 32px'}}>
      <div style={{width:'100%',maxWidth:680,background:'rgba(18,18,18,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:'28px 24px',backdropFilter:'blur(20px)'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
        <h2 style={{...hdg,fontSize:22,marginBottom:0}}>Review & Pay</h2>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'Work Sans, sans-serif',letterSpacing:'0.1em'}}>STEP 3 OF 3</span>
      </div>
      {error&&<div style={{background:'rgba(232,52,28,0.15)',border:'1px solid rgba(232,52,28,0.4)',borderRadius:12,padding:'12px 16px',marginBottom:16,color:'#E8341C',fontSize:13,fontFamily:'Work Sans, sans-serif'}}>⚠️ {error}</div>}
      <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:18,padding:18,marginBottom:14}}>
        <p style={lbl}>Buyer</p>
        <p style={{fontSize:18,fontWeight:900,fontFamily:'Impact, sans-serif',letterSpacing:'0.04em'}}>{buyer.store}</p>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:3,fontFamily:'Work Sans, sans-serif'}}>{buyer.name} · {buyer.email} · {buyer.phone}</p>
      </div>
      <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:18,padding:18,marginBottom:14}}>
        <p style={lbl}>Order {orderId}</p>
        {cartItems.map(i=>(
          <div key={i.key} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.65)',fontFamily:'Work Sans, sans-serif'}}>{i.sauce.name} {i.type} × {i.qty}</span>
            <span style={{fontSize:13,fontWeight:700,fontFamily:'Impact, sans-serif',color:'rgba(255,255,255,0.85)'}}>{fmtN(i.price*i.qty)}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:6}}>
          <span style={{fontFamily:'Work Sans, sans-serif',color:'rgba(255,255,255,0.4)',fontSize:12}}>Subtotal</span>
          <span style={{fontFamily:'Impact, sans-serif',fontSize:16,color:'rgba(255,255,255,0.7)'}}>{fmtN(subtotal)}</span>
        </div>
        {discountAmt>0&&<div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
          <span style={{fontFamily:'Work Sans, sans-serif',color:'#27C96A',fontSize:12}}>Discount {discountType==='%'?`(${discountValue}%)`:'(fixed)'}</span>
          <span style={{fontFamily:'Impact, sans-serif',fontSize:16,color:'#27C96A'}}>−{fmtN(discountAmt)}</span>
        </div>}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
          <span style={{fontFamily:'Work Sans, sans-serif',color:'rgba(255,255,255,0.4)',fontSize:12}}>Shipping</span>
          <span style={{fontFamily:'Impact, sans-serif',fontSize:16,color:shippingAmt>0?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.3)'}}>{shippingAmt>0?fmtN(shippingAmt):'—'}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <span style={{fontFamily:'Work Sans, sans-serif',fontWeight:700,color:'rgba(255,255,255,0.6)',fontSize:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>Total</span>
          <span style={{fontFamily:'Impact, sans-serif',fontSize:24,color:'#E8341C'}}>{fmtN(total)}</span>
        </div>
      </div>
      <p style={{...lbl,marginBottom:10}}>Payment Method</p>
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        {[{id:'charge',label:'CHARGE NOW',icon:'💳',color:'#27C96A',desc:'Send payment link via SMS/email'},{id:'invoice',label:'INVOICE LATER',icon:'📧',color:'#3B82F6',desc:'Net 30 · sent within 48hrs'}].map(m=>(
          <button key={m.id} onClick={()=>setPayMethod(m.id)} style={{flex:1,padding:'18px 12px',borderRadius:16,cursor:'pointer',textAlign:'center',background:payMethod===m.id?`${m.color}18`:'rgba(255,255,255,0.04)',border:`2px solid ${payMethod===m.id?m.color:'rgba(255,255,255,0.09)'}`,transition:'all 0.2s'}}>
            <div style={{fontSize:28}}>{m.icon}</div>
            <div style={{fontSize:13,fontWeight:900,color:payMethod===m.id?m.color:'rgba(255,255,255,0.7)',marginTop:8,fontFamily:'Impact, sans-serif',letterSpacing:'0.06em'}}>{m.label}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4,fontFamily:'Work Sans, sans-serif'}}>{m.desc}</div>
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>setStep('info')} style={{flex:1,padding:14,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'rgba(255,255,255,0.5)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Work Sans, sans-serif'}}>BACK</button>
        <button onClick={payMethod==='charge'?()=>setShowPaymentModal(true):submitOrder} disabled={!payMethod||loading} style={{flex:2,padding:14,background:payMethod&&!loading?'#E8341C':'rgba(255,255,255,0.08)',border:'none',borderRadius:12,color:'#fff',fontSize:16,fontWeight:900,cursor:payMethod&&!loading?'pointer':'not-allowed',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em',opacity:payMethod&&!loading?1:0.4}}>
          {loading?'PROCESSING...':payMethod==='charge'?'SELECT PAYMENT PLAN →':'CONFIRM ORDER →'}
        </button>
      </div>

      {/* Payment Plan Modal */}
      {showPaymentModal && (
        <div style={{position:'fixed',inset:0,zIndex:300,backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{width:'100%',maxWidth:500,background:'rgba(16,16,16,0.98)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:28,padding:'28px 24px',boxShadow:'0 24px 80px rgba(0,0,0,0.8)'}}>

            {/* Modal header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
              <div>
                <p style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'0.18em',fontFamily:'Work Sans, sans-serif',textTransform:'uppercase',marginBottom:4}}>Select Payment Plan</p>
                <p style={{fontFamily:'Impact, sans-serif',fontSize:24,color:'#fff',letterSpacing:'0.02em'}}>Order Total: <span style={{color:'#E8341C'}}>{fmtN(total)}</span></p>
              </div>
              <button onClick={()=>setShowPaymentModal(false)} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>

              {/* Option 1 — 50/50 */}
              <button onClick={()=>setPaymentPlan('50-50')} style={{padding:'18px 20px',borderRadius:18,cursor:'pointer',textAlign:'left',background:paymentPlan==='50-50'?'rgba(232,52,28,0.12)':'rgba(255,255,255,0.04)',border:`2px solid ${paymentPlan==='50-50'?'#E8341C':'rgba(255,255,255,0.09)'}`,transition:'all 0.18s'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontFamily:'Impact, sans-serif',fontSize:17,color:paymentPlan==='50-50'?'#E8341C':'#fff',letterSpacing:'0.04em'}}>50% DEPOSIT · 50% ON SHIPMENT</span>
                  {paymentPlan==='50-50'&&<span style={{fontSize:11,fontWeight:700,color:'#E8341C',fontFamily:'Work Sans, sans-serif'}}>✓ SELECTED</span>}
                </div>
                <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                  <span style={{fontFamily:'Impact, sans-serif',fontSize:26,color:paymentPlan==='50-50'?'#E8341C':'rgba(255,255,255,0.8)',letterSpacing:'0.02em'}}>{fmtN(total*0.5)}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontFamily:'Work Sans, sans-serif'}}>due now · {fmtN(total*0.5)} on delivery</span>
                </div>
              </button>

              {/* Option 2 — Full with 5% discount */}
              <button onClick={()=>setPaymentPlan('full')} style={{padding:'18px 20px',borderRadius:18,cursor:'pointer',textAlign:'left',background:paymentPlan==='full'?'rgba(39,201,106,0.1)':'rgba(255,255,255,0.04)',border:`2px solid ${paymentPlan==='full'?'#27C96A':'rgba(255,255,255,0.09)'}`,transition:'all 0.18s',position:'relative',overflow:'hidden'}}>
                {/* Save badge */}
                <div style={{position:'absolute',top:0,right:0,background:'#27C96A',color:'#fff',fontSize:11,fontWeight:900,fontFamily:'Impact, sans-serif',letterSpacing:'0.06em',padding:'5px 14px',borderRadius:'0 18px 0 14px'}}>SAVE {fmtN(fullDiscount)}</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontFamily:'Impact, sans-serif',fontSize:17,color:paymentPlan==='full'?'#27C96A':'#fff',letterSpacing:'0.04em'}}>PAY IN FULL · 5% OFF</span>
                  {paymentPlan==='full'&&<span style={{fontSize:11,fontWeight:700,color:'#27C96A',fontFamily:'Work Sans, sans-serif'}}>✓ SELECTED</span>}
                </div>
                <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                  <span style={{fontFamily:'Impact, sans-serif',fontSize:26,color:paymentPlan==='full'?'#27C96A':'rgba(255,255,255,0.8)',letterSpacing:'0.02em'}}>{fmtN(fullAmount)}</span>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontFamily:'Work Sans, sans-serif',textDecoration:'line-through'}}>{fmtN(total)}</span>
                  <span style={{fontSize:12,color:'#27C96A',fontFamily:'Work Sans, sans-serif'}}>5% discount applied</span>
                </div>
              </button>

              {/* Option 3 — Custom deposit */}
              <button onClick={()=>setPaymentPlan('custom')} style={{padding:'18px 20px',borderRadius:18,cursor:'pointer',textAlign:'left',background:paymentPlan==='custom'?'rgba(59,130,246,0.1)':'rgba(255,255,255,0.04)',border:`2px solid ${paymentPlan==='custom'?'#3B82F6':'rgba(255,255,255,0.09)'}`,transition:'all 0.18s'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontFamily:'Impact, sans-serif',fontSize:17,color:paymentPlan==='custom'?'#3B82F6':'#fff',letterSpacing:'0.04em'}}>CUSTOM DEPOSIT</span>
                  {paymentPlan==='custom'&&<span style={{fontSize:11,fontWeight:700,color:'#3B82F6',fontFamily:'Work Sans, sans-serif'}}>✓ SELECTED</span>}
                </div>
                {paymentPlan==='custom' ? (
                  <div style={{display:'flex',alignItems:'center',gap:12}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                      <input type="range" min="1" max="99" step="1" value={customDepositPct} onChange={e=>setCustomDepositPct(e.target.value)}
                        style={{flex:1,accentColor:'#3B82F6'}}/>
                      <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.08)',borderRadius:8,padding:'4px 10px',minWidth:60}}>
                        <input type="number" min="1" max="99" value={customDepositPct} onChange={e=>setCustomDepositPct(e.target.value)}
                          style={{width:32,background:'transparent',border:'none',color:'#fff',fontSize:16,fontFamily:'Impact, sans-serif',outline:'none',textAlign:'center'}}/>
                        <span style={{color:'rgba(255,255,255,0.5)',fontSize:14,fontFamily:'Work Sans, sans-serif'}}>%</span>
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:'Impact, sans-serif',fontSize:22,color:'#3B82F6'}}>{fmtN(depositAmount)}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontFamily:'Work Sans, sans-serif'}}>due now</div>
                    </div>
                  </div>
                ) : (
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontFamily:'Work Sans, sans-serif',margin:0}}>Choose any percentage of the total as your deposit</p>
                )}
              </button>
            </div>

            {/* Confirm button */}
            <button
              onClick={()=>{ setShowPaymentModal(false); submitOrder() }}
              disabled={!paymentPlan||loading}
              style={{width:'100%',padding:16,background:paymentPlan?'#E8341C':'rgba(255,255,255,0.08)',border:'none',borderRadius:14,color:'#fff',fontSize:17,fontWeight:900,cursor:paymentPlan?'pointer':'not-allowed',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em',opacity:paymentPlan?1:0.4,transition:'all 0.18s'}}
            >
              {loading?'PROCESSING...':`SEND PAYMENT LINK — ${fmtN(depositAmount)} →`}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )

  // INFO
  if (step === 'info') return (
    <div style={{background:'#060606',height:'100%',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 12px 32px'}}>
      <div style={{width:'100%',maxWidth:680,background:'rgba(18,18,18,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:'28px 24px',backdropFilter:'blur(20px)'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
        <h2 style={{...hdg,fontSize:22,marginBottom:0}}>Buyer Info</h2>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'Work Sans, sans-serif',letterSpacing:'0.1em'}}>STEP 2 OF 3</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:13}}>
        {[{key:'store',label:'Store Name',ph:'Cloud 9 Smoke Shop'},{key:'name',label:'Buyer Name',ph:'John Smith'},{key:'email',label:'Email',ph:'john@store.com',type:'email'},{key:'phone',label:'Phone',ph:'(555) 123-4567',type:'tel'},{key:'address',label:'Shipping Address',ph:'123 Main St'}].map(f=>(
          <div key={f.key}><label style={lbl}>{f.label}</label><input type={f.type||'text'} placeholder={f.ph} value={buyer[f.key]} onChange={e=>setBuyer({...buyer,[f.key]:e.target.value})} style={inp}/></div>
        ))}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1.5fr',gap:10}}>
          <div><label style={lbl}>City</label><input placeholder="Miami" value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>State</label><select value={buyer.state} onChange={e=>setBuyer({...buyer,state:e.target.value})} style={{...inp,appearance:'none'}}><option value="">--</option>{US_STATES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>Zip</label><input placeholder="33101" value={buyer.zip} onChange={e=>setBuyer({...buyer,zip:e.target.value})} style={inp}/></div>
        </div>

        {/* Fulfillment */}
        <div>
          <label style={lbl}>Fulfillment</label>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            {[{id:'ship',label:'Ship to Store'},{id:'distro',label:'Demand Distro'},{id:'pickup',label:'Show Pickup'}].map(o=>(
              <button key={o.id} onClick={()=>setBuyer({...buyer,fulfillment:o.id})} style={{flex:1,padding:'11px 6px',borderRadius:10,cursor:'pointer',background:buyer.fulfillment===o.id?'rgba(232,52,28,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${buyer.fulfillment===o.id?'rgba(232,52,28,0.5)':'rgba(255,255,255,0.09)'}`,color:buyer.fulfillment===o.id?'#E8341C':'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,fontFamily:'Work Sans, sans-serif'}}>{o.label}</button>
            ))}
          </div>
          {/* Shipping charge */}
          <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 14px'}}>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.4)',fontFamily:'Work Sans, sans-serif',flex:1}}>Shipping charge <span style={{color:'rgba(255,255,255,0.2)'}}>(default $0)</span></span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>$</span>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={shipping} onChange={e=>setShipping(e.target.value)}
                style={{...inp,width:80,padding:'8px 10px',textAlign:'right',fontSize:14}}/>
            </div>
          </div>
        </div>

        {/* Discount */}
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:showDiscount?10:0}}>
            <label style={{...lbl,marginBottom:0}}>Discount</label>
            <button onClick={()=>{setShowDiscount(!showDiscount);if(showDiscount)setDiscountValue('')}}
              style={{fontSize:11,fontWeight:700,color:showDiscount?'#E8341C':'#27C96A',background:'transparent',border:`1px solid ${showDiscount?'rgba(232,52,28,0.4)':'rgba(39,201,106,0.4)'}`,borderRadius:8,padding:'4px 12px',cursor:'pointer',fontFamily:'Work Sans, sans-serif'}}>
              {showDiscount?'✕ Remove':'+ Add Discount'}
            </button>
          </div>
          {showDiscount&&(
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{display:'flex',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                {['%','$'].map(t=>(
                  <button key={t} onClick={()=>setDiscountType(t)} style={{padding:'11px 18px',background:discountType===t?'#E8341C':'rgba(255,255,255,0.05)',border:'none',color:discountType===t?'#fff':'rgba(255,255,255,0.4)',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'Impact, sans-serif'}}>{t}</button>
                ))}
              </div>
              <input type="number" min="0" max={discountType==='%'?100:undefined} step={discountType==='%'?1:0.01}
                placeholder={discountType==='%'?'e.g. 10':'e.g. 5.00'}
                value={discountValue} onChange={e=>setDiscountValue(e.target.value)}
                style={{...inp,flex:1,padding:'11px 14px'}}/>
              {discountAmt>0&&<span style={{fontFamily:'Impact, sans-serif',fontSize:15,color:'#27C96A',whiteSpace:'nowrap',flexShrink:0}}>−{fmtN(discountAmt)}</span>}
            </div>
          )}
        </div>
      </div>
      <div style={{display:'flex',gap:10,marginTop:22}}>
        <button onClick={()=>setStep('build')} style={{flex:1,padding:14,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'rgba(255,255,255,0.5)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Work Sans, sans-serif'}}>BACK</button>
        <button onClick={()=>setStep('review')} disabled={!infoValid} style={{flex:2,padding:14,background:infoValid?'#E8341C':'rgba(255,255,255,0.08)',border:'none',borderRadius:12,color:'#fff',fontSize:16,fontWeight:900,cursor:infoValid?'pointer':'not-allowed',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em',opacity:infoValid?1:0.4}}>REVIEW ORDER →</button>
      </div>
      </div>
    </div>
  )

  // BUILD — floating card layout
  return (
    <div style={{background:'#060606',height:'100%',overflowY:'auto',display:'flex',flexDirection:'column',alignItems:'center',padding:'16px 12px 100px'}}>

      {/* Floating card */}
      <div style={{width:'100%',maxWidth:680,background:'rgba(18,18,18,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:'28px 24px',backdropFilter:'blur(20px)'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
          <h2 style={{...hdg,fontSize:28,marginBottom:0}}>Build Order</h2>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'Work Sans, sans-serif',letterSpacing:'0.1em'}}>STEP 1 OF 3</span>
        </div>

        {/* Packs */}
        <p style={{...lbl,marginBottom:8}}>Convention Packs</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:18}}>
          {PRESETS.map(p=>(
            <button key={p.id} onClick={()=>applyPreset(p)} style={{padding:'12px 10px',borderRadius:14,cursor:'pointer',textAlign:'left',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',transition:'all 0.18s'}}>
              <div style={{fontSize:18,marginBottom:4}}>{p.icon}</div>
              <div style={{fontSize:16,fontWeight:900,color:'#E8341C',fontFamily:'Impact, sans-serif',letterSpacing:'0.04em',textTransform:'uppercase'}}>{p.name}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.42)',fontFamily:'Work Sans, sans-serif',marginTop:4,lineHeight:1.6,whiteSpace:'pre-line'}}>{p.desc}</div>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.18)',fontFamily:'Work Sans, sans-serif',letterSpacing:'0.1em'}}>CUSTOM</span>
          <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
        </div>

        {/* Bottles */}
        <p style={{...lbl,marginBottom:8}}>Bottles — {fmtN(SAUCES[0]?.wholesale||4.5)} ea</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
          {SAUCES.map(s=>{
            const qty=cart[s.id+'-bottle']||0
            return(
              <div key={s.id} style={{padding:'10px 6px',borderRadius:12,textAlign:'center',background:qty>0?'rgba(232,52,28,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${qty>0?'rgba(232,52,28,0.4)':'rgba(255,255,255,0.07)'}`}}>
                <div style={{fontSize:20}}>{s.emoji}</div>
                <div style={{fontSize:14,fontWeight:700,marginTop:4,fontFamily:'Work Sans, sans-serif',color:'rgba(255,255,255,0.75)'}}>{s.shortName}</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:10}}>
                  <button onClick={()=>updateQty(s.id+'-bottle',-1)} style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontSize:22,fontWeight:900,minWidth:26,textAlign:'center',fontFamily:'Impact, sans-serif',color:qty>0?'#E8341C':'#fff'}}>{qty}</span>
                  <button onClick={()=>updateQty(s.id+'-bottle',1)} style={{width:34,height:34,borderRadius:9,background:'#E8341C',border:'none',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sachets */}
        <p style={{...lbl,marginBottom:8}}>Sachets — {fmtN(SAUCES[0]?.sachetWholesale||0.75)} ea</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {SAUCES.map(s=>{
            const qty=cart[s.id+'-sachet']||0
            return(
              <div key={s.id} style={{padding:'10px 6px',borderRadius:12,textAlign:'center',background:qty>0?'rgba(232,52,28,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${qty>0?'rgba(232,52,28,0.4)':'rgba(255,255,255,0.07)'}`}}>
                <div style={{fontSize:20}}>{s.emoji}</div>
                <div style={{fontSize:14,fontWeight:700,marginTop:4,fontFamily:'Work Sans, sans-serif',color:'rgba(255,255,255,0.75)'}}>{s.shortName}</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:10}}>
                  <button onClick={()=>updateQty(s.id+'-sachet',-1)} style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontSize:22,fontWeight:900,minWidth:26,textAlign:'center',fontFamily:'Impact, sans-serif',color:qty>0?'#E8341C':'#fff'}}>{qty}</span>
                  <button onClick={()=>updateQty(s.id+'-sachet',1)} style={{width:34,height:34,borderRadius:9,background:'#E8341C',border:'none',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating cart bar */}
      {cartItems.length>0&&(
        <div style={{position:'fixed',bottom:76,left:'50%',transform:'translateX(-50%)',width:'calc(100% - 24px)',maxWidth:680,zIndex:50,background:'rgba(10,10,10,0.97)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:18,padding:'12px 16px',backdropFilter:'blur(24px)',boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontFamily:'Work Sans, sans-serif',flexShrink:0}}>{cartItems.reduce((s,i)=>s+i.qty,0)} items</span>
            <span style={{fontFamily:'Impact, sans-serif',fontSize:26,color:'#E8341C',letterSpacing:'0.02em',flexShrink:0}}>{fmtN(subtotal)}</span>
            <button onClick={()=>setStep('info')} style={{flex:1,padding:'12px 20px',background:'#E8341C',border:'none',borderRadius:12,color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer',fontFamily:'Impact, sans-serif',letterSpacing:'0.06em',marginLeft:'auto'}}>CONTINUE →</button>
          </div>
        </div>
      )}
    </div>
  )
}