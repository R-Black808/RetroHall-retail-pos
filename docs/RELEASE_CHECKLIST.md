# Retro Hall — Release Checklist

Use this before every production deploy.

## 1) Environment
- [ ] `.env` values set (Supabase URL + anon key)
- [ ] No secret keys in the client repo (Stripe secret keys must be in Supabase/Edge env)
- [ ] App scheme set correctly (for deep links)

## 2) Database
- [ ] Latest `supabase/schema.sql` applied
- [ ] RLS enabled on all tables
- [ ] Admin policies tested with a non-admin user
- [ ] RPC `create_order_request` works for stock + preorder
- [ ] Unique constraint/index for table conflict prevention applied (recommended)

## 3) Stripe
- [ ] Edge Functions deployed:
  - [ ] `create-checkout-session`
  - [ ] `stripe-webhook`
  - [ ] `stripe-redirect`
- [ ] Supabase Edge env vars set:
  - [ ] `STRIPE_API_KEY`
  - [ ] `STRIPE_WEBHOOK_SIGNING_SECRET`
  - [ ] `STRIPE_SUCCESS_URL`
  - [ ] `STRIPE_CANCEL_URL`
  - [ ] `APP_SCHEME`
- [ ] Stripe webhook endpoint configured and firing
- [ ] Test payment updates order to `paid`

## 4) Push Notifications
- [ ] Tested on a real device
- [ ] Permission prompt handled gracefully
- [ ] Tokens are saved to `user_profiles.expo_push_token`
- [ ] Broadcast sends push + creates in-app notification

## 5) UX / Quality
- [ ] No red-screen crashes on cold start
- [ ] Loading / empty / error states look acceptable
- [ ] Admin screens gated correctly
- [ ] Orders/reservations flows are understandable

## 6) Build / Deploy (EAS)
- [ ] `eas build:configure` complete
- [ ] `app.json` / `app.config` correct for production
- [ ] TestFlight / Internal testing build installed and verified

