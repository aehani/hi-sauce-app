// Vercel serverless function — sends payment receipt email
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' })
  }

  const {
    buyerEmail, buyerName, storeName,
    orderId, items,
    subtotal, discountAmt, shippingAmt, total,
    paymentPlan, customDepositPct,
    amountCharged, transactionId,
  } = req.body || {}

  if (!buyerEmail) return res.status(400).json({ error: 'Missing buyerEmail' })

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
  const balanceDue   = paymentPlan === 'full' ? 0 : Math.max(0, total - amountCharged)
  const discount5pct = paymentPlan === 'full' ? (total * 0.05) : 0

  const planLabel = paymentPlan === '50-50'  ? '50% Deposit — 50% on Shipment'
    : paymentPlan === 'full'   ? 'Paid in Full (5% Discount Applied)'
    : paymentPlan === 'custom' ? `${customDepositPct}% Deposit`
    : 'Payment'

  const balanceNote = balanceDue > 0
    ? `<div style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35);border-radius:14px;padding:18px 20px;margin-bottom:24px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#3B82F6;letter-spacing:0.14em;text-transform:uppercase;font-family:sans-serif">Balance Due on Shipment</p>
        <p style="margin:0 0 8px;font-family:Impact,Arial,sans-serif;font-size:32px;color:#3B82F6;letter-spacing:0.04em">${fmt(balanceDue)}</p>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);font-family:sans-serif">The remaining balance will be collected when your order is ready to ship. We'll reach out before charging.</p>
      </div>`
    : `<div style="background:rgba(39,201,106,0.12);border:1px solid rgba(39,201,106,0.35);border-radius:14px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#27C96A;font-family:sans-serif">✓ Paid in Full — No balance remaining</p>
      </div>`

  const itemRows = (items || []).map(item =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-size:13px;font-family:sans-serif">${item.name} ${item.type} × ${item.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.85);font-size:13px;text-align:right;font-family:Impact,Arial,sans-serif;letter-spacing:0.04em">${fmt(item.price * item.qty)}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:linear-gradient(135deg,#1a0800,#0f0f0f);border-radius:20px 20px 0 0;padding:32px 36px 24px;text-align:center;border-bottom:2px solid #E8341C">
    <h1 style="margin:0 0 4px;font-family:Impact,Arial,sans-serif;font-size:40px"><span style="color:#F5ECD7">HI!</span> <span style="color:#E8341C">SAUCE</span></h1>
    <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:0.16em;text-transform:uppercase">Payment Receipt</p>
  </td></tr>
  <tr><td style="background:#111;padding:28px 36px;border-radius:0 0 20px 20px">
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.5);font-size:14px">Hi ${buyerName || 'there'},</p>
    <p style="margin:0 0 24px;color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6">
      Your payment for <strong style="color:#E8341C">Hi! Sauce</strong> order from <strong style="color:#fff">${storeName || ''}</strong> has been received.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;margin-bottom:20px">
      <tr><td style="padding:20px 24px">
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Order</p>
        <p style="margin:0 0 14px;font-family:Impact,Arial,sans-serif;font-size:16px;color:#fff;letter-spacing:0.04em">${orderId}</p>
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Payment Plan</p>
        <p style="margin:0 0 14px;color:rgba(255,255,255,0.7);font-size:13px">${planLabel}</p>
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Charged Today</p>
        <p style="margin:0;font-family:Impact,Arial,sans-serif;font-size:34px;color:#27C96A;letter-spacing:0.04em">${fmt(amountCharged)}</p>
        ${paymentPlan === 'full' ? `<p style="margin:4px 0 0;font-size:12px;color:#27C96A">5% discount applied — saved ${fmt(discount5pct)}</p>` : ''}
        ${transactionId ? `<p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.2)">TXN: ${transactionId}</p>` : ''}
      </td></tr>
    </table>
    ${balanceNote}
    <p style="margin:0 0 10px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Order Items</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      ${itemRows}
      <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px;font-family:sans-serif">Subtotal</td><td style="padding:8px 0;color:rgba(255,255,255,0.6);font-size:12px;text-align:right;font-family:sans-serif">${fmt(subtotal)}</td></tr>
      ${discountAmt > 0 ? `<tr><td style="padding:4px 0;color:#27C96A;font-size:12px;font-family:sans-serif">Discount</td><td style="padding:4px 0;color:#27C96A;font-size:12px;text-align:right;font-family:sans-serif">−${fmt(discountAmt)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:rgba(255,255,255,0.4);font-size:12px;font-family:sans-serif">Shipping</td><td style="padding:4px 0;color:rgba(255,255,255,0.4);font-size:12px;text-align:right;font-family:sans-serif">${shippingAmt > 0 ? fmt(shippingAmt) : '—'}</td></tr>
      <tr><td colspan="2" style="padding:8px 0"><div style="height:1px;background:rgba(255,255,255,0.12)"></div></td></tr>
      <tr><td style="padding:8px 0 2px;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-family:sans-serif">Order Total</td><td style="padding:8px 0 2px;font-family:Impact,Arial,sans-serif;font-size:20px;color:#E8341C;text-align:right">${fmt(total)}</td></tr>
      <tr><td style="padding:2px 0;color:#27C96A;font-size:12px;font-family:sans-serif">Paid Today ${paymentPlan === 'full' ? `(saved ${fmt(discount5pct)})` : ''}</td><td style="padding:2px 0;font-family:Impact,Arial,sans-serif;font-size:15px;color:#27C96A;text-align:right">${fmt(amountCharged)}</td></tr>
      ${balanceDue > 0 ? `<tr><td style="padding:2px 0;color:#3B82F6;font-size:12px;font-family:sans-serif">Balance on Shipment</td><td style="padding:2px 0;font-family:Impact,Arial,sans-serif;font-size:15px;color:#3B82F6;text-align:right">${fmt(balanceDue)}</td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.8">
      Hi! Sauce · Hemp-Infused Hot Sauce · Coral Springs, FL<br>${orderId}
    </p>
  </td></tr>
</table></td></tr>
</table>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from:    'Hi! Sauce <orders@myhisauce.com>',
        to:      [buyerEmail],
        subject: `Receipt — Hi! Sauce Order ${orderId} · ${fmt(amountCharged)} Received`,
        html,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || `Resend error ${response.status}`)
    return res.status(200).json({ success: true, emailId: data.id })
  } catch (err) {
    console.error('send-receipt-email error:', err)
    return res.status(500).json({ error: err.message })
  }
}