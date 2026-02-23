# Retro Hall — Architecture Overview

Retro Hall is a mobile-first retail + community app built with **Expo (React Native)** and **Supabase**.

## Tech Stack
- **Client:** Expo + expo-router (TypeScript)
- **Auth & Data:** Supabase Auth + Postgres + Row Level Security (RLS)
- **Realtime:** Supabase Realtime (notifications)
- **Payments:** Stripe Checkout (via Supabase Edge Functions + webhooks)
- **Push Notifications:** Expo Notifications (device tokens stored in Supabase)

## High-Level Flow
### App
- Users sign in with Supabase Auth.
- The app reads/writes data directly to Supabase tables (secured by RLS).
- Admin-only screens are protected by an `admin_users` table + RLS.

### Payments
- Customer creates an order request (atomic via Postgres RPC).
- Customer taps **Pay with Stripe** → Edge Function creates a Checkout Session.
- Stripe webhook updates order status to `paid`.
- Admin fulfills paid orders.

## Folder Structure (key paths)
- `app/` — Expo Router screens
  - `(tabs)/` — tab navigation screens
  - `admin/` — admin dashboard + management modules
  - `orders/` — customer order list/detail + payment
  - `reservations/` — customer reservations
- `hooks/` — reusable hooks (auth, push notifications)
- `supabase/`
  - `schema.sql` — database schema + RLS policies + RPC(s)
  - `functions/` — Edge Functions for Stripe
- `components/` — reusable UI pieces

## Authorization Model
- **Regular users** can only access their own records (orders, reservations, notifications).
- **Admins** (listed in `admin_users`) can manage products/events/orders/reservations and send broadcasts.
- RLS is the enforcement layer (UI hiding is not security).

## Data & Domain Modules
### Products & Inventory
- `products` stores inventory metadata (`stock_qty`, `featured`, `low_stock_threshold`, `condition`).
- Admin inventory screen supports stock adjustment + low stock filters.

### Events & Attendance
- `events` stores event info.
- `event_attendees` tracks who joined which event.

### Reservations
- `table_reservations` stores table bookings.
- Table-number conflict prevention is enforced with:
  1) app-side checks, and
  2) DB unique constraint/index (recommended).

### Orders
- `orders` + `order_items` store purchase/preorder requests.
- Atomic stock reserve + order creation happens in one transaction via RPC.

## Observability
- Client-side logging uses `console.*`.
- For production, add Sentry (recommended) and optionally server logs in Edge Functions.



## Inventory: SKU/Barcode + CSV Ops
- Products support optional `sku` and `barcode` identifiers (unique when provided).
- Admin Inventory screen supports CSV export/import for bulk updates.
