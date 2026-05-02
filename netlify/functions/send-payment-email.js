// Netlify function — sends payment link email via Resend (free tier: 3000 emails/month)
// Sign up at resend.com — it's free and takes 2 minutes

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing RESEND_API_KEY' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { buyerEmail, buyerName, storeName, orderId, amount, paymentUrl } = body

  if (!buyerEmail || !paymentUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or payment URL' }) }
  }

  const formattedAmount = `$${parseFloat(amount).toFixed(2)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hi! Sauce Payment</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Work Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0800,#0A0A0A);border-radius:20px 20px 0 0;padding:40px 40px 30px;text-align:center;border-bottom:2px solid #E8341C;">
              <h1 style="margin:0;font-family:Impact,Arial,sans-serif;font-size:48px;letter-spacing:0.04em;color:#fff;">
                <span style="color:#F5ECD7;">HI!</span>
                <span style="color:#E8341C;">SAUCE</span>
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.4);font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Convention Booth Order</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#111;padding:40px;border-radius:0 0 20px 20px;">

              <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:14px;">Hi ${buyerName || 'there'},</p>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;">
                Thanks for your interest in <strong style="color:#E8341C;">Hi! Sauce</strong>! 
                Your order from <strong style="color:#fff;">${storeName}</strong> is ready for payment.
              </p>

              <!-- Order summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase;">Order Reference</p>
                    <p style="margin:0 0 16px;font-family:Impact,Arial,sans-serif;font-size:20px;color:#fff;letter-spacing:0.04em;">${orderId}</p>
                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.16em;text-transform:uppercase;">Amount Due</p>
                    <p style="margin:0;font-family:Impact,Arial,sans-serif;font-size:36px;color:#E8341C;letter-spacing:0.04em;">${formattedAmount}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" 
                       style="display:inline-block;background:#E8341C;color:#fff;text-decoration:none;font-family:Impact,Arial,sans-serif;font-size:18px;letter-spacing:0.08em;padding:18px 48px;border-radius:14px;">
                      PAY NOW — ${formattedAmount}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:12px;color:rgba(255,255,255,0.3);text-align:center;">
                This payment link expires in 24 hours. Secure payment powered by Authorize.net.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 24px;">

              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;line-height:1.6;">
                Hi! Sauce · Hemp-Infused Hot Sauce<br>
                Questions? Reply to this email or contact us at the booth.<br>
                <span style="color:rgba(255,255,255,0.15);">Order ${orderId}</span>
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    'Hi! Sauce <orders@myhisauce.com>',
        to:      [buyerEmail],
        subject: `Your Hi! Sauce Payment Link — ${formattedAmount}`,
        html,
      }),
    })

    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))

    if (!res.ok) {
      throw new Error(data.message || `Resend API error ${res.status}`)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, emailId: data.id }),
    }
  } catch (err) {
    console.error('send-payment-email error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}