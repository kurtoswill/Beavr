"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Zap,
  Wallet,
  CheckCircle2,
  TrendingUp,
  BellDot,
  CalendarDays,
  Navigation,
  Clock,
  X,
  ChevronRight,
  ImageIcon,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Supabase Client                                                     */
/* ------------------------------------------------------------------ */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ------------------------------------------------------------------ */
/*  Types - From Database Schema                                        */
/* ------------------------------------------------------------------ */

// Job from Supabase
interface Job {
  id: string;
  customer_id: string;
  profession: string;
  description: string;
  status: string;
  street_address?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  photos?: string[];
  created_at: string;
  completed_at?: string;
  specialist_id?: string;
  worker_id?: string;
  accepted_at?: string;
}

// Quote from Supabase
interface Quote {
  id: string;
  job_id: string;
  worker_id: string;
  proposed_rate: number;
  estimated_arrival?: number;
  status: string;
  created_at: string;
}

// Specialist from Supabase
interface Specialist {
  id: string;
  user_id: string;
  profession: string;
  rating_avg?: number;
  jobs_completed?: number;
  is_online?: boolean;
  is_verified?: boolean;
  created_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
}

// Profile from Supabase
interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  role?: string;
}

/* ------------------------------------------------------------------ */
/*  Types - Frontend Display                                            */
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

// API Response types
interface JobsResponse {
  success: boolean;
  jobs?: Job[];
  error?: string;
}

interface SpecialistResponse {
  success: boolean;
  specialists?: Specialist[];
  specialist?: Specialist;
  error?: string;
}

interface QuotesResponse {
  success: boolean;
  quotes?: Quote[];
  quote?: Quote;
  error?: string;
}

