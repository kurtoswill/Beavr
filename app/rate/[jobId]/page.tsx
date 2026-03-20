"use client";
import { useState, useEffect } from "react";
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
  Navigation,
  Clock,
  X,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface JobOffer {
  id: string;
  clientName: string;
  clientAvatar: string;
  date: string;
  time: string;
  service: string;
  description: string;
  location: string;
  distance: string;
  eta: string;
  suggestedRate: number;
  images?: string[];
  customer_id?: string;
}

interface CompletedJob {
  id: string;
  clientName: string;
  clientAvatar: string;
  date: string;
  service: string;
  amount: number;
}

interface SpecialistProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  rating: number;
  reviews: number;
  completionRate: number;
  totalEarned: number;
  thisWeek: number;
  pending: number;
  responseRate: number;
}

interface Job {
  id: string;
  profession: string;
  description: string;
  specialist_id?: string;
  worker_id?: string;
  status: string;
  created_at: string;
  completed_at?: string;
  customer_id?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  photos?: string[];
}

/* ------------------------------------------------------------------ */
/*  Mock Data (for fallback only)                                      */
/* ------------------------------------------------------------------ */
const FALLBACK_SPECIALIST: SpecialistProfile = {
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  name: "Specialist",
  avatar: "https://i.pravatar.cc/80?img=5",
  role: "Electrician",
  rating: 4.5,
  reviews: 0,
  completionRate: 100,
  totalEarned: 0,
  thisWeek: 0,
  pending: 0,
  responseRate: 100,
};

