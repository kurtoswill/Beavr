"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Star,
  Wallet,
  CheckCircle2,
  MapPin,
  TrendingUp,
  BellDot,
  ArrowUpRight,
  CalendarDays,
  ThumbsUp,
  Navigation,
  Clock,
  X,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */
const SPECIALIST = {
  name:           "Kurt Oswill McCarver",
  avatar:         "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=200&q=80",
  role:           "Electrician",
  rating:         4.2,
  reviews:        203,
  completionRate: 100,
  totalEarned:    40_200,
  thisWeek:       3_500,
  pending:        500,
  responseRate:   94,
  level:          "Top Rated",
};

const STATS = [
  { label: "Completion", value: `${SPECIALIST.completionRate}%`,                                                    sub: "Rate",    accent: "green"  },
  { label: "Rating",     value: SPECIALIST.rating.toFixed(1),                                                       sub: `${SPECIALIST.reviews} reviews`, accent: "yellow" },
  { label: "Earned",     value: `₱${(SPECIALIST.totalEarned / 1000).toFixed(1)}k`,                             sub: "All time", accent: "brand"  },
  { label: "Response",   value: `${SPECIALIST.responseRate}%`,                                                      sub: "Rate",    accent: "blue"   },
];

export interface JobOffer {
  id: string;
  clientName:   string;
  clientAvatar: string;
  date:         string;
  time:         string;
  service:      string;
  description:  string;
  location:     string;
  distance:     string;
  eta:          string;
  suggestedRate: number;
  images?:      string[];
}

interface CompletedJob {
  id: string;
  clientName:   string;
  clientAvatar: string;
  date:         string;
  service:      string;
  amount:       number;
}

const OFFERS: JobOffer[] = [
  {
    id: "1",
    clientName:   "Kazel Arwen Jane Tuazon",
    clientAvatar: "https://i.pravatar.cc/80?img=5",
    date:         "March 14, 2026",
    time:         "5:20 pm",
    service:      "Electrical",
    description:  "I need someone to continue fixing the wires, the original worker died yesterday.",
    location:     "Bancod, Indang, Cavite",
    distance:     "2.1 km",
    eta:          "8 min",
    suggestedRate: 500,
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=70",
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&q=70",
    ],
  },
  {
    id: "2",
    clientName:   "Mark Santos",
    clientAvatar: "https://i.pravatar.cc/80?img=12",
    date:         "March 14, 2026",
    time:         "6:00 pm",
    service:      "Electrical",
    description:  "Panel box needs full inspection and possible replacement of breakers.",
    location:     "Lumampong, Indang, Cavite",
    distance:     "4.5 km",
    eta:          "15 min",
    suggestedRate: 800,
  },
];

const COMPLETED: CompletedJob[] = [
  { id: "c1", clientName: "Ana Reyes",      clientAvatar: "https://i.pravatar.cc/80?img=25", date: "March 12, 2026", service: "Electrical", amount: 1_200 },
  { id: "c2", clientName: "Jose Dela Cruz", clientAvatar: "https://i.pravatar.cc/80?img=33", date: "March 11, 2026", service: "Electrical", amount: 1_500 },
];

/* ------------------------------------------------------------------ */
/*  Toggle                                                              */
/* ------------------------------------------------------------------ */
function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
      onClick={onChange} role="switch" aria-checked={on} aria-label={label}>
      <span className={styles.toggleThumb} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Job Offer modal                                                     */
