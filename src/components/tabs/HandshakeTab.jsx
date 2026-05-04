import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { saveOrder } from '../../lib/supabase'

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const genOrderId = () => `HIS-QP-${Date.now().toString(36).toUpperCase()}`

const inp = {
  width: '100%', padding: '14px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff',
  fontSize: 16, fontFamily: 'Work Sans, sans-serif',
  outline: 'none', boxSizing: 'border-box',
}

const lbl = {
  fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.16em', marginBottom: 7, display: 'block',
  fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase',
}

export default function HandshakeTab({ staff }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [amount, setAmount]   = useState('')
  const [memo, setMemo]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [paymentUrl, setPaymentUrl] = useState(null)
  const [qrDataUrl, setQrDataUrl]   = useState(null)
  const [emailSent, setEmailSent]   = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [orderId] = useState(genOrderId)

  const valid = name && email && parseFloat(amount) > 0

  // Generate QR when payment URL is ready
  useEffect(() => {
    if (!paymentUrl) return
    QRCode.toDataURL(paymentUrl, {
      width: 220, margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
    }).then(setQrDataUrl).catch(console.error)
  }, [paymentUrl])

  const createLink = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: parseFloat(amount),
          buyer: { name, email, phone, store: name, address: '', city: '', state: '', zip: '' },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create payment link')
      setPaymentUrl(data.paymentUrl)

      // Save to Supabase
      await saveOrder({
        orderId,
        staff:    staff?.name || 'Staff',
        buyer:    { name, email, phone, store: name, address: '', city: '', state: '', zip: '', fulfillment: 'quickpay' },
        items:    [{ key: 'quickpay', name: memo || 'Quick Pay', type: '', qty: 1, price: parseFloat(amount) }],
        subtotal: parseFloat(amount),
        discountAmt: 0, shippingAmt: 0, total: parseFloat(amount),
        payMethod: 'charge',
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async () => {
    setEmailSending(true)
    try {
      const res = await fetch('/api/send-payment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerEmail: email, buyerName: name,
          storeName: name, orderId,
          amount: parseFloat(amount), paymentUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmailSent(true)
    } catch (err) {
      alert('Email failed: ' + err.message)
    } finally { setEmailSending(false) }
  }

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setAmount(''); setMemo('')
    setPaymentUrl(null); setQrDataUrl(null); setEmailSent(false); setError(null)
  }

  // ── PAYMENT LINK READY ────────────────────────────────────────────────────
  if (paymentUrl) return (
    <div style={{ background: '#060606', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(18,18,18,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
          <h2 style={{ fontFamily: 'Impact, sans-serif', fontSize: 26, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4, background: 'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Payment Ready
          </h2>
          <p style={{ fontFamily: 'Impact, sans-serif', fontSize: 32, color: '#E8341C', letterSpacing: '0.04em', margin: 0 }}>{fmt(amount)}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Work Sans, sans-serif', marginTop: 4 }}>{name} · {orderId}</p>
        </div>

        {/* QR + Actions */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
          {qrDataUrl && (
            <div style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <img src={qrDataUrl} alt="QR" style={{ width: 120, height: 120, borderRadius: 8 }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.1em' }}>SCAN TO PAY</span>
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => { const a = document.createElement('a'); a.href = paymentUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.appendChild(a); a.click(); document.body.removeChild(a) }}
              style={{ width: '100%', padding: '13px', background: '#E8341C', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'Impact, sans-serif', letterSpacing: '0.06em' }}>
              🔗 OPEN LINK
            </button>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => navigator.clipboard.writeText(paymentUrl)}
                style={{ flex: 1, padding: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>
                📋 Copy
              </button>
              <button onClick={sendEmail} disabled={emailSending || emailSent}
                style={{ flex: 1, padding: 11, background: emailSent ? 'rgba(39,201,106,0.15)' : 'rgba(255,255,255,0.08)', border: `1px solid ${emailSent ? 'rgba(39,201,106,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 9, color: emailSent ? '#27C96A' : '#fff', fontSize: 11, fontWeight: 700, cursor: emailSent || emailSending ? 'default' : 'pointer', fontFamily: 'Work Sans, sans-serif', opacity: emailSending ? 0.6 : 1 }}>
                {emailSending ? '...' : emailSent ? '✓ Sent!' : '✉️ Email'}
              </button>
              {phone && (
                <button onClick={() => window.open(`sms:${phone}?body=Hi ${name}! Here is your Hi! Sauce payment link for ${fmt(amount)}: ${paymentUrl}`, '_blank')}
                  style={{ flex: 1, padding: 11, background: 'rgba(232,52,28,0.15)', border: '1px solid rgba(232,52,28,0.4)', borderRadius: 9, color: '#E8341C', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>
                  💬 SMS
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={reset}
          style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Work Sans, sans-serif' }}>
          + New Payment
        </button>
      </div>
    </div>
  )

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#060606', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 40px' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(18,18,18,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontFamily: 'Impact, sans-serif', fontSize: 26, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0, background: 'linear-gradient(135deg, #F5ECD7 0%, #E8341C 60%, #C0200A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Quick Pay
            </h2>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.1em' }}>HANDSHAKE</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: 'Work Sans, sans-serif', margin: 0 }}>
            Create a one-time payment link instantly
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(232,52,28,0.15)', border: '1px solid rgba(232,52,28,0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#E8341C', fontSize: 13, fontFamily: 'Work Sans, sans-serif' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Amount — big and prominent */}
          <div>
            <label style={lbl}>Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 22, color: 'rgba(255,255,255,0.4)', fontFamily: 'Impact, sans-serif' }}>$</span>
              <input
                type="number" min="0.01" step="0.01" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)}
                style={{ ...inp, paddingLeft: 36, fontSize: 24, fontFamily: 'Impact, sans-serif', letterSpacing: '0.04em', color: parseFloat(amount) > 0 ? '#E8341C' : '#fff' }}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>Customer Name</label>
            <input type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} style={inp} />
          </div>

          <div>
            <label style={lbl}>Email</label>
            <input type="email" placeholder="john@store.com" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
          </div>

          <div>
            <label style={lbl}>Phone <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — for SMS)</span></label>
            <input type="tel" placeholder="(555) 123-4567" value={phone} onChange={e => setPhone(e.target.value)} style={inp} />
          </div>

          <div>
            <label style={lbl}>Memo <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input type="text" placeholder="e.g. Sample pack, tasting fee..." value={memo} onChange={e => setMemo(e.target.value)} style={inp} />
          </div>

          <button
            onClick={createLink} disabled={!valid || loading}
            style={{ width: '100%', padding: '16px', background: valid && !loading ? '#E8341C' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 13, color: '#fff', fontSize: 17, fontWeight: 900, cursor: valid && !loading ? 'pointer' : 'not-allowed', fontFamily: 'Impact, sans-serif', letterSpacing: '0.06em', opacity: valid && !loading ? 1 : 0.4, marginTop: 4, transition: 'all 0.2s' }}>
            {loading ? 'CREATING...' : `CREATE PAYMENT LINK${parseFloat(amount) > 0 ? ` — ${fmt(amount)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}