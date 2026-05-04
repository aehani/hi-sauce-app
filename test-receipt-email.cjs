const fs = require('fs')
const envFile = fs.readFileSync('.env', 'utf8')
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) process.env[key.trim()] = val.join('=').trim()
})

const RESEND_API_KEY = process.env.RESEND_API_KEY
const fmt = (n) => `$${parseFloat(n||0).toFixed(2)}`

// Test all 3 payment plans
const plans = [
  { paymentPlan: '50-50',  amountCharged: 63.00, label: '50/50 Deposit' },
  { paymentPlan: 'full',   amountCharged: 119.70, label: 'Pay in Full (5% off)' },
  { paymentPlan: 'custom', amountCharged: 31.50, customDepositPct: 25, label: 'Custom 25% Deposit' },
]

const sampleOrder = {
  buyerEmail:  'aehani7@gmail.com',
  buyerName:   'John Smith',
  storeName:   'Cloud 9 Smoke Shop',
  orderId:     'HIS-TEST123',
  items: [
    { name: 'Hi! Buffalo', type: 'bottle', qty: 6,  price: 11.00 },
    { name: 'Hi! Burn',    type: 'bottle', qty: 6,  price: 11.00 },
    { name: 'Hi! BBQ',     type: 'bottle', qty: 6,  price: 11.00 },
    { name: 'Hi! Buffalo', type: 'sachet', qty: 20, price: 2.00  },
    { name: 'Hi! Burn',    type: 'sachet', qty: 20, price: 2.00  },
    { name: 'Hi! BBQ',     type: 'sachet', qty: 20, price: 2.00  },
  ],
  subtotal:    198.00,
  discountAmt: 10.00,
  shippingAmt: 0,
  total:       188.00,
  transactionId: 'TXN-DEMO-999',
}

async function testPlan(plan) {
  console.log(`\nTesting: ${plan.label}`)
  const payload = { ...sampleOrder, ...plan }

  const res  = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from:    'Hi! Sauce <orders@myhisauce.com>',
      to:      [sampleOrder.buyerEmail],
      subject: `[TEST ${plan.label}] Receipt — Hi! Sauce Order ${sampleOrder.orderId}`,
      html:    buildHtml(payload),
    }),
  })
  const data = await res.json()
  console.log('Status:', res.status, res.status === 200 ? '✅' : '❌')
  if (data.id) console.log('Email ID:', data.id)
  if (data.message) console.log('Error:', data.message)
}

