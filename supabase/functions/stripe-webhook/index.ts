// Supabase Edge Function: stripe-webhook
// Verifies Stripe webhook signatures and updates orders in Supabase.
//
// Env vars required:
// - STRIPE_API_KEY
// - STRIPE_WEBHOOK_SIGNING_SECRET
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string, {
  apiVersion: '2024-11-20',
})

// Needed for webhook verification in Deno
const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = (await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
      undefined,
      cryptoProvider,
    )) as Stripe.Event
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response((err as Error).message, { status: 400 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string,
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session?.metadata?.order_id

      if (orderId) {
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_payment_intent_id:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
            stripe_checkout_session_id: session.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session?.metadata?.order_id
      if (orderId) {
        // Keep pending, but clear URL so user can regenerate.
        await supabase
          .from('orders')
          .update({
            stripe_checkout_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Webhook handler error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message || 'Webhook error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
