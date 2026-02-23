# Retro Hall — Database & ERD

This project uses Supabase Postgres with Row Level Security (RLS) enabled.

## Core Tables
- `user_profiles` — user metadata + expo push token
- `admin_users` — whitelist for admin access
- `products` — inventory
- `events` — events
- `event_attendees` — many-to-many join between users and events
- `table_reservations` — table bookings
- `orders` — purchase/preorder records
- `order_items` — items per order
- `notifications` — per-user in-app notifications
- `broadcasts` — admin broadcast history

## Suggested ERD (Mermaid)

```mermaid
erDiagram
  user_profiles {
    uuid id PK
    text full_name
    text expo_push_token
    timestamptz created_at
  }

  admin_users {
    uuid id PK
    timestamptz created_at
  }

  products {
    uuid id PK
    text title
    numeric price
    int stock_qty
    int low_stock_threshold
    boolean featured
    text condition
    timestamptz created_at
  }

  events {
    uuid id PK
    text title
    timestamptz start_time
    text location
    int max_attendees
  }

  event_attendees {
    uuid id PK
    uuid event_id FK
    uuid user_id FK
    timestamptz created_at
  }

  table_reservations {
    uuid id PK
    uuid user_id FK
    uuid event_id FK
    date reservation_date
    text time_slot
    int table_number
    text status
    text cancel_reason
    text notes
    timestamptz created_at
  }

  orders {
    uuid id PK
    uuid user_id FK
    text status
    boolean is_preorder
    text stripe_checkout_session_id
    text stripe_payment_intent_id
    timestamptz created_at
  }

  order_items {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int quantity
    numeric unit_price
  }

  notifications {
    uuid id PK
    uuid user_id FK
    text title
    text body
    text type
    boolean read
    timestamptz created_at
  }

  broadcasts {
    uuid id PK
    uuid admin_id FK
    text title
    text message
    text type
    timestamptz created_at
  }

  user_profiles ||--o{ event_attendees : joins
  events ||--o{ event_attendees : has

  user_profiles ||--o{ table_reservations : books
  events ||--o{ table_reservations : optional

  user_profiles ||--o{ orders : places
  orders ||--o{ order_items : contains
  products ||--o{ order_items : sold_as

  user_profiles ||--o{ notifications : receives
  user_profiles ||--o{ broadcasts : sends
```

## Atomic Order Creation (RPC)
The function `create_order_request(product_id, quantity)` performs a single DB transaction to:
- lock the product row
- decrement stock (if available)
- create `orders` + `order_items`
- return the order id

This prevents overselling under concurrent requests.

## Indexing Recommendations
- `table_reservations (reservation_date, time_slot)` for admin filtering
- `event_attendees (event_id)` for attendance counts
- `orders (user_id, created_at)` for order history



### Admin Roles
`admin_users` includes:
- `id` (auth uid)
- `role` (`owner` | `staff`)
Owners can manage the admin roster; staff cannot.