/* ------------------------------------------------------------------ */
/*  Helper: Map job from API to JobOffer format                        */
/* ------------------------------------------------------------------ */
function mapJobToOffer(job: Job): JobOffer {
  return {
    id: job.id,
    clientName: "Customer",
    clientAvatar: "https://i.pravatar.cc/80?img=5",
    date: new Date(job.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    time: new Date(job.created_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    service: job.profession,
    description: job.description,
    location: [job.barangay, job.municipality, job.province].filter(Boolean).join(", "),
    distance: "2.1 km",
    eta: "8 min",
    suggestedRate: 500,
    images: job.photos,
    customer_id: job.customer_id,
  };
}

/* ------------------------------------------------------------------ */
/*  Toggle Component                                                    */
/* ------------------------------------------------------------------ */
function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Job Offer Modal                                                     */
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
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Job offer details"
      >
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.5} />
        </button>
        <div className={styles.modalHandle} aria-hidden />

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

        <div className={styles.modalSection}>
          <span className={styles.modalSectionTitle}>Problem description</span>
          <p className={styles.modalDesc}>{offer.description}</p>
        </div>

        {offer.images && offer.images.length > 0 && (
          <div className={styles.modalImages}>
            {offer.images.map((src: string, i: number) => (
              <img key={i} src={src} alt={`Photo ${i + 1}`} className={styles.modalImage} />
            ))}
          </div>
        )}

        <div className={styles.modalDivider} />

        <div className={styles.modalSection}>
          <span className={styles.modalSectionTitle}>Your rate</span>
          <p className={styles.modalRateHint}>
            Suggested: ₱{offer.suggestedRate.toLocaleString()}. Set your own price for this job.
          </p>
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

        <div className={styles.modalActions}>
          <button className={styles.rejectBtn} onClick={onReject}>
            Reject
          </button>
          <button className={styles.acceptBtn} onClick={handleAccept}>
            Accept job
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Offer Card                                                          */
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
/*  Completed Job Card                                                  */
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
/*  Main Dashboard Page                                                */
/* ================================================================== */
export default function SpecialistDashboard() {
  const router = useRouter();
  
  // Specialist state (fetched from API)
  const [specialist, setSpecialist] = useState<SpecialistProfile | null>(null);
  const [isLoadingSpecialist, setIsLoadingSpecialist] = useState(true);
  
  // UI state
  const [autoAccept, setAutoAccept] = useState(true);
  const [online, setOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"offers" | "completed">("offers");
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dynamic earnings state
  const [thisWeek, setThisWeek] = useState(0);
  const [pending, setPending] = useState(0);

  // Fetch specialist profile from API
  useEffect(() => {
    const fetchSpecialist = async () => {
      try {
        const res = await fetch('/api/specialists/cccccccc-cccc-cccc-cccc-cccccccccccc');
        const data = await res.json();
        
        if (data.success && data.specialist) {
          const spec = data.specialist;
          setSpecialist({
            id: spec.id,
            name: spec.profiles?.full_name || 'Specialist',
            avatar: spec.profiles?.avatar_url || 'https://i.pravatar.cc/80?img=5',
            role: spec.profession,
            rating: spec.rating_avg || 4.5,
            reviews: spec.jobs_completed || 0,
            completionRate: 100,
            totalEarned: 0,
            thisWeek: 0,
            pending: 0,
            responseRate: 100,
          });
        } else {
          setSpecialist(FALLBACK_SPECIALIST);
        }
      } catch (error) {
        console.error('Failed to fetch specialist:', error);
        setSpecialist(FALLBACK_SPECIALIST);
      } finally {
        setIsLoadingSpecialist(false);
      }
    };

    fetchSpecialist();
  }, []);

  // Fetch pending jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/jobs?status=pending");
        const data = await res.json();

        if (data.success && data.jobs) {
          const mappedOffers = data.jobs.map(mapJobToOffer);
          setOffers(mappedOffers);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Fetch completed jobs and calculate earnings
  useEffect(() => {
    const fetchCompleted = async () => {
      try {
        const res = await fetch("/api/jobs?status=completed");
        const data = await res.json();

        if (data.success && data.jobs) {
          const specialistJobs = data.jobs.filter(
            (job: Job) => job.specialist_id === specialist?.id || job.worker_id === specialist?.id
          );

          const completed = await Promise.all(
            specialistJobs.map(async (job: Job) => {
              const quoteRes = await fetch(`/api/quotes?job_id=${job.id}`);
              const quoteData = await quoteRes.json();
              const rate = quoteData.quotes?.[0]?.proposed_rate || 500;

              return {
                id: job.id,
                clientName: "Customer",
                clientAvatar: "https://i.pravatar.cc/80?img=5",
                date: new Date(job.completed_at || job.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                service: job.profession,
                amount: rate,
              };
            })
          );

          setCompletedJobs(completed);

          const total = completed.reduce((sum: number, job: CompletedJob) => sum + job.amount, 0);
          setThisWeek(total);
        }
      } catch (error) {
        console.error("Failed to fetch completed jobs:", error);
      }
    };

    if (specialist?.id) {
      fetchCompleted();
    }
  }, [specialist?.id]);

  const handleAccept = async (rate: number) => {
    if (!selectedOffer || !specialist?.id) return;

    try {
      const quoteRes = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedOffer.id,
          worker_id: specialist.id,
          proposed_rate: rate,
          estimated_arrival: 30,
        }),
      });

      const quoteData = await quoteRes.json();
      console.log("Quote response:", quoteData);

      if (quoteData.success) {
        const jobRes = await fetch(`/api/jobs/${selectedOffer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "bid_accepted",
            specialist_id: specialist.id,
          }),
        });

        const jobData = await jobRes.json();
        console.log("Job update response:", jobData);

        if (jobData.success) {
          setPending((prev) => prev + rate);
          setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
          setSelectedOffer(null);
          router.push(`/specialist/job/${selectedOffer.id}`);
        }
      }
    } catch (error) {
      console.error("Failed to accept job:", error);
      alert("Failed to accept job. Please try again.");
    }
  };

  const handleReject = async () => {
    if (!selectedOffer) return;

    try {
      setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
      setSelectedOffer(null);
    } catch (error) {
      console.error("Failed to reject job:", error);
    }
  };

  // Show loading while fetching specialist
  if (!specialist || isLoadingSpecialist) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <Clock size={32} strokeWidth={1.5} className={styles.emptyIcon} />
          <span className={styles.emptyText}>Loading profile...</span>
        </div>
      </div>
    );
  }

  const STATS = [
    {
      label: "Completion",
      value: `${specialist.completionRate}%`,
      sub: "Rate",
      accent: "green",
    },
    {
      label: "Rating",
      value: specialist.rating.toFixed(1),
      sub: `${specialist.reviews} reviews`,
      accent: "yellow",
    },
    {
      label: "Earned",
      value: `₱${(thisWeek / 1000).toFixed(1)}k`,
      sub: "This week",
      accent: "brand",
    },
    {
      label: "Response",
      value: `${specialist.responseRate}%`,
      sub: "Rate",
      accent: "blue",
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroTop}>
          <div className={styles.heroAvatarWrap}>
            <img src={specialist.avatar} alt={specialist.name} className={styles.heroAvatar} />
            <span className={`${styles.onlineDot} ${online ? styles.onlineDotActive : ""}`} />
          </div>
          <div className={styles.heroIdentity}>
            <span className={styles.heroName}>{specialist.name}</span>
            <div className={styles.heroRole}>
              <Zap size={12} strokeWidth={2} />
              <span>{specialist.role}</span>
            </div>
          </div>
          <button className={styles.notifBtn} aria-label="Notifications">
            <BellDot size={20} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.earningsCard}>
          <div className={styles.earningsPrimary}>
            <span className={styles.earningsCurrency}>₱</span>
            <span className={styles.earningsValue}>{thisWeek.toLocaleString()}</span>
          </div>
          <span className={styles.earningsLabel}>This week</span>
          <div className={styles.earningsMeta}>
            <TrendingUp size={12} strokeWidth={2} className={styles.earningsIcon} />
            <span>₱{pending.toLocaleString()} pending</span>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} className={`${styles.statCard} ${styles[`stat_${s.accent}`]}`}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          ))}
        </div>

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
              <span className={styles.settingDesc}>You&apos;re visible to customers</span>
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

        <section className={styles.jobSection}>
          <div className={styles.jobSectionHeader}>
            <h2 className={styles.jobSectionTitle}>Job list</h2>
            <div className={styles.jobTabs}>
              <button
                className={`${styles.jobTab} ${activeTab === "offers" ? styles.jobTabActive : ""}`}
                onClick={() => setActiveTab("offers")}
              >
                Offers {offers.length > 0 && <span className={styles.tabBadge}>{offers.length}</span>}
              </button>
              <button
                className={`${styles.jobTab} ${activeTab === "completed" ? styles.jobTabActive : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                Completed {completedJobs.length > 0 && <span className={styles.tabBadge}>{completedJobs.length}</span>}
              </button>
            </div>
          </div>
          <div className={styles.jobList}>
            {activeTab === "offers" && (
              isLoading ? (
                <div className={styles.emptyState}>
                  <Clock size={32} strokeWidth={1.5} className={styles.emptyIcon} />
                  <span className={styles.emptyText}>Loading jobs...</span>
                </div>
              ) : offers.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle2 size={32} strokeWidth={1.5} className={styles.emptyIcon} />
                  <span className={styles.emptyText}>No new job offers right now</span>
                </div>
              ) : (
                offers.map((o) => <OfferCard key={o.id} offer={o} onView={() => setSelectedOffer(o)} />)
              )
            )}
            {activeTab === "completed" && completedJobs.map((c) => <CompletedCard key={c.id} job={c} />)}
          </div>
        </section>
        <div style={{ height: 32 }} />
      </main>

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