function buildHtml({ buyerName, storeName, orderId, items, subtotal, discountAmt, shippingAmt, total, paymentPlan, customDepositPct, amountCharged, transactionId }) {
  const balanceDue = paymentPlan === 'full' ? 0 : total - amountCharged
  const planLabel = paymentPlan === '50-50' ? '50% Deposit — 50% on Shipment'
    : paymentPlan === 'full' ? 'Paid in Full (5% Discount Applied)'
    : `${customDepositPct}% Deposit`

  const balanceNote = balanceDue > 0
    ? `<div style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.4);border-radius:14px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#3B82F6;letter-spacing:0.14em;text-transform:uppercase">Balance Due on Shipment</p>
        <p style="margin:0 0 8px;font-family:Impact,Arial,sans-serif;font-size:30px;color:#3B82F6">${fmt(balanceDue)}</p>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45)">The remaining balance will be collected when your order is ready to ship. We'll reach out before charging.</p>
      </div>`
    : `<div style="background:rgba(39,201,106,0.12);border:1px solid rgba(39,201,106,0.4);border-radius:14px;padding:14px 18px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;font-weight:700;color:#27C96A">✓ Paid in Full — No balance remaining</p>
      </div>`

  const itemRows = items.map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-size:13px">${i.name} ${i.type} × ${i.qty}</td>
     <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.85);font-size:13px;text-align:right;font-family:Impact,Arial,sans-serif">${fmt(i.price*i.qty)}</td></tr>`
  ).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:linear-gradient(135deg,#1a0800,#0f0f0f);border-radius:20px 20px 0 0;padding:32px 36px 24px;text-align:center;border-bottom:2px solid #E8341C">
    <h1 style="margin:0 0 4px;font-family:Impact,Arial,sans-serif;font-size:40px"><span style="color:#F5ECD7">HI!</span> <span style="color:#E8341C">SAUCE</span></h1>
    <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:0.16em;text-transform:uppercase">Payment Receipt</p>
  </td></tr>
  <tr><td style="background:#111;padding:28px 36px;border-radius:0 0 20px 20px">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.5);font-size:14px">Hi ${buyerName},</p>
    <p style="margin:0 0 24px;color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6">Your payment for <strong style="color:#E8341C">Hi! Sauce</strong> order from <strong style="color:#fff">${storeName}</strong> has been received.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;margin-bottom:18px">
      <tr><td style="padding:18px 22px">
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Order</p>
        <p style="margin:0 0 14px;font-family:Impact,Arial,sans-serif;font-size:16px;color:#fff">${orderId}</p>
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Payment Plan</p>
        <p style="margin:0 0 14px;color:rgba(255,255,255,0.7);font-size:13px">${planLabel}</p>
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Charged Today</p>
        <p style="margin:0;font-family:Impact,Arial,sans-serif;font-size:34px;color:#27C96A">${fmt(amountCharged)}</p>
        ${transactionId ? `<p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.2)">TXN: ${transactionId}</p>` : ''}
      </td></tr>
    </table>

    ${balanceNote}

    <p style="margin:0 0 10px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase">Order Items</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      ${itemRows}
      <tr><td style="padding:8px 0;color:rgba(255,255,255,0.4);font-size:12px">Subtotal</td><td style="padding:8px 0;color:rgba(255,255,255,0.6);font-size:12px;text-align:right">${fmt(subtotal)}</td></tr>
      ${discountAmt > 0 ? `<tr><td style="padding:4px 0;color:#27C96A;font-size:12px">Discount</td><td style="padding:4px 0;color:#27C96A;font-size:12px;text-align:right">−${fmt(discountAmt)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:rgba(255,255,255,0.4);font-size:12px">Shipping</td><td style="padding:4px 0;color:rgba(255,255,255,0.4);font-size:12px;text-align:right">${shippingAmt > 0 ? fmt(shippingAmt) : '—'}</td></tr>
      <tr><td colspan="2" style="padding:8px 0"><div style="height:1px;background:rgba(255,255,255,0.12)"></div></td></tr>
      <tr><td style="padding:8px 0 2px;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:0.1em">Order Total</td><td style="padding:8px 0 2px;font-family:Impact,Arial,sans-serif;font-size:20px;color:#E8341C;text-align:right">${fmt(total)}</td></tr>
      <tr><td style="padding:2px 0;color:#27C96A;font-size:12px">Paid Today</td><td style="padding:2px 0;font-family:Impact,Arial,sans-serif;font-size:15px;color:#27C96A;text-align:right">${fmt(amountCharged)}</td></tr>
      ${balanceDue > 0 ? `<tr><td style="padding:2px 0;color:#3B82F6;font-size:12px">Balance on Shipment</td><td style="padding:2px 0;font-family:Impact,Arial,sans-serif;font-size:15px;color:#3B82F6;text-align:right">${fmt(balanceDue)}</td></tr>` : ''}
    </table>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.8">Hi! Sauce · Hemp-Infused Hot Sauce · Coral Springs, FL<br>${orderId}</p>
  </td></tr>
</table></td></tr>
</table></body></html>`
}

async function run() {
  console.log('=== Receipt Email Test — All 3 Payment Plans ===')
  for (const plan of plans) {
    await testPlan(plan)
    await new Promise(r => setTimeout(r, 500)) // small delay between sends
  }
  console.log('\nDone! Check your inbox for 3 test receipt emails.')
}
run().catch(console.error)
