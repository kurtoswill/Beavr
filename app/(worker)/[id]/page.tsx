"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  MapPin,
  Navigation,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import StarRating from "@/components/StarRating/StarRating";
import ReviewCard, { type Review } from "@/components/ReviewCard/ReviewCard";
import WorkerBottomBar from "@/components/WorkerBottomBar/WorkerBottomBar";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Static data                                                         */
/* ------------------------------------------------------------------ */
const WORKER = {
  name:      "Kurt Oswill McCarver",
  avatar:    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
  role:      "Electrician",
  rating:    4.2,
  reviews:   203,
  rate:      500,
  currency:  "₱",
  area:      "Green Valley Field Subdivision",
  distance:  "6 km",
  certified: "TESDA Certified",
  jobsDone:  203,
};

type PaymentId = "cod" | "gcash" | "card";

const PAYMENT_METHODS = [
  { id: "cod"   as PaymentId, label: "Cash once done",  badge: "COD", badgeColor: "#22C55E" },
  { id: "gcash" as PaymentId, label: "Gcash",           sublabel: "Link Gcash account", badge: "G", badgeColor: "#1B6FD8" },
];

const REVIEWS: Review[] = [
  {
    id: "1",
    name:   "Kazel Arwen Jane Tuazon",
    avatar: "https://i.pravatar.cc/80?img=5",
    rating: 3.5,
    text:   "I thought we lost our electricity. Turns out my cat chewed on the wires. Thank you for the fast repair!! 🙏🙏🙏",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
    ],
  },
  {
    id: "2",
    name:   "Mark Santos",
    avatar: "https://i.pravatar.cc/80?img=12",
    rating: 5,
    text:   "Very professional and on time. Fixed our panel box in under an hour. Highly recommend!",
  },
  {
    id: "3",
    name:   "Ana Reyes",
    avatar: "https://i.pravatar.cc/80?img=25",
    rating: 4,
    text:   "Good work overall. A bit late but communicated well. Would book again.",
  },
];

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function WorkerProfilePage() {
  const [selectedPayment, setSelectedPayment] = useState<PaymentId>("cod");
  const router = useRouter();

  return (
    <div className={styles.page}>

      {/* ── Scrollable area ──────────────────────────────────────── */}
      <main className={styles.scrollArea}>

        {/* Hero image */}
        <div className={styles.heroImage}>
          <img src={WORKER.avatar} alt={WORKER.name} />
          <div className={styles.heroNav}>
            <button className={styles.iconBtn} aria-label="Go back">
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content card */}
        <div className={styles.content}>

          {/* ── Identity ── */}
          <section className={styles.identity}>
            <div className={styles.identityTop}>
              <h1 className={styles.name}>{WORKER.name}</h1>
              <span className={styles.rate}>
                {WORKER.currency}{WORKER.rate.toLocaleString()}
              </span>
            </div>
            <StarRating rating={WORKER.rating} reviewCount={WORKER.reviews} size={15} />
            <div className={styles.role}>
              <Zap size={14} strokeWidth={2} className={styles.roleIcon} />
              <span>{WORKER.role}</span>
            </div>
          </section>

          <div className={styles.divider} />

          {/* ── Distance + Location ── */}
          <section className={styles.locationSection}>
            <div className={styles.locationRow}>
              <Navigation size={15} strokeWidth={2.2} className={styles.locationIcon} />
              <span className={styles.locationDistance}>{WORKER.distance}</span>
              <span className={styles.locationSep}>·</span>
              <MapPin size={14} strokeWidth={2} className={styles.locationIcon} />
              <span className={styles.locationArea}>{WORKER.area}</span>
            </div>
          </section>

          {/* ── Badges ── */}
          <div className={styles.badges}>
            <div className={styles.badge}>
              <BadgeCheck size={14} strokeWidth={2} className={styles.badgeIconCertified} />
              <span className={styles.badgeCertified}>{WORKER.certified}</span>
            </div>
            <div className={styles.badge}>
              <CheckCircle2 size={14} strokeWidth={2} className={styles.badgeIconJobs} />
              <span className={styles.badgeJobs}>{WORKER.jobsDone} jobs completed</span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── Payment method ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Payment method</h2>

            <div className={styles.paymentList}>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  className={`${styles.paymentRow} ${selectedPayment === method.id ? styles.paymentRowSelected : ""}`}
                  onClick={() => setSelectedPayment(method.id)}
                  aria-pressed={selectedPayment === method.id}
                >
                  <span
                    className={styles.paymentBadge}
                    style={{ background: method.badgeColor }}
                  >
                    {method.badge}
                  </span>
                  <span className={styles.paymentLabel}>
                    {method.label}
                    {method.sublabel && (
                      <span className={styles.paymentSublabel}> ({method.sublabel})</span>
                    )}
                  </span>
                  <span className={`${styles.paymentRadio} ${selectedPayment === method.id ? styles.paymentRadioSelected : ""}`} />
                </button>
              ))}

              <button className={styles.paymentAddRow}>
                <span className={styles.paymentAddIcon}>
                  <Plus size={13} strokeWidth={2.5} />
                </span>
                <span className={styles.paymentLabel}>Add credit/debit card</span>
                <ChevronRight size={15} strokeWidth={2} className={styles.chevron} />
              </button>
            </div>

            <div className={styles.paymentFooter}>
              <div className={styles.paymentTags}>
                <span className={styles.paymentTag}>maya</span>
                <button className={styles.paymentTagIcon} aria-label="Remove saved method">
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
              <button className={styles.viewAllBtn}>
                View all options
                <ChevronRight size={13} strokeWidth={2} />
              </button>
            </div>
          </section>

          <div className={styles.divider} />

          {/* ── Reviews ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Worker Reviews</h2>
            <div className={styles.reviewsList}>
              {REVIEWS.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          </section>

          <div className={styles.bottomSpacer} />
        </div>
      </main>

      {/* ── Sticky bottom bar (component) ───────────────────────── */}
      <WorkerBottomBar
        onChoose={() => router.push("/tracking/job-001")}
        onReject={() => router.push("/worker-002")}
      />

    </div>
  );
}