// Supabase Edge Function: stripe-redirect
// Stripe Checkout requires https success/cancel URLs. This function receives the redirect
// and forwards the user into the Expo app via a custom scheme.
//
// Env vars optional:
// - APP_SCHEME (default: myapp)

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
}

Deno.serve((req) => {
  const url = new URL(req.url)
  const order_id = url.searchParams.get('order_id') || ''
  const result = url.searchParams.get('result') || ''
  const session_id = url.searchParams.get('session_id') || ''

  const scheme = Deno.env.get('APP_SCHEME') || 'myapp'
  const deepLink = `${scheme}://orders/return?order_id=${encodeURIComponent(order_id)}&result=${encodeURIComponent(result)}&session_id=${encodeURIComponent(session_id)}`

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: deepLink,
      'Cache-Control': 'no-store',
    },
  })
})
