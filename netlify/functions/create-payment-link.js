// MX Merchant Link2Pay — generates a pre-filled payment page URL
// No API call needed per order — just build the URL with query params
// The Link2Pay device was already created: 683894b5-9575-4711-b070-45587d67cda6

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const MERCHANT_ID = process.env.MXMERCHANT_MERCHANT_ID || '1000193204'
  const DEVICE_ID   = process.env.MXMERCHANT_DEVICE_ID   || '683894b5-9575-4711-b070-45587d67cda6'

  let body
  try { body = JSON.parse(event.body) } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { orderId, amount, buyer } = body

  if (!orderId || !amount) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderId or amount' }) }
  }

  // Base Link2Pay URL — confirmed working format
  const base = `https://pl.mxmerchant.com/mxcustomer/d/${DEVICE_ID}/v3`

  // Pre-populate all fields via query params (from MX Merchant docs)
  const params = new URLSearchParams({
    Amt:          parseFloat(amount).toFixed(2),
    AllowPartial: '0',                                    // lock the amount
    CustomerName: buyer.name    || '',
    Email:        buyer.email   || '',
    Phone:        buyer.phone   || '',
    Memo:         `Hi! Sauce Order ${orderId}`,
    ShowMemo:     '1',
    PONumber:     orderId,
  })

  // Add address fields if available
  if (buyer.address) params.append('Address', buyer.address)
  if (buyer.city)    params.append('City',    buyer.city)
  if (buyer.state)   params.append('State',   buyer.state)
  if (buyer.zip)     params.append('Zip',     buyer.zip)

  const paymentUrl = `${base}?${params.toString()}`

  console.log('Payment URL created for order:', orderId, 'amount:', amount)
  console.log('URL:', paymentUrl)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentUrl, orderId }),
  }
}