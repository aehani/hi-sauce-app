exports.handler = async (event) => {
  console.log('Webhook received:', event.httpMethod, event.body)

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payment Complete</title>
<style>body{font-family:sans-serif;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;flex-direction:column;text-align:center;padding:24px}
h1{font-family:Impact,sans-serif;font-size:48px;letter-spacing:.04em;text-transform:uppercase;background:linear-gradient(135deg,#F5ECD7,#E8341C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
p{color:rgba(255,255,255,.5);font-size:16px;margin-bottom:32px}
.btn{background:#E8341C;color:#fff;border:none;padding:16px 40px;border-radius:14px;font-size:16px;font-family:Impact,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-block}</style>
</head><body><div style="font-size:64px;margin-bottom:24px">✓</div><h1>Payment Complete!</h1>
<p>Your order has been received.</p><a href="javascript:window.close()" class="btn">Close Window</a></body></html>`
    }
  }

  let transactionId, orderId, status

  try {
    const data = JSON.parse(event.body)
    transactionId = data.payload?.id
    orderId       = data.payload?.invoiceNumber
    status        = data.eventType?.includes('authCaptureTransaction') ? 'paid' : 'failed'
  } catch {
    const params  = new URLSearchParams(event.body)
    transactionId = params.get('x_trans_id')
    orderId       = params.get('x_invoice_num')
    status        = params.get('x_response_code') === '1' ? 'paid' : 'failed'
  }

  console.log('Payment parsed:', { transactionId, orderId, status })

  if (orderId && status === 'paid') {
    try {
      const SUPABASE_URL      = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
      const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ payment_status: 'paid', transaction_id: transactionId, paid_at: new Date().toISOString() })
        })
        console.log('Supabase update status:', res.status)
      }
    } catch (err) {
      console.error('Supabase update error:', err)
    }
  }

  return { statusCode: 200, body: '' }
}