interface ProfilesResponse {
  success: boolean;
  profile?: Profile;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Helper: Map job from API to JobOffer format                        */
/* ------------------------------------------------------------------ */
async function mapJobToOffer(job: Job): Promise<JobOffer> {
  // Fetch customer profile
  let customerName = "Customer";
  let customerAvatar = "https://i.pravatar.cc/80?img=5";

  try {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", job.customer_id)
      .single();

    if (profileData) {
      customerName = profileData.full_name || "Customer";
      customerAvatar = profileData.avatar_url || customerAvatar;
    }
  } catch (error) {
    console.warn("Could not fetch customer profile:", error);
  }

  return {
    id: job.id,
    clientName: customerName,
    clientAvatar: customerAvatar || "https://i.pravatar.cc/80?img=5",
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
    location: [job.barangay, job.municipality, job.province]
      .filter(Boolean)
      .join(", "),
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
function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
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
        <button
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        <div className={styles.modalHandle} aria-hidden />
        <div className={styles.modalClient}>
          <img
            src={offer.clientAvatar}
            alt={offer.clientName}
            className={styles.modalClientAvatar}
          />
          <div className={styles.modalClientInfo}>
            <span className={styles.modalClientName}>{offer.clientName}</span>
            <div className={styles.modalClientMeta}>
              <CalendarDays size={11} strokeWidth={2} />
              <span>
                {offer.date} · {offer.time}
              </span>
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
            <Navigation
              size={14}
              strokeWidth={2}
              className={styles.modalDetailIcon}
            />
            <div>
              <span className={styles.modalDetailLabel}>Distance</span>
              <span className={styles.modalDetailValue}>
                {offer.distance} · {offer.eta} away
              </span>
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
              <img
                key={i}
                src={src}
                alt={`Photo ${i + 1}`}
                className={styles.modalImage}
              />
            ))}
          </div>
        )}
        <div className={styles.modalDivider} />
        <div className={styles.modalSection}>
          <span className={styles.modalSectionTitle}>Your rate</span>
          <p className={styles.modalRateHint}>
            Suggested: ₱{offer.suggestedRate.toLocaleString()}. Set your own
            price for this job.
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
        <img
          src={offer.clientAvatar}
          alt={offer.clientName}
          className={styles.jobAvatar}
        />
        <div className={styles.jobMeta}>
          <span className={styles.jobClientName}>{offer.clientName}</span>
          <div className={styles.jobSubRow}>
            <CalendarDays
              size={11}
              strokeWidth={2}
              className={styles.jobSubIcon}
            />
            <span className={styles.jobDate}>
              {offer.date} · {offer.time}
            </span>
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
          <span>
            {offer.distance} · {offer.eta}
          </span>
        </div>
      </div>
      <p className={styles.jobDesc}>{offer.description}</p>
      {offer.images && (
        <div className={styles.offerImageHint}>
          <ImageIcon size={12} strokeWidth={2} />
          <span>
            {offer.images.length} photo{offer.images.length > 1 ? "s" : ""}{" "}
            attached
          </span>
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
      <img
        src={job.clientAvatar}
        alt={job.clientName}
        className={styles.jobAvatar}
      />
      <div className={styles.jobMeta}>
        <span className={styles.jobClientName}>{job.clientName}</span>
        <div className={styles.jobSubRow}>
          <CalendarDays
            size={11}
            strokeWidth={2}
            className={styles.jobSubIcon}
          />
          <span className={styles.jobDate}>{job.date}</span>
        </div>
      </div>
      <div className={styles.completedRight}>
        <span className={styles.completedAmount}>
          ₱{job.amount.toLocaleString()}
        </span>
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

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // State for specialist profile (fetched from API)
  const [specialist, setSpecialist] = useState<SpecialistProfile | null>(null);
  const [isLoadingSpecialist, setIsLoadingSpecialist] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Auth error:", authError);
          setAuthError("Not authenticated");
          setIsLoadingSpecialist(false);
          setTimeout(() => router.push("/auth"), 100);
          return;
        }

        if (user) {
          setUserId(user.id);
          setIsAuthenticated(true);

          // Fetch specialist profile for this user
          const { data: specialistData, error: specialistError } =
            await supabase
              .from("specialists")
              .select(
                `
              *,
              profiles:user_id (
                id,
                full_name,
                avatar_url,
                email,
                phone,
                role
              )
            `,
              )
              .eq("user_id", user.id)
              .limit(1);

          if (specialistError) {
            console.error("Error fetching specialist:", specialistError);
            // No specialist profile found - redirect to home page (not onboarding)
            // Onboarding is only for users who explicitly choose to become specialists
            console.log(
              "No specialist profile found, redirecting to home page",
            );
            setAuthError("No specialist profile found");
            setIsLoadingSpecialist(false);
            setTimeout(() => router.push("/"), 100);
            return;
          }

          const specialist = specialistData?.[0];

          if (!specialist) {
            console.warn("No specialist profile found for user");
            setAuthError("No specialist profile found");
            setIsLoadingSpecialist(false);
            setTimeout(() => router.push("/"), 100);
            return;
          }

          setSpecialist({
            id: specialist.id,
            name:
              specialist.profiles?.full_name ||
              user.email?.split("@")[0] ||
              "Specialist",
            avatar:
              specialist.profiles?.avatar_url ||
              "https://i.pravatar.cc/80?img=5",
            role: specialist.profession || "General",
            rating: specialist.rating_avg || 4.5,
            reviews: specialist.jobs_completed || 0,
            completionRate: 100,
            totalEarned: 0,
            thisWeek: 0,
            pending: 0,
            responseRate: 100,
          });
        } else {
          // Not authenticated, redirect to auth
          console.log("No user found, redirecting to auth");
          setAuthError("Not authenticated");
          setIsLoadingSpecialist(false);
          setTimeout(() => router.push("/auth"), 100);
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthError("Authentication error");
        setIsLoadingSpecialist(false);
        setTimeout(() => router.push("/auth"), 100);
        return;
      }

      setIsLoadingSpecialist(false);
    };

    checkAuth();
  }, [router]);

  // Fetch pending jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);

        // Always fetch by profession to ensure only relevant jobs are shown
        if (!specialist?.role) {
          setOffers([]);
          setIsLoading(false);
          return;
        }

        const pendingUrl = new URL("/api/jobs", window.location.origin);
        pendingUrl.searchParams.set("status", "pending");
        pendingUrl.searchParams.set("profession", specialist.role);

        const res = await fetch(pendingUrl.toString());
        const data: JobsResponse = await res.json();

        if (data.success && data.jobs) {
          const mappedOffers = await Promise.all(
            data.jobs.map((job: Job) => mapJobToOffer(job)),
          );
          setOffers(mappedOffers);
        } else {
          setOffers([]);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated, specialist?.role]);

  // Fetch completed jobs and calculate earnings
  useEffect(() => {
    const fetchCompleted = async () => {
      if (!specialist?.id) return;

      try {
        // Get quotes for this specialist
        const { data: quotesData, error: quotesError } = await supabase
          .from("quotes")
          .select("job_id, proposed_rate, status")
          .eq("worker_id", specialist.id);

        if (quotesError) {
          console.error("Error fetching quotes:", quotesError);
          return;
        }

        if (!quotesData || quotesData.length === 0) {
          return;
        }

        // Get job IDs from quotes
        const jobIds = quotesData.map((q) => q.job_id);

        // Fetch completed jobs with accepted quotes
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .in("id", jobIds)
          .eq("status", "completed");

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
          return;
        }

        if (!jobsData || jobsData.length === 0) {
          return;
        }

        // Map jobs with quote rates and customer info
        const completed = await Promise.all(
          jobsData.map(async (job: Job) => {
            // Find the quote for this job
            const quote = quotesData.find((q) => q.job_id === job.id);
            const rate = quote?.proposed_rate || 500;

            // Fetch customer profile
            let customerName = "Customer";
            let customerAvatar = "https://i.pravatar.cc/80?img=5";

            try {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name, avatar_url")
                .eq("id", job.customer_id)
                .single();

              if (profileData) {
                customerName = profileData.full_name || "Customer";
                customerAvatar = profileData.avatar_url || customerAvatar;
              }
            } catch (error) {
              console.warn("Could not fetch customer profile:", error);
            }

            return {
              id: job.id,
              clientName: customerName,
              clientAvatar: customerAvatar,
              date: new Date(
                job.completed_at || job.created_at,
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              service: job.profession,
              amount: rate,
            };
          }),
        );

        setCompletedJobs(completed);

        // Calculate total earnings from completed jobs
        const total = completed.reduce(
          (sum: number, job: CompletedJob) => sum + job.amount,
          0,
        );
        setThisWeek(total);

        // Calculate pending earnings from accepted but not completed jobs
        const { data: pendingJobsData } = await supabase
          .from("jobs")
          .select("*")
          .in("id", jobIds)
          .eq("status", "bid_accepted");

        if (pendingJobsData) {
          const pendingTotal = pendingJobsData.reduce((sum, job) => {
            const quote = quotesData.find((q) => q.job_id === job.id);
            return sum + (quote?.proposed_rate || 0);
          }, 0);
          setPending(pendingTotal);
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
    if (!selectedOffer || !specialist?.id) {
      alert("Missing offer or specialist information");
      return;
    }

    try {
      // 1. No need to update location - use profile location set during signup
      // Location is already stored in specialist profile from auth/onboarding

      // 2. Create quote
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          job_id: selectedOffer.id,
          worker_id: specialist.id,
          proposed_rate: rate,
          estimated_arrival: 30,
          status: "sent",
        })
        .select()
        .single();

      if (quoteError) {
        console.error("Error creating quote:", quoteError);
        alert("Failed to accept job. Please try again.");
        return;
      }

      // 4. Update job status via API endpoint
      const requestBody = {
        status: "bid_accepted",
        specialist_id: specialist.id,
      };
      const jobUpdateRes = await fetch(`/api/jobs/${selectedOffer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!jobUpdateRes.ok) {
        let errorMessage = `HTTP Error ${jobUpdateRes.status}`;
        const contentType = jobUpdateRes.headers.get("content-type");
        try {
          const responseText = await jobUpdateRes.text();
          if (contentType?.includes("application/json")) {
            const parsed = JSON.parse(responseText);
            errorMessage = parsed.error || parsed.message || errorMessage;
          } else if (responseText) {
            errorMessage = responseText;
          }
        } catch (err) {}
        alert(`Failed to accept job (${jobUpdateRes.status}): ${errorMessage}`);  
        return;
      }

      const jobData = await jobUpdateRes.json();
      if (!jobData.success) {
        alert(`Failed to accept job: ${jobData.error || "Please try again."}`);  
      }

      setPending((prev) => prev + rate);
      setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
      setSelectedOffer(null);
      router.push(`/specialist/job/${selectedOffer.id}`);
    } catch (error) {
      alert("Failed to accept job. Please try again.");
    }
  };

  const handleReject = async () => {
    if (!selectedOffer || !specialist?.id) return;

    try {
      // Reassign job (customer continues searching). Remove current specialist assignment.
      const res = await fetch(`/api/jobs/${selectedOffer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassign: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Failed to reassign job:", err);
      }

      setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
      setSelectedOffer(null);
    } catch (error) {
      console.error("Failed to reject job:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        alert("Failed to logout");
        return;
      }
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred during logout");
    }
  };

  // Show loading while fetching specialist
  if (isLoadingSpecialist) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <Clock size={32} strokeWidth={1.5} className={styles.emptyIcon} />
          <span className={styles.emptyText}>Loading profile...</span>
        </div>
      </div>
    );
  }

  // If no specialist after loading, show message (should redirect soon)
  if (!specialist) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <Clock size={32} strokeWidth={1.5} className={styles.emptyIcon} />
          <span className={styles.emptyText}>Redirecting...</span>
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
      {/* Header */}
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroTop}>
          <div className={styles.heroAvatarWrap}>
            <img
              src={specialist.avatar}
              alt={specialist.name}
              className={styles.heroAvatar}
            />
            <span
              className={`${styles.onlineDot} ${online ? styles.onlineDotActive : ""}`}
            />
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
          <button className={styles.notifBtn} onClick={handleLogout} aria-label="Logout">
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.earningsCard}>
          <div className={styles.earningsPrimary}>
            <span className={styles.earningsCurrency}>₱</span>
            <span className={styles.earningsValue}>
              {thisWeek.toLocaleString()}
            </span>
          </div>
          <span className={styles.earningsLabel}>This week</span>
          <div className={styles.earningsMeta}>
            <TrendingUp
              size={12}
              strokeWidth={2}
              className={styles.earningsIcon}
            />
            <span>₱{pending.toLocaleString()} pending</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.content}>
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`${styles.statCard} ${styles[`stat_${s.accent}`]}`}
            >
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
              <span className={styles.settingDesc}>
                Automatically accept nearby jobs
              </span>
            </div>
            <Toggle
              on={autoAccept}
              onChange={() => setAutoAccept((v) => !v)}
              label="Toggle auto accept"
            />
          </div>
          <div className={styles.settingDivider} />
          <div className={styles.settingRow}>
            <div className={styles.settingLabel}>
              <span className={styles.settingTitle}>Available</span>
              <span className={styles.settingDesc}>
                You&apos;re visible to customers
              </span>
            </div>
            <Toggle
              on={online}
              onChange={() => setOnline((v) => !v)}
              label="Toggle availability"
            />
          </div>
          <div className={styles.settingDivider} />
          <button className={styles.walletRow}>
            <div className={styles.walletLeft}>
              <Wallet size={18} strokeWidth={2} className={styles.walletIcon} />
              <div className={styles.settingLabel}>
                <span className={styles.settingTitle}>Wallet</span>
              </div>
            </div>
            <ArrowUpRight
              size={16}
              strokeWidth={2}
              className={styles.walletArrow}
            />
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
                Offers{" "}
                {offers.length > 0 && (
                  <span className={styles.tabBadge}>{offers.length}</span>
                )}
              </button>
              <button
                className={`${styles.jobTab} ${activeTab === "completed" ? styles.jobTabActive : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                Completed{" "}
                {completedJobs.length > 0 && (
                  <span className={styles.tabBadge}>
                    {completedJobs.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className={styles.jobList}>
            {activeTab === "offers" &&
              (isLoading ? (
                <div className={styles.emptyState}>
                  <Clock
                    size={32}
                    strokeWidth={1.5}
                    className={styles.emptyIcon}
                  />
                  <span className={styles.emptyText}>Loading jobs...</span>
                </div>
              ) : offers.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle2
                    size={32}
                    strokeWidth={1.5}
                    className={styles.emptyIcon}
                  />
                  <span className={styles.emptyText}>
                    No new job offers right now
                  </span>
                </div>
              ) : (
                offers.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    onView={() => setSelectedOffer(o)}
                  />
                ))
              ))}
            {activeTab === "completed" &&
              completedJobs.map((c) => <CompletedCard key={c.id} job={c} />)}
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
