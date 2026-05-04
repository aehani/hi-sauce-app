// Vercel serverless function — payment confirmation webhook
export default async function handler(req, res) {
  console.log('Webhook received:', req.method)

  if (req.method === 'GET') {
    return res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payment Complete — Hi! Sauce</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;flex-direction:column;text-align:center;padding:24px}
h1{font-family:Impact,sans-serif;font-size:48px;letter-spacing:.04em;text-transform:uppercase;background:linear-gradient(135deg,#F5ECD7,#E8341C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
p{color:rgba(255,255,255,.5);font-size:16px;margin-bottom:32px}
.btn{background:#E8341C;color:#fff;border:none;padding:16px 40px;border-radius:14px;font-size:16px;font-family:Impact,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-block}</style>
</head>
<body>
  <div style="font-size:64px;margin-bottom:24px">✓</div>
  <h1>Payment Complete!</h1>
  <p>Your Hi! Sauce order has been received.</p>
  <a href="javascript:window.close()" class="btn">Close Window</a>
</body>
</html>`)
  }

  const body = req.body || {}
  let orderId, transactionId, status

  try {
    if (body.PONumber || body.poNumber) {
      orderId       = body.PONumber || body.poNumber
      transactionId = body.transactionId || body.id || body.receiptNumber
      status        = (body.status === 'Approved' || body.approved === true || body.responseCode === '00') ? 'paid' : 'failed'
    } else if (body.payload || body.eventType) {
      orderId       = body.payload?.invoiceNumber
      transactionId = body.payload?.id
      status        = body.eventType?.includes('authCaptureTransaction') ? 'paid' : 'failed'
    }
  } catch (e) {
    console.error('Webhook parse error:', e)
  }

  console.log('Payment parsed:', { orderId, transactionId, status })

  if (orderId && status === 'paid') {
    try {
      const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ payment_status: 'paid', transaction_id: transactionId, paid_at: new Date().toISOString() })
        })
        console.log('Supabase updated for order:', orderId)
      }
    } catch (err) {
      console.error('Supabase update error:', err)
    }
  }

  return res.status(200).send('')
}