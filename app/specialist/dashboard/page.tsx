/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import ProfilePictureModal from "@/components/ProfilePictureModal/ProfilePictureModal";
import styles from "./page.module.css";

import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Types - From Database Schema                                        */
/* ------------------------------------------------------------------ */
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

interface Quote {
  id: string;
  job_id: string;
  worker_id: string;
  proposed_rate: number;
  estimated_arrival?: number;
  status: string;
  created_at: string;
}

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
  user_id: string; // ← added: store user_id alongside row id
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

interface JobsResponse {
  success: boolean;
  jobs?: Job[];
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Helper: Map job from API to JobOffer format                        */
/* ------------------------------------------------------------------ */
async function mapJobToOffer(job: Job): Promise<JobOffer> {
  let customerName = "Customer";
  let customerAvatar = "https://i.pravatar.cc/80?img=5";

  try {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", job.customer_id)
      .single() as { data: { full_name: string; avatar_url: string } | null; error: unknown };

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
            <Navigation size={14} strokeWidth={2} className={styles.modalDetailIcon} />
            <div>
              <span className={styles.modalDetailLabel}>Distance</span>
              <span className={styles.modalDetailValue}>{offer.distance} · {offer.eta} away</span>
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
          <button className={styles.rejectBtn} onClick={onReject}>Reject</button>
          <button className={styles.acceptBtn} onClick={handleAccept}>Accept job</button>
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string>("https://i.pravatar.cc/80?img=5");

  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [specialist, setSpecialist] = useState<SpecialistProfile | null>(null);
  const [isLoadingSpecialist, setIsLoadingSpecialist] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile picture modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // UI state
  const [autoAccept, setAutoAccept] = useState(true);
  const [online, setOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<"offers" | "completed">("offers");
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoAcceptedJobIds, setAutoAcceptedJobIds] = useState<Set<string>>(new Set());
  const [declinedJobIds, setDeclinedJobIds] = useState<Map<string, number>>(new Map());
  const [lastRejectionTime, setLastRejectionTime] = useState<number | null>(null);

  const [thisWeek, setThisWeek] = useState(0);
  const [pending, setPending] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [pendingPaymentJobs, setPendingPaymentJobs] = useState<CompletedJob[]>([]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

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

          const { data: specialistData, error: specialistError } = await supabase
            .from("specialists")
            .select(`
              *,
              profiles:user_id (
                id,
                full_name,
                avatar_url,
                email,
                phone,
                role
              )
            `)
            .eq("user_id", user.id)
            .limit(1) as unknown as {
              data: Array<{
                id: string;
                user_id: string;
                profession: string;
                rating_avg: number;
                jobs_completed: number;
                profiles: { full_name: string; avatar_url: string; email: string; phone: string; role: string } | null;
              }> | null;
              error: unknown;
            };

          if (specialistError) {
            console.error("Error fetching specialist:", specialistError);
            setAuthError("No specialist profile found");
            setIsLoadingSpecialist(false);
            setTimeout(() => router.push("/"), 100);
            return;
          }

          const specialistRow = specialistData?.[0];

          if (!specialistRow) {
            console.warn("No specialist profile found for user");
            setAuthError("No specialist profile found");
            setIsLoadingSpecialist(false);
            setTimeout(() => router.push("/"), 100);
            return;
          }

          // Calculate dynamic stats
          const { count: reviewsCount, error: reviewsError } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewee_id', user.id);

          if (reviewsError) console.warn('Error fetching reviews count:', reviewsError);

          // compute average rating from all review rows directly in dashboard
          let computedRating = 0;
          const { data: reviewRows, error: reviewRowsError } = await supabase
            .from('reviews')
            .select('rating_value')
            .eq('reviewee_id', user.id);

          if (reviewRowsError) {
            console.warn('Error fetching review rows for avg rating:', reviewRowsError);
          } else if (reviewRows && reviewRows.length > 0) {
            const totalScore = reviewRows.reduce((sum, row) => sum + (row.rating_value || 0), 0);
            computedRating = totalScore / reviewRows.length;
          }

          const { count: totalJobsAssigned, error: jobsAssignedError } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('specialist_id', user.id);

          if (jobsAssignedError) console.warn('Error fetching total jobs:', jobsAssignedError);

          const totalAssigned = totalJobsAssigned || 0;
          // Keep this as a fallback; completion will be recalculated based on offers + completed jobs
          const completionPercentageFromAssigned = totalAssigned > 0 ? (specialistRow.jobs_completed / totalAssigned) * 100 : 0;

          // Response rate calculation: completed jobs vs rated/reviewed jobs
          const { count: completedJobsCount, error: completedJobsError } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('specialist_id', user.id)
            .eq('status', 'completed');

          if (completedJobsError) console.warn('Error fetching completed jobs count:', completedJobsError);

          const completedCount = completedJobsCount || 0;
          const ratedCount = reviewsCount || 0;

          const responseRate = completedCount > 0 ? (ratedCount / completedCount) * 100 : 0;

          // Total earned calculation - fetch actual wallet balance from worker_details
          const { data: walletData, error: walletError } = await supabase
            .from('worker_details')
            .select('wallet_balance')
            .eq('id', specialistRow.user_id)
            .maybeSingle() as { data: { wallet_balance: number } | null; error: any };

          if (walletError) console.warn('Error fetching wallet:', walletError);

          const totalEarned = walletData?.wallet_balance || 0;

          setSpecialist({
            id: specialistRow.id,           // specialists table row id
            user_id: specialistRow.user_id, // ← auth user id (needed for job writes)
            name: specialistRow.profiles?.full_name || user.email?.split("@")[0] || "Specialist",
            avatar: specialistRow.profiles?.avatar_url || "https://i.pravatar.cc/80?img=5",
            role: specialistRow.profession || "General",
            rating: computedRating || specialistRow.rating_avg || 0,
            reviews: reviewsCount || 0,
            completionRate: Math.round(completionPercentageFromAssigned),
            totalEarned: totalEarned,
            thisWeek: 0, // will be updated in fetchCompleted
            pending: 0,  // will be updated in fetchCompleted
            responseRate: Math.round(responseRate),
          });
        } else {
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
          const now = Date.now();
          const mappedOffers = await Promise.all(
            data.jobs
              .filter((job: Job) => {
                const declinedAt = declinedJobIds.get(job.id);
                return !declinedAt || now - declinedAt > 10000;
              })
              .map((job: Job) => mapJobToOffer(job)),
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
  const fetchCompleted = useCallback(async () => {
    if (!specialist?.id) return;

    try {
      // Get current wallet balance
      const { data: walletData } = await supabase
        .from('worker_details')
        .select('wallet_balance')
        .eq('id', specialist.user_id)
        .maybeSingle() as { data: { wallet_balance: number } | null; error: unknown };

      const currentBalance = walletData?.wallet_balance || 0;

      // Fetch all completed jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("specialist_id", specialist.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (jobsError || !jobsData || jobsData.length === 0) {
        setPendingPaymentJobs([]);
        return;
      }

      const completed = await Promise.all(
        jobsData.map(async (job: Job) => {
          let customerName = "Customer";
          let customerAvatar = "https://i.pravatar.cc/80?img=5";

          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", job.customer_id)
              .single() as { data: { full_name: string; avatar_url: string } | null; error: unknown };

            if (profileData) {
              customerName = profileData.full_name || "Customer";
              customerAvatar = profileData.avatar_url || customerAvatar;
            }
          } catch (error) {
            console.warn("Could not fetch customer profile:", error);
          }

          const { data: quoteData } = await supabase
            .from("quotes")
            .select("proposed_rate")
            .eq("job_id", job.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle() as { data: { proposed_rate: number } | null; error: unknown };

          const rate = quoteData?.proposed_rate || 500;

          return {
            id: job.id,
            clientName: customerName,
            clientAvatar: customerAvatar,
            date: new Date(job.completed_at || job.created_at).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            }),
            service: job.profession,
            amount: rate,
          };
        }),
      );

      // If wallet has balance, consider oldest jobs as paid
      let remainingJobs = [...completed];
      if (currentBalance > 0) {
        let balanceLeft = currentBalance;
        remainingJobs = [];
        
        // Process jobs from oldest to newest
        const sortedJobs = [...completed].reverse();
        for (const job of sortedJobs) {
          if (balanceLeft >= job.amount) {
            balanceLeft -= job.amount;
          } else {
            remainingJobs.push(job);
          }
        }
      }

      setPendingPaymentJobs(remainingJobs);
      setCompletedJobs(completed);
      setThisWeek(completed.reduce((sum: number, job: CompletedJob) => sum + job.amount, 0));

      const { data: pendingJobsData } = await supabase
        .from("jobs")
        .select("*")
        .eq("specialist_id", specialist.id)
        .eq("status", "bid_accepted") as unknown as { data: Job[] | null };

      if (pendingJobsData) {
        setPending(
          pendingJobsData.reduce((sum) => sum + 500, 0)
        );
      }
    } catch (error) {
      console.error("Failed to fetch completed jobs:", error);
    }
  }, [specialist?.id]);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  useEffect(() => {
    if (!specialist?.id) return;

    const channel = supabase
      .channel('job-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `specialist_id=eq.${specialist.id}`,
        },
        () => {
          fetchCompleted();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [specialist?.id, fetchCompleted]);

  // Recalculate completion percentage as completed / (offers + completed)
  useEffect(() => {
    const offeredCount = offers.length;
    const completedCount = completedJobs.length;
    const totalCount = offeredCount + completedCount;
    const computedCompletion = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    setSpecialist((prev) =>
      prev ? { ...prev, completionRate: computedCompletion } : prev
    );
  }, [offers.length, completedJobs.length]);

  // Auto-accept
  useEffect(() => {
    if (!autoAccept || !specialist?.id || offers.length === 0) return;

    const checkForAutoAccept = () => {
      const now = Date.now();
      if (lastRejectionTime && now - lastRejectionTime < 4000) return false;

      const newOffer = offers.find((offer) => {
        const declinedAt = declinedJobIds.get(offer.id);
        return (
          !autoAcceptedJobIds.has(offer.id) &&
          offer.id !== selectedOffer?.id &&
          (!declinedAt || now - declinedAt > 10000)
        );
      });

      if (newOffer && !selectedOffer) {
        setSelectedOffer(newOffer);
        return true;
      }
      return false;
    };

    const modalShown = checkForAutoAccept();

    if (!modalShown && lastRejectionTime) {
      const timeSinceRejection = Date.now() - lastRejectionTime;
      if (timeSinceRejection < 4000) {
        const timeoutId = setTimeout(checkForAutoAccept, 4000 - timeSinceRejection);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [offers, autoAccept, specialist?.id, autoAcceptedJobIds, selectedOffer, lastRejectionTime]);

  /* ---------------------------------------------------------------- */
  /*  ✅ FIXED handleAccept                                            */
  /*  Writes specialist.user_id (auth uid) into jobs.specialist_id    */
  /*  so the tracking page can call /api/specialists/[user_id] and    */
  /*  get the specialist profile back correctly.                       */
  /* ---------------------------------------------------------------- */
  const handleAccept = async (rate: number) => {
    if (!selectedOffer || !specialist?.id) {
      alert("Missing offer or specialist information");
      return;
    }

    try {
      // 1. Create the quote
      // We use specialist.id (the row ID from the 'specialists' table)
      const { error: quoteError } = await (supabase.from("quotes") as any)
        .insert({
          job_id: selectedOffer.id,
          worker_id: specialist.id,
          proposed_rate: rate,
          estimated_arrival: 30,
          status: "sent",
        });

      if (quoteError) throw quoteError;

      // 2. Update Job Status
      // IMPORTANT: We do NOT deduct from wallet_balance here. 
      // This PATCH only changes the job state and assigns the specialist.
      const jobUpdateRes = await fetch(`/api/jobs/${selectedOffer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "bid_accepted",
          specialist_id: specialist.id,
        }),
      });

      if (!jobUpdateRes.ok) throw new Error("Failed to update job status");

      // 3. Update UI Local State
      // We only increase the 'pending' visual counter. 
      // The 'totalEarned' stays the same because the job isn't finished.
      setPending((prev) => prev + rate);
      setOffers((prev) => prev.filter((o) => o.id !== selectedOffer.id));
      setAutoAcceptedJobIds((prev) => new Set(prev).add(selectedOffer.id));
      setSelectedOffer(null);

      // Navigate to tracking
      router.push(`/specialist/job/${selectedOffer.id}`);
    } catch (error) {
      console.error("Failed to accept job:", error);
      alert("An error occurred while accepting the job.");
    }
  };

  const handleReject = async () => {
    if (!selectedOffer || !specialist?.id) return;

    try {
      const res = await fetch(`/api/jobs/${selectedOffer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassign: true }),
      });

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errorMessage += err.error ? `: ${err.error}` : "";
          if (err.details) errorMessage += ` (${err.details})`;
        } catch (parseError) {
          errorMessage += res.statusText ? `: ${res.statusText}` : "";
        }
        console.error("Failed to reassign job:", errorMessage);
      }

      setDeclinedJobIds((prev) => new Map(prev).set(selectedOffer.id, Date.now()));
      setLastRejectionTime(Date.now());
      setSelectedOffer(null);
    } catch (error) {
      console.error("Failed to reject job:", error);
    }
  };

  /* ---- Upload profile picture ---- */
  const handleUploadProfilePicture = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "avatars");

    // Step 1: Upload image to storage
    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(uploadData.error || "Failed to upload image");
    }

