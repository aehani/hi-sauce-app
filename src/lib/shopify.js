// Storefront API variant IDs for cart/checkout
export const VARIANT_IDS = {
  'buffalo-bottle': import.meta.env.VITE_SHOPIFY_VARIANT_BUFFALO_BOTTLE,
  'burn-bottle':    import.meta.env.VITE_SHOPIFY_VARIANT_BURN_BOTTLE,
  'bbq-bottle':     import.meta.env.VITE_SHOPIFY_VARIANT_BBQ_BOTTLE,
  'buffalo-sachet': import.meta.env.VITE_SHOPIFY_VARIANT_BUFFALO_SACHET,
  'burn-sachet':    import.meta.env.VITE_SHOPIFY_VARIANT_BURN_SACHET,
  'bbq-sachet':     import.meta.env.VITE_SHOPIFY_VARIANT_BBQ_SACHET,
}

/**
 * Creates a Shopify Draft Order via Netlify serverless function.
 * The draft order appears in Shopify POS so staff can charge it
 * with the Tap & Chip card reader.
 *
 * Returns: { id, name, invoiceUrl, adminUrl }
 */
export async function createDraftOrder({ cartItems, buyer, staff, subtotal }) {
  // Attach Shopify variant IDs to each cart item
  const itemsWithVariants = cartItems.map(item => ({
    ...item,
    variantId: VARIANT_IDS[item.key],
  }))

  const missingVariants = itemsWithVariants.filter(i => !i.variantId)
  if (missingVariants.length > 0) {
    console.warn('Missing variant IDs for:', missingVariants.map(i => i.key))
  }

  const res = await fetch('/.netlify/functions/create-draft-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartItems: itemsWithVariants, buyer, staff, subtotal }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Failed to create draft order')
  }

  return data // { id, name, invoiceUrl, adminUrl }
}