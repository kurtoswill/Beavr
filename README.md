# Beavr

**Beavr** is an on-demand local services platform that connects customers with nearby verified specialists — electricians, plumbers, caregivers, painters, and more — in real time.

Named after nature's most relentless builder, Beavr enables users to quickly request help, receive offers, track progress, and complete jobs — all in a simple, streamlined workflow built specifically for the Philippines.

> *Built for you. Done fast.*

---

## Features

### Customer

- Create service requests with description and optional photo/video upload
- Browse and hire nearby verified specialists
- Live GPS tracking — watch your specialist head your way in real time
- In-app payment via GCash or Cash on Delivery
- Rate and review completed jobs

### Specialist

- Register and apply as a service provider
- Complete KYC (Government ID — front + back, selfie, TESDA certification)
- Toggle availability online/offline
- Receive job offers with location, description, distance, and ETA
- Set your own rate per job — accept or reject offers
- Track job status through the full lifecycle
- Rate the customer after job completion
- View earnings and wallet balance from a personal dashboard

### Platform

- Real-time job matching by distance
- Full job lifecycle tracking (`heading → arrived → working → completed`)
- KYC-based trust system — verified identity for every specialist
- Two-sided rating system — customers rate specialists, specialists rate customers
- Barangay-level coverage across CALABARZON

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 16.1.7** (App Router) | Full-stack React framework with file-based routing |
| **React 18** | UI component library with hooks |
| **TypeScript** | Type-safe development |
| **CSS Modules** | Scoped component styling with custom design token system |
| **Manrope** via `next/font/google` | Primary typeface — loaded at build time, zero layout shift |
| **Lucide React** | Icon library used across all pages and components |
| **Leaflet** + **React Leaflet** | Interactive map rendering for live job tracking |

### Backend / BaaS

| Technology | Purpose |
|---|---|
| **Supabase** | Authentication, PostgreSQL database, file storage |

### UI Patterns & APIs

| Technology | Purpose |
|---|---|
| **Pointer Events API** | Smooth drag-to-expand bottom sheet gesture |
| **`requestAnimationFrame`** | 60fps native animation for sheet drag |
| **`setPointerCapture`** | Reliable touch + mouse drag tracking |
| **`URL.createObjectURL`** | Local image preview for photo uploads |
| **`navigator.clipboard`** | Copy reference number in payment receipt |
| **CSS `mask-image`** | Scroll fade hint on service chip row |

### AI Tools

| Tool | Purpose |
|---|---|
| **Claude AI** | Development assistance throughout the project |

---

## Environment Variables

Create a `.env.local` file in the root of your project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---


## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/beavr.git
cd beavr
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
# Then fill in your Supabase credentials
```

### 4. Run the development server

```bash
npm run dev
```

App will be available at `http://localhost:3000`

---

## Job Status Flow

### Customer Side

```
Request submitted
    → Specialist profile viewed
        → Hired
            → Waiting for specialist response
                → Specialist is on the way (live tracking)
                    → Specialist arrived
                        → Job in progress
                            → Job complete → Payment → Receipt → Rate specialist
```

### Specialist Side

```
Job offer received
    → View details (description, location, distance, images)
        → Set own rate → Accept
            → Heading to customer (map tracking)
                → Arrived
                    → Start working
                        → Slide to complete
                            → Rate customer → Back to dashboard
```

---

## Business Model

Beavr uses a commission-based model:

| Revenue Stream | Mechanism | Who Pays |
|---|---|---|
| **Service Fee** | 10–15% of every completed job | Specialist (deducted from payout) |

> **Free for customers. Always.**

---

## Market Size

| | Value | Basis |
|---|---|---|
| **TAM** | ₱2.8 Trillion | PH digital economy, 86.98M internet users (DataReportal 2024) |
| **SAM** | ₱187 Billion | CALABARZON region, 16.2M population |
| **SOM** | ₱1.87 Billion | 1% SAM capture, ~37,400 specialists, Year 1–3 |

---

## Supported SDGs

| SDG | Contribution |
|---|---|
| **SDG 1** — No Poverty | Income access for 20.2M informal workers (IBON Foundation, 2025) |
| **SDG 8** — Decent Work & Economic Growth | Fair pay, specialist-set rates, transparent platform |
| **SDG 9** — Industry, Innovation & Infrastructure | Digital bridge into the informal economy |
| **SDG 10** — Reduced Inequalities | Barangay-level access across all CALABARZON provinces |

---

## Hackathon Scope

This project was built for **INTERCICSKWELA V2.0 — Batang Techno**.

### Included in MVP

- Full customer flow (auth → request → hire → track → pay → rate)
- Full specialist flow (KYC → dashboard → accept → track → complete → rate)
- KYC registration with 4-step onboarding
- Real-time-style tracking with draggable map sheet
- In-app payment with digital receipt
- Two-sided rating system

### Simulated for Demo

- Payments and wallet system (mocked data)
- GPS tracking (Leaflet map integrated — live coordinate updates mocked for demo)
- Real-time job matching (mock distance data)
- Authentication (frontend only — ready for Supabase Auth integration)

---

## Future Improvements

- Full Supabase authentication and database integration
- Real-time notifications via Supabase Realtime
- Live GPS coordinate streaming via Supabase Realtime + Leaflet
- Full GCash / Maya payment integration
- Admin verification dashboard
- AI-based problem detection from uploaded photos
- Nationwide expansion beyond CALABARZON
- Native mobile app (React Native)

---

## License

This project is built for educational and hackathon purposes under **INTERCICSKWELA V2.0 — Batang Techno**.