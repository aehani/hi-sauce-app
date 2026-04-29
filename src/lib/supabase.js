import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function saveOrder(order) {
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      staff_name:      order.staff,
      store_name:      order.buyer.store,
      buyer_name:      order.buyer.name,
      buyer_email:     order.buyer.email,
      buyer_phone:     order.buyer.phone,
      address:         order.buyer.address,
      city:            order.buyer.city,
      state:           order.buyer.state,
      zip:             order.buyer.zip,
      fulfillment:     order.buyer.fulfillment,
      items:           order.items,          // stored as JSON
      subtotal:        order.subtotal,
      pay_method:      order.payMethod,
      shopify_order_id: order.shopifyOrderId || null,
      created_at:      order.timestamp,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}