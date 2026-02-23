// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout Session for an authenticated user's order.
//
// Env vars required:
// - STRIPE_API_KEY
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
// - STRIPE_SUCCESS_URL (https URL; can be another Edge Function that redirects to your app)
// - STRIPE_CANCEL_URL  (https URL)

import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string, {
  apiVersion: '2024-11-20',
})

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string

    // Create a Supabase client that can read the current user from the Authorization header.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    })

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { order_id } = await req.json().catch(() => ({ order_id: null }))
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'Missing order_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch order (RLS ensures user can only read their own order)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (Number(order.total) <= 0) {
      return new Response(JSON.stringify({ error: 'Order total must be > 0' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Order status must be pending to pay (got ${order.status})` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch order items + products
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', order_id)

    if (itemsErr) {
      return new Response(JSON.stringify({ error: itemsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = (items || []).map((it: any) => {
      const name = it?.product?.title || 'Retro Hall Item'
      const unitPrice = Number(it.unit_price)
      const qty = Number(it.quantity || 1)
      return {
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(unitPrice * 100),
          product_data: {
            name,
            description: it?.product?.system ? `System: ${it.product.system}` : undefined,
            images: it?.product?.image_url ? [it.product.image_url] : undefined,
          },
        },
      }
    })

    const successUrlBase = Deno.env.get('STRIPE_SUCCESS_URL') as string
    const cancelUrlBase = Deno.env.get('STRIPE_CANCEL_URL') as string

    // Attach order/user so webhook can update the right row.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      metadata: {
        order_id: String(order_id),
        user_id: String(user.id),
      },
      success_url: `${successUrlBase}?order_id=${encodeURIComponent(String(order_id))}&result=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrlBase}?order_id=${encodeURIComponent(String(order_id))}&result=cancel&session_id={CHECKOUT_SESSION_ID}`,
    })

    // Save session id/url (best-effort)
    await supabase
      .from('orders')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_checkout_url: session.url,
      })
      .eq('id', order_id)
      .eq('user_id', user.id)

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('create-checkout-session error', e)
    return new Response(JSON.stringify({ error: (e as Error).message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
