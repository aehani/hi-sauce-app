// Vercel serverless function — MX Merchant Link2Pay payment URL
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const MERCHANT_ID = process.env.MXMERCHANT_MERCHANT_ID || '1000193204'
  const DEVICE_ID   = process.env.MXMERCHANT_DEVICE_ID   || '683894b5-9575-4711-b070-45587d67cda6'

  const { orderId, amount, buyer } = req.body || {}

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Missing orderId or amount' })
  }

  const base = `https://pl.mxmerchant.com/mxcustomer/d/${DEVICE_ID}/v3`

  const params = new URLSearchParams({
    Amt:          parseFloat(amount).toFixed(2),
    AllowPartial: '0',
    CustomerName: buyer?.name    || '',
    Email:        buyer?.email   || '',
    Phone:        buyer?.phone   || '',
    Memo:         `Hi! Sauce Order ${orderId}`,
    ShowMemo:     '1',
    PONumber:     orderId,
  })

  if (buyer?.address) params.append('Address', buyer.address)
  if (buyer?.city)    params.append('City',    buyer.city)
  if (buyer?.state)   params.append('State',   buyer.state)
  if (buyer?.zip)     params.append('Zip',     buyer.zip)

  const paymentUrl = `${base}?${params.toString()}`
  console.log('Payment URL created for order:', orderId, 'amount:', amount)

  return res.status(200).json({ paymentUrl, orderId })
}