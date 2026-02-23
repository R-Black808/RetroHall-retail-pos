# Stripe Setup (Retro Hall)

This project uses **Stripe Checkout** via **Supabase Edge Functions**.

## 1) Create Stripe keys
In Stripe Dashboard:
- Get your **Secret key** (starts with `sk_...`)
- Create a **Webhook endpoint** pointing to your deployed Supabase function:
  - `stripe-webhook`
- Copy the **Webhook signing secret** (starts with `whsec_...`)

## 2) Deploy Supabase Edge Functions
Functions included:
- `create-checkout-session` (invoked from the app)
- `stripe-webhook` (Stripe calls this)
- `stripe-redirect` (https → deep link back to the app)

Set these function environment variables in Supabase:
- `STRIPE_API_KEY` = your Stripe secret key
- `STRIPE_WEBHOOK_SIGNING_SECRET` = your webhook signing secret
- `APP_SCHEME` = `myapp` (matches `app.json`)

For redirect URLs (Stripe requires https URLs):
- `STRIPE_SUCCESS_URL` = your deployed `stripe-redirect` URL
- `STRIPE_CANCEL_URL`  = your deployed `stripe-redirect` URL

Example (you’ll paste your real function URL):
- `https://<project-ref>.functions.supabase.co/stripe-redirect`

## 3) Database schema updates
Run the latest `supabase/schema.sql` to add Stripe columns to `orders`:
- `stripe_checkout_session_id`
- `stripe_checkout_url`
- `stripe_payment_intent_id`

## 4) App flow
- User creates an order (already in-app)
- User taps **Pay with Stripe** on Order Details
- Stripe redirects through `stripe-redirect` back into the app
- Stripe webhook marks the order **paid**

> Webhooks are required for fulfillment—users might close the browser before returning.
