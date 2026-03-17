# Zapp

**Zapp** is an on-demand local service platform that connects customers with nearby skilled workers (e.g., plumbers, electricians) in real time.

It enables users to quickly request help, receive offers, track progress, and complete jobs—all in a simple, streamlined workflow.

---

## Features

### Customer

* Create service requests (description + image)
* View and choose available workers
* Track worker status (on the way, in progress, completed)
* Rate and review completed jobs

### Worker

* Register and apply as a service provider
* Submit KYC (ID)
* Toggle availability (online/offline)
* Accept or reject incoming jobs
* Update job status and upload completion proof
* Rate the customer and view total earnings
* View earnings and wallet balance (mocked)

### Platform

* Real-time job matching (simplified for MVP)
* Job lifecycle tracking
* Rating and review system
* Basic trust system via KYC

---

## Tech Stack

**Frontend**

* Next.js (App Router)
* React
* Tailwind CSS

**Backend / BaaS**

* Firebase or Supabase

  * Authentication
  * Database
  * Storage

**Other**

* Google Maps API (or mocked map for demo)
* OpenAI API (optional for AI features)

---

## Project Structure

```
app/
  (auth)/
  (customer)/
  (worker)/
  (shared)/
  api/

components/
lib/
utils/
```

---

## Getting Started

### 1. Clone the repository

```
git clone https://github.com/your-username/zapp.git
cd zapp
```

### 2. Install dependencies

```
npm install
```

### 3. Setup environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
```

### 4. Run the development server

```
npm run dev
```

App will be available at:

```
http://localhost:3000
```

---

## Job Status Flow

```
pending → accepted → on_the_way → in_progress → completed
```

---

## Business Model (Concept)

Zapp uses a commission-based system:

* Platform fee: 20% per job
* Payments are simulated in the MVP

---

## Hackathon Scope

This project is built as a **4-day hackathon MVP**.

### Included

* Core user flows (customer + worker)
* Job matching and status tracking
* KYC (basic implementation)

### Simulated

* Payments and wallet system
* Real-time GPS tracking (basic/mock)

---

## Future Improvements

* Real-time notifications
* Full payment integration (GCash, etc.)
* Advanced worker matching
* Admin verification dashboard
* AI-based problem detection

---

## License

This project is for educational and hackathon purposes.
