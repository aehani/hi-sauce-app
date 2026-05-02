exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  const API_LOGIN_ID    = process.env.AUTHNET_API_LOGIN_ID
  const TRANSACTION_KEY = process.env.AUTHNET_TRANSACTION_KEY
  const IS_SANDBOX      = process.env.AUTHNET_SANDBOX === 'true'
  const SITE_URL        = process.env.URL || 'https://hi-convention.netlify.app'

  if (!API_LOGIN_ID || !TRANSACTION_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Authorize.net credentials' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { orderId, amount, buyer } = body
  const endpoint = IS_SANDBOX
    ? 'https://apitest.authorize.net/xml/v1/request.api'
    : 'https://api.authorize.net/xml/v1/request.api'

  const payload = {
    getHostedPaymentPageRequest: {
      merchantAuthentication: { name: API_LOGIN_ID, transactionKey: TRANSACTION_KEY },
      transactionRequest: {
        transactionType: 'authCaptureTransaction',
        amount: amount.toFixed(2),
        order: { invoiceNumber: orderId, description: `Hi! Sauce — ${buyer.store}` },
        customer: { email: buyer.email || '' },
        billTo: {
          firstName: buyer.name?.split(' ')[0] || '',
          lastName:  buyer.name?.split(' ').slice(1).join(' ') || '',
          address: buyer.address || '', city: buyer.city || '',
          state: buyer.state || '', zip: buyer.zip || '', country: 'US',
        },
        userFields: { userField: [
          { name: 'orderId',   value: orderId },
          { name: 'storeName', value: buyer.store || '' },
        ]},
      },
      hostedPaymentSettings: { setting: [
        { settingName: 'hostedPaymentReturnOptions', settingValue: JSON.stringify({ showReceipt: true, url: `${SITE_URL}/.netlify/functions/authnet-webhook`, urlText: 'Back to Hi! Sauce', cancelUrl: SITE_URL }) },
        { settingName: 'hostedPaymentButtonOptions',  settingValue: JSON.stringify({ text: 'Pay Now' }) },
        { settingName: 'hostedPaymentStyleOptions',   settingValue: JSON.stringify({ bgColor: '#E8341C' }) },
        { settingName: 'hostedPaymentPaymentOptions', settingValue: JSON.stringify({ cardCodeRequired: true, showCreditCard: true }) },
        { settingName: 'hostedPaymentSecurityOptions',settingValue: JSON.stringify({ captcha: false }) },
        { settingName: 'hostedPaymentShippingAddressOptions', settingValue: JSON.stringify({ show: false, required: false }) },
        { settingName: 'hostedPaymentBillingAddressOptions',  settingValue: JSON.stringify({ show: true, required: false }) },
        { settingName: 'hostedPaymentOrderOptions',   settingValue: JSON.stringify({ show: true, merchantName: 'Hi! Sauce' }) },
      ]},
    }
  }

  try {
    const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    console.log('Authorize.net response:', JSON.stringify(data))

    if (data.messages?.resultCode === 'Error') throw new Error(data.messages?.message?.[0]?.text || 'Authorize.net error')
    if (!data.token) throw new Error('No token returned from Authorize.net')

    const paymentUrl = IS_SANDBOX
      ? `https://test.authorize.net/payment/payment?token=${data.token}`
      : `https://accept.authorize.net/payment/payment?token=${data.token}`

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: data.token, paymentUrl, orderId }) }
  } catch (err) {
    console.error('create-payment-link error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}