// Vercel serverless function — payment confirmation webhook from MX Merchant
// MX Merchant sends a GET redirect with transaction data in query params
export default async function handler(req, res) {
  console.log('Webhook received:', req.method)
  console.log('Query params:', JSON.stringify(req.query))
  console.log('Body:', JSON.stringify(req.body || {}))

  const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
  const SITE_URL          = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://hi-sauce-app.vercel.app'

  // MX Merchant sends GET with query params after payment
  if (req.method === 'GET') {
    const q             = req.query || {}
    const transId       = q.transId || q.transactionId
    const authCode      = q.authCode
    const orderId       = q.PONumber || q.invoiceNum || q.referenceNum || q.uid
    const receiptNum    = q.receiptNum
    const email         = q.eAddress || q.email

    console.log('GET payment callback:', { transId, authCode, orderId, receiptNum, email })

    // If we have a transId, payment was successful — update Supabase
    if (transId && authCode) {
      // Try to find the order by transaction reference
      // Since invoiceNum may be empty, search by recent awaiting_payment orders
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          let updateOrderId = orderId

          // If no orderId in params, find the most recent awaiting_payment order
          if (!updateOrderId) {
            console.log('No orderId in params — finding most recent awaiting order...')
            const findRes = await fetch(
              `${SUPABASE_URL}/rest/v1/orders?payment_status=eq.awaiting_payment&order=created_at.desc&limit=1`,
              {
                headers: {
                  'apikey':        SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                }
              }
            )
            const orders = await findRes.json()
            if (orders?.[0]) {
              updateOrderId = orders[0].order_id
              console.log('Found order to update:', updateOrderId)
            }
          }

          if (updateOrderId) {
            // Update order to paid
            await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${updateOrderId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type':  'application/json',
                'apikey':        SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer':        'return=minimal',
              },
              body: JSON.stringify({
                payment_status: 'paid',
                transaction_id: transId,
                paid_at:        new Date().toISOString(),
              })
            })
            console.log('✅ Supabase updated for order:', updateOrderId)

            // Fetch full order for receipt email
            const getRes = await fetch(
              `${SUPABASE_URL}/rest/v1/orders?order_id=eq.${updateOrderId}&select=*`,
              {
                headers: {
                  'apikey':        SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                }
              }
            )
            const orders = await getRes.json()
            const orderData = orders?.[0]

            // Send receipt email
            if (orderData?.buyer_email) {
              fetch(`${SITE_URL}/api/send-receipt-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  buyerEmail:      orderData.buyer_email,
                  buyerName:       orderData.buyer_name,
                  storeName:       orderData.store_name,
                  orderId:         orderData.order_id,
                  items:           orderData.items || [],
                  subtotal:        parseFloat(orderData.subtotal || 0),
                  discountAmt:     0,
                  shippingAmt:     0,
                  total:           parseFloat(orderData.subtotal || 0),
                  paymentPlan:     'charge',
                  customDepositPct: 0,
                  amountCharged:   parseFloat(orderData.subtotal || 0),
                  transactionId:   transId,
                }),
              }).then(r => console.log('Receipt email status:', r.status))
                .catch(e => console.error('Receipt email error:', e))
            }
          }
        } catch (err) {
          console.error('Supabase error:', err)
        }
      }
    }

    // Always show the success page to the customer
    return res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payment Complete — Hi! Sauce</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:sans-serif;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;flex-direction:column;text-align:center;padding:24px}
  h1{font-family:Impact,sans-serif;font-size:48px;letter-spacing:.04em;text-transform:uppercase;background:linear-gradient(135deg,#F5ECD7,#E8341C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
  p{color:rgba(255,255,255,.5);font-size:16px;margin-bottom:32px}
  .btn{background:#E8341C;color:#fff;border:none;padding:16px 40px;border-radius:14px;font-size:16px;font-family:Impact,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-block}
</style>
</head>
<body>
  <div style="font-size:64px;margin-bottom:24px">✓</div>
  <h1>Payment Complete!</h1>
  <p>Your Hi! Sauce order has been received.<br>You can close this window.</p>
  <a href="javascript:window.close()" class="btn">Close Window</a>
</body>
</html>`)
  }

  // POST from payment processor
  if (req.method === 'POST') {
    const body = req.body || {}
    let orderId, transactionId, status

    if (body.PONumber || body.poNumber) {
      orderId       = body.PONumber || body.poNumber
      transactionId = body.transactionId || body.id || body.receiptNumber
      status        = (body.status === 'Approved' || body.approved === true || body.responseCode === '00') ? 'paid' : 'failed'
    } else if (body.payload || body.eventType) {
      orderId       = body.payload?.invoiceNumber
      transactionId = body.payload?.id
      status        = body.eventType?.includes('authCaptureTransaction') ? 'paid' : 'failed'
    }

    console.log('POST payment:', { orderId, transactionId, status })

    if (orderId && status === 'paid' && SUPABASE_URL && SUPABASE_ANON_KEY) {
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
    }
  }

  return res.status(200).send('')
}