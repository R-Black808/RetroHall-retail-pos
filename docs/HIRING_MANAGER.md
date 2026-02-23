# Retro Hall — What This Project Demonstrates (For Hiring Managers)

## Summary
Retro Hall is a production-minded mobile app for a local game store concept, built with Expo + Supabase, featuring admin operations, inventory, events, reservations, orders, analytics, and Stripe payments.

## Engineering Highlights
- **Role-based access control** with Supabase RLS (admin vs user) and protected routes
- **Atomic transactional behavior** via Postgres RPC (`create_order_request`) to prevent overselling
- **Payments integration** using Stripe Checkout + server-side webhook verification (Edge Functions)
- **Operational tooling**: admin dashboard, inventory adjustments, orders management, reservation management
- **User engagement**: in-app notifications + Expo push tokens + broadcast announcements
- **Data modeling**: relational schema with joins (events/attendees, orders/items)
- **Reliability patterns**: consistent error handling and validation (client + server)

## What You Can Ask Me About
- How RLS policies prevent unauthorized reads/writes
- Why RPC atomicity is needed (race conditions in inventory)
- Stripe webhook verification and idempotency considerations
- Tradeoffs of client-driven vs server-driven notifications
- How analytics queries are structured and indexed

## Next Production Improvements
- Stripe refunds via webhook-driven state updates
- Server-side segmentation for broadcasts (targeted audiences)
- Better observability (Sentry) + structured logs in Edge Functions
- Transactional reservation assignment (table auto-assignment RPC)



- **Operational tooling:** Admin inventory CSV import/export (bulk ops) + SKU/Barcode identifiers.
- **Access control:** Owner vs Staff roles with RLS-enforced admin management.