    const imageUrl = uploadData.url;

    // Step 2: Update profile with new avatar URL
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const profileResponse = await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ avatar_url: imageUrl }),
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      throw new Error(profileData.error || "Failed to update profile");
    }

    // Update local state
    setSpecialist((prev) => prev ? { ...prev, avatar: imageUrl } : prev);
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
    { label: "Completion", value: `${specialist.completionRate}%`, sub: "Rate", accent: "green" },
    { label: "Rating", value: specialist.rating.toFixed(1), sub: `${specialist.reviews} reviews`, accent: "yellow" },
    { label: "Earned", value: `₱${(specialist.totalEarned / 1000).toFixed(1)}k`, sub: "Total", accent: "brand" },
    { label: "Response", value: `${specialist.responseRate}%`, sub: "Rate", accent: "blue" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroTop}>
          <div className={styles.heroAvatarWrap}>
            <button
              className={styles.heroAvatarButton}
              onClick={() => setIsProfileModalOpen(true)}
              aria-label="Change profile picture"
            >
              <img
                src={specialist.avatar}
                alt={specialist.name}
                className={styles.heroAvatar}
              />
            </button>
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
          <button className={styles.notifBtn} onClick={() => setShowNotifPanel(!showNotifPanel)} aria-label="Notifications">
            <BellDot size={20} strokeWidth={2} />
            {pendingPaymentJobs.length > 0 && <span className={styles.notifBadge}>{pendingPaymentJobs.length}</span>}
          </button>
          <button className={styles.notifBtn} onClick={handleLogout} aria-label="Logout">
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.earningsCard}>
          <div className={styles.earningsPrimary}>
            <span className={styles.earningsCurrency}>₱</span>
            <span className={styles.earningsValue}>{specialist.totalEarned.toLocaleString()}</span>
          </div>
          <span className={styles.earningsLabel}>Total earned</span>
          <div className={styles.earningsMeta}>
            <TrendingUp size={12} strokeWidth={2} className={styles.earningsIcon} />
            <span>₱{pending.toLocaleString()} pending</span>
          </div>
        </div>
      </header>

      {showNotifPanel && (
        <div className={styles.notifPanel}>
          <div className={styles.notifPanelHeader}>
            <span className={styles.notifPanelTitle}>Payment Notifications</span>
            <button className={styles.notifPanelClose} onClick={() => setShowNotifPanel(false)}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <div className={styles.notifPanelContent}>
            {pendingPaymentJobs.length === 0 ? (
              <div className={styles.notifEmpty}>
                <CheckCircle2 size={24} strokeWidth={2} />
                <span>No pending payments</span>
              </div>
            ) : (
              pendingPaymentJobs.map((job) => (
                <div key={job.id} className={styles.notifItem}>
                  <img src={job.clientAvatar} alt={job.clientName} className={styles.notifAvatar} />
                  <div className={styles.notifInfo}>
                    <span className={styles.notifJobTitle}>Payment from {job.clientName}</span>
                    <span className={styles.notifJobMeta}>{job.date} · {job.service}</span>
                  </div>
                  <div className={styles.notifAmount}>
                    <span className={styles.notifCurrency}>₱</span>
                    <span className={styles.notifValue}>{job.amount.toLocaleString()}</span>
                    <span className={styles.notifStatus}>Awaiting Payment</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
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
                Offers{" "}
                {offers.length > 0 && <span className={styles.tabBadge}>{offers.length}</span>}
              </button>
              <button
                className={`${styles.jobTab} ${activeTab === "completed" ? styles.jobTabActive : ""}`}
                onClick={() => setActiveTab("completed")}
              >
                Completed{" "}
                {completedJobs.length > 0 && <span className={styles.tabBadge}>{completedJobs.length}</span>}
              </button>
            </div>
          </div>

          <div className={styles.jobList}>
            {activeTab === "offers" &&
              (isLoading ? (
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
                offers.map((o) => (
                  <OfferCard key={o.id} offer={o} onView={() => setSelectedOffer(o)} />
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

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentAvatar={specialist.avatar}
        onUpload={handleUploadProfilePicture}
        userName={specialist.name}
      />
    </div>
  );
}