/* ------------------------------------------------------------------ */
function JobOfferModal({
  offer,
  onAccept,
  onReject,
  onClose,
}: {
  offer: JobOffer;
  onAccept: (rate: number) => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const [rate, setRate] = useState(String(offer.suggestedRate));

  const handleAccept = () => {
    const n = parseInt(rate, 10);
    onAccept(isNaN(n) || n <= 0 ? offer.suggestedRate : n);
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Job offer details">

        {/* Close */}
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Handle */}
        <div className={styles.modalHandle} aria-hidden />

        {/* Client */}
        <div className={styles.modalClient}>
          <img src={offer.clientAvatar} alt={offer.clientName} className={styles.modalClientAvatar} />
          <div className={styles.modalClientInfo}>
            <span className={styles.modalClientName}>{offer.clientName}</span>
            <div className={styles.modalClientMeta}>
              <CalendarDays size={11} strokeWidth={2} />
              <span>{offer.date} · {offer.time}</span>
            </div>
          </div>
          <div className={styles.serviceChip}>
            <Zap size={11} strokeWidth={2} />
            <span>{offer.service}</span>
          </div>
        </div>

        <div className={styles.modalDivider} />

        {/* Detail rows */}
        <div className={styles.modalDetails}>
          <div className={styles.modalDetailRow}>
            <MapPin size={14} strokeWidth={2} className={styles.modalDetailIcon} />
            <div>
              <span className={styles.modalDetailLabel}>Location</span>
              <span className={styles.modalDetailValue}>{offer.location}</span>
            </div>
          </div>
          <div className={styles.modalDetailRow}>
            <Navigation size={14} strokeWidth={2} className={styles.modalDetailIcon} />
            <div>
              <span className={styles.modalDetailLabel}>Distance</span>
              <span className={styles.modalDetailValue}>{offer.distance} · {offer.eta} away</span>
            </div>
          </div>
          <div className={styles.modalDetailRow}>
            <Clock size={14} strokeWidth={2} className={styles.modalDetailIcon} />
            <div>
              <span className={styles.modalDetailLabel}>Requested at</span>
              <span className={styles.modalDetailValue}>{offer.time}</span>
            </div>
          </div>
        </div>

        <div className={styles.modalDivider} />

        {/* Problem description */}
        <div className={styles.modalSection}>
          <span className={styles.modalSectionTitle}>Problem description</span>
          <p className={styles.modalDesc}>{offer.description}</p>
        </div>

        {/* Images */}
        {offer.images && offer.images.length > 0 && (
          <div className={styles.modalImages}>
            {offer.images.map((src, i) => (
              <img key={i} src={src} alt={`Photo ${i + 1}`} className={styles.modalImage} />
            ))}
          </div>
        )}

        <div className={styles.modalDivider} />

        {/* Rate input */}
        <div className={styles.modalSection}>
          <span className={styles.modalSectionTitle}>Your rate</span>
          <p className={styles.modalRateHint}>Suggested: ₱{offer.suggestedRate.toLocaleString()}. Set your own price for this job.</p>
          <div className={styles.rateInputWrap}>
            <span className={styles.ratePrefix}>₱</span>
            <input
              type="number"
              className={styles.rateInput}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              min="1"
              aria-label="Your rate"
            />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button className={styles.rejectBtn} onClick={onReject}>Reject</button>
          <button className={styles.acceptBtn} onClick={handleAccept}>Accept job</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Offer card (compact, list item)                                     */
/* ------------------------------------------------------------------ */
function OfferCard({ offer, onView }: { offer: JobOffer; onView: () => void }) {
  return (
    <div className={styles.offerCard}>
      <div className={styles.offerHeader}>
        <img src={offer.clientAvatar} alt={offer.clientName} className={styles.jobAvatar} />
        <div className={styles.jobMeta}>
          <span className={styles.jobClientName}>{offer.clientName}</span>
          <div className={styles.jobSubRow}>
            <CalendarDays size={11} strokeWidth={2} className={styles.jobSubIcon} />
            <span className={styles.jobDate}>{offer.date} · {offer.time}</span>
          </div>
        </div>
        <span className={styles.badgeNew}>New</span>
      </div>

      <div className={styles.jobTags}>
        <div className={styles.serviceChip}>
          <Zap size={11} strokeWidth={2} />
          <span>{offer.service}</span>
        </div>
        <div className={styles.distanceChip}>
          <Navigation size={11} strokeWidth={2} />
          <span>{offer.distance} · {offer.eta}</span>
        </div>
      </div>

      <p className={styles.jobDesc}>{offer.description}</p>

      {offer.images && (
        <div className={styles.offerImageHint}>
          <ImageIcon size={12} strokeWidth={2} />
          <span>{offer.images.length} photo{offer.images.length > 1 ? "s" : ""} attached</span>
        </div>
      )}

      <div className={styles.jobFooter}>
        <button className={styles.viewDetailsBtn} onClick={onView}>
          View details <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completed job card                                                  */
/* ------------------------------------------------------------------ */
function CompletedCard({ job }: { job: CompletedJob }) {
  return (
    <div className={styles.completedCard}>
      <img src={job.clientAvatar} alt={job.clientName} className={styles.jobAvatar} />
      <div className={styles.jobMeta}>
        <span className={styles.jobClientName}>{job.clientName}</span>
        <div className={styles.jobSubRow}>
          <CalendarDays size={11} strokeWidth={2} className={styles.jobSubIcon} />
          <span className={styles.jobDate}>{job.date}</span>
        </div>
      </div>
      <div className={styles.completedRight}>
        <span className={styles.completedAmount}>₱{job.amount.toLocaleString()}</span>
        <span className={styles.badgeCompleted}>Done</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function SpecialistDashboard() {
  const router = useRouter();
  const [autoAccept, setAutoAccept] = useState(true);
  const [online, setOnline]         = useState(true);
  const [activeTab, setActiveTab]   = useState<"offers" | "completed">("offers");
  const [offers, setOffers]         = useState<JobOffer[]>(OFFERS);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);

  const handleAccept = (rate: number) => {
    if (!selectedOffer) return;
    // Navigate to specialist tracker for this job
    router.push(`/specialist/job/${selectedOffer.id}`);
  };

  const handleReject = () => {
    if (!selectedOffer) return;
    setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
    setSelectedOffer(null);
  };

  return (
    <div className={styles.page}>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />

        <div className={styles.heroTop}>
          <div className={styles.heroAvatarWrap}>
            <img src={SPECIALIST.avatar} alt={SPECIALIST.name} className={styles.heroAvatar} />
            <span className={`${styles.onlineDot} ${online ? styles.onlineDotActive : ""}`} />
          </div>
          <div className={styles.heroIdentity}>
<span className={styles.heroName}>{SPECIALIST.name}</span>
            <div className={styles.heroRole}>
              <Zap size={12} strokeWidth={2} />
              <span>{SPECIALIST.role}</span>
            </div>
          </div>
          <button className={styles.notifBtn} aria-label="Notifications">
            <BellDot size={20} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.earningsCard}>
          <div className={styles.earningsPrimary}>
            <span className={styles.earningsCurrency}>₱</span>
            <span className={styles.earningsValue}>{SPECIALIST.thisWeek.toLocaleString()}</span>
          </div>
          <span className={styles.earningsLabel}>This week</span>
          <div className={styles.earningsMeta}>
            <TrendingUp size={12} strokeWidth={2} className={styles.earningsIcon} />
            <span>₱{SPECIALIST.pending.toLocaleString()} pending</span>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className={styles.content}>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} className={`${styles.statCard} ${styles[`stat_${s.accent}`]}`}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className={styles.settingsGroup}>
          <div className={styles.settingRow}>
            <div className={styles.settingLabel}>
              <span className={styles.settingTitle}>Auto accept</span>
              <span className={styles.settingDesc}>Automatically accept nearby jobs</span>
            </div>
            <Toggle on={autoAccept} onChange={() => setAutoAccept((v) => !v)} label="Toggle auto accept" />
          </div>
          <div className={styles.settingDivider} />
          <div className={styles.settingRow}>
            <div className={styles.settingLabel}>
              <span className={styles.settingTitle}>Available</span>
              <span className={styles.settingDesc}>You're visible to customers</span>
            </div>
            <Toggle on={online} onChange={() => setOnline((v) => !v)} label="Toggle availability" />
          </div>
          <div className={styles.settingDivider} />
          <button className={styles.walletRow}>
            <div className={styles.walletLeft}>
              <Wallet size={18} strokeWidth={2} className={styles.walletIcon} />
              <div className={styles.settingLabel}>
                <span className={styles.settingTitle}>Wallet</span>
              </div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2} className={styles.walletArrow} />
          </button>
        </div>

        {/* Job list */}
        <section className={styles.jobSection}>
          <div className={styles.jobSectionHeader}>
            <h2 className={styles.jobSectionTitle}>Job list</h2>
            <div className={styles.jobTabs}>
              <button className={`${styles.jobTab} ${activeTab === "offers" ? styles.jobTabActive : ""}`}
                onClick={() => setActiveTab("offers")}>
                Offers {offers.length > 0 && <span className={styles.tabBadge}>{offers.length}</span>}
              </button>
              <button className={`${styles.jobTab} ${activeTab === "completed" ? styles.jobTabActive : ""}`}
                onClick={() => setActiveTab("completed")}>
                Completed
              </button>
            </div>
          </div>

          <div className={styles.jobList}>
            {activeTab === "offers" && (
              offers.length === 0
                ? <div className={styles.emptyState}>
                    <CheckCircle2 size={32} strokeWidth={1.5} className={styles.emptyIcon} />
                    <span className={styles.emptyText}>No new job offers right now</span>
                  </div>
                : offers.map((o) => (
                    <OfferCard key={o.id} offer={o} onView={() => setSelectedOffer(o)} />
                  ))
            )}
            {activeTab === "completed" && COMPLETED.map((c) => (
              <CompletedCard key={c.id} job={c} />
            ))}
          </div>
        </section>

        <div style={{ height: 32 }} />
      </main>

      {/* ── Job offer modal ──────────────────────────────────────── */}
      {selectedOffer && (
        <JobOfferModal
          offer={selectedOffer}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => setSelectedOffer(null)}
        />
      )}
    </div>
  );
}