// Netlify serverless function — runs on the server, never exposed to browser
// This is the ONLY place the Admin API token is used

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const SHOPIFY_DOMAIN     = process.env.VITE_SHOPIFY_DOMAIN
  const ADMIN_TOKEN        = process.env.VITE_SHOPIFY_ADMIN_TOKEN

  if (!SHOPIFY_DOMAIN || !ADMIN_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Shopify environment variables on server' })
    }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { cartItems, buyer, staff, subtotal } = body

  // Build line items for Shopify Draft Order
  const line_items = cartItems.map(item => ({
    variant_id: item.variantId,
    quantity: item.qty,
    price: item.price.toFixed(2),
  }))

  const draftOrderPayload = {
    draft_order: {
      line_items,
      customer: {
        first_name: buyer.name?.split(' ')[0] || '',
        last_name:  buyer.name?.split(' ').slice(1).join(' ') || '',
        email:      buyer.email || '',
        phone:      buyer.phone || '',
      },
      shipping_address: {
        first_name: buyer.name?.split(' ')[0] || '',
        last_name:  buyer.name?.split(' ').slice(1).join(' ') || '',
        address1:   buyer.address || '',
        city:       buyer.city || '',
        province:   buyer.state || '',
        zip:        buyer.zip || '',
        country:    'US',
      },
      note: `Booth Order — Staff: ${staff} | Store: ${buyer.store} | Fulfillment: ${buyer.fulfillment}`,
      note_attributes: [
        { name: 'staff_name',   value: staff },
        { name: 'store_name',   value: buyer.store },
        { name: 'fulfillment',  value: buyer.fulfillment },
        { name: 'source',       value: 'Hi! Sauce Booth App' },
      ],
      tags: 'booth-order, convention, hi-sauce',
      // Use custom price from our wholesale pricing
      use_customer_default_address: false,
    }
  }

  try {
    const res = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_TOKEN,
        },
        body: JSON.stringify(draftOrderPayload),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('Shopify Admin API error:', data)
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.errors || 'Shopify API error' })
      }
    }

    const draft = data.draft_order
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:          draft.id,
        name:        draft.name,          // e.g. #D123
        invoiceUrl:  draft.invoice_url,   // shareable link
        adminUrl:    `https://${SHOPIFY_DOMAIN}/admin/draft_orders/${draft.id}`,
      })
    }
  } catch (err) {
    console.error('Function error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}