import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function saveOrder(order) {
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      order_id:        order.orderId,
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
      items:           order.items,
      subtotal:        order.subtotal,
      pay_method:      order.payMethod,
      payment_status:  order.payMethod === 'invoice' ? 'pending' : 'awaiting_payment',
      transaction_id:  null,
      paid_at:         null,
      created_at:      order.timestamp,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export function subscribeToPayment(orderId, onPaid) {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes', {
      event:  'UPDATE',
      schema: 'public',
      table:  'orders',
      filter: `order_id=eq.${orderId}`,
    }, (payload) => {
      if (payload.new?.payment_status === 'paid') onPaid(payload.new)
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export async function pollPaymentStatus(orderId, onPaid, intervalMs = 5000) {
  const id = setInterval(async () => {
    const { data } = await supabase
      .from('orders')
      .select('payment_status, transaction_id, paid_at')
      .eq('order_id', orderId)
      .single()
    if (data?.payment_status === 'paid') {
      onPaid(data)
      clearInterval(id)
    }
  }, intervalMs)
  return () => clearInterval(id)
}