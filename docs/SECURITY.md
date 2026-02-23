# Retro Hall — Security Notes (RLS + Admin)

This app relies on **Supabase Row Level Security (RLS)** as the source-of-truth enforcement.

## Principles
- UI hiding is not security.
- Every table should have RLS enabled.
- Policies should be explicit: who can SELECT/INSERT/UPDATE/DELETE and on which rows.

## Roles
### Regular User
- Can read/update their own `user_profiles` row
- Can create and read their own orders/reservations/notifications
- Cannot modify other users’ rows

### Admin
- Identified by presence in `admin_users`
- Can manage:
  - products (inventory)
  - events
  - reservations (all)
  - orders (all)
  - broadcasts (create)
  - notifications (insert for any user)

## Recommended Checks
- Confirm RLS is enabled on all tables:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Confirm policies exist for each operation you support.
- Confirm admin policies use an `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` gate.

## Stripe Webhooks
- Webhook function must verify `STRIPE_WEBHOOK_SIGNING_SECRET`.
- Webhook updates must be server-side (Edge Function), never from the client.

## Push Notifications
- `expo_push_token` is not sensitive, but users should only update their own profile row.



## Owner vs Staff Roles
- `admin_users.role` supports `owner` and `staff`.
- `owner` can manage admin users (promote/demote/remove) via RLS policies.
- Any admin can manage products/events/reservations/orders/broadcasts per existing admin policies.
