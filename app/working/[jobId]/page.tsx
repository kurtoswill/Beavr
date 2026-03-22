"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase"; // Ensure supabase is imported for ID retrieval
import {
  Zap,
  Clock,
  CheckCircle2,
  X,
  Copy,
  Check,
  Loader2
} from "lucide-react";
import StarRating from "@/components/StarRating/StarRating";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types & Constants                                                 */
/* ------------------------------------------------------------------ */
type WorkStage = "working" | "done";

interface Job {
  id: string;
  customer_id: string;
  profession: string;
  status: string;
  specialist_id: string | null;
}

interface Specialist {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  rating?: number;
  reviews_count?: number;
  min_rate?: number | null;
}

const PAYMENT_INFO = {
  method: "GCash",
  badge: "G",
  badgeColor: "#1B6FD8",
  reference: Math.floor(100000 + Math.random() * 900000).toString(),
  date: new Date(),
};

/* ------------------------------------------------------------------ */
/* Sub-Components                                                    */
/* ------------------------------------------------------------------ */

function WorkingSpinner() {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinnerRing1} />
      <div className={styles.spinnerRing2} />
      <div className={styles.spinnerRing3} />
      <div className={styles.spinnerCenter}>
        <Zap size={28} strokeWidth={1.5} className={styles.spinnerIcon} />
      </div>
    </div>
  );
}

function DoneCheck() {
  return (
    <div className={styles.doneWrap}>
      <div className={styles.doneRing1} />
      <div className={styles.doneRing2} />
      <div className={styles.doneCenter}>
        <CheckCircle2 size={32} strokeWidth={1.5} className={styles.doneIcon} />
      </div>
    </div>
  );
}

/* ================================================================== */
/* Main Page Component                                               */
/* ================================================================== */
export default function WorkingPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [stage, setStage] = useState<WorkStage>("working");
  const [job, setJob] = useState<Job | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [rate, setRate] = useState<number>(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // 1. Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        const { job: jobData } = await jobRes.json();
        setJob(jobData);

        // Sync local stage with DB status
        if (jobData.status === "completed") setStage("done");

        if (jobData.specialist_id) {
          const specRes = await fetch(`/api/specialists/${jobData.specialist_id}`);
          const { specialist: specData } = await specRes.json();
          setSpecialist(specData);
        }

        const quoteRes = await fetch(`/api/quotes?job_id=${jobId}`);
        const quoteData = await quoteRes.json();
        if (quoteData.quotes?.[0]?.proposed_rate) {
          setRate(quoteData.quotes[0].proposed_rate);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId]);

  // 2. Real-time Status Polling - Updates when job is completed
  useEffect(() => {
    // If we are already showing receipt (payment done), stop polling
    if (showReceipt) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        const updatedStatus = data.job.status as string;

        // If job is completed and we're working, move to done
        if (updatedStatus === "completed" && stage === "working") {
          setStage("done");
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, stage, showReceipt]);

  // 3. Simple Timer
  useEffect(() => {
    if (stage !== "working") return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [stage]);

  // 4. Handle Payment Logic - FIXED: Now sends all required fields
  const handlePay = async () => {
    if (!job || !jobId) return;
    
    setProcessingPayment(true);
    try {
      // Get current user ID from Supabase auth (more reliable than localStorage for thesis)
      const { data: { user } } = await supabase.auth.getUser();
      const customerId = user?.id || job.customer_id;

      const payload = {
        job_id: jobId,
        payment_method: "GCash",
        amount: Number(rate), // Ensure it's a number
        customer_id: customerId,
      };

      console.log("Sending payment payload:", payload);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowReceipt(true);
      } else {
        const error = await response.json();
        alert(error.error || "Payment failed");
      }
    } catch (err) {
      console.error("Payment connection error:", err);
      alert("Connection error. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>
          {stage === "working" ? "In Progress" : "Job Complete"}
        </span>
      </header>

      <main className={styles.main}>
        <div className={styles.statusSection}>
          {stage === "working" ? <WorkingSpinner /> : <DoneCheck />}
          <div className={styles.statusText}>
            <h1 className={styles.statusHeadline}>
              {stage === "working" ? "Specialist is working" : "All wrapped up!"}
            </h1>
            <p className={styles.statusSub}>
              {stage === "working"
                ? "Sit tight — your specialist is hard at work."
                : "The job is finished. Ready to send payment?"}
            </p>
          </div>

          {stage === "working" && (
            <div className={styles.timer}>
              <Clock size={14} className={styles.timerIcon} />
              <span>{mins}:{secs < 10 ? `0${secs}` : secs} elapsed</span>
            </div>
          )}
        </div>

        <div className={styles.workerCard}>
          <div className={styles.workerAvatar}>
            <img src={specialist?.avatar_url || "/default-avatar.png"} alt="Avatar" />
          </div>
          <div className={styles.workerInfo}>
            <span className={styles.workerName}>{specialist?.full_name}</span>
            <StarRating rating={specialist?.rating || 0} reviewCount={specialist?.reviews_count || 0} size={13} />
          </div>
          <span className={styles.workerRate}>₱{rate.toLocaleString()}</span>
        </div>
      </main>

      {stage === "done" && (
        <div className={styles.bottomBar}>
          <button 
            className={styles.payBtn} 
            onClick={handlePay} 
            disabled={processingPayment}
          >
            {processingPayment ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                <span>Processing...</span>
              </div>
            ) : (
              `Pay ₱${rate.toLocaleString()} via GCash`
            )}
          </button>
        </div>
      )}

      {showReceipt && (
        <ReceiptModal 
          onClose={() => setShowReceipt(false)} 
          rate={rate} 
          jobId={jobId} 
        />
      )}
    </div>
  );
}

/* ================================================================== */
/* Receipt Modal Component                                           */
/* ================================================================== */
function ReceiptModal({ onClose, rate, jobId }: { onClose: () => void; rate: number; jobId: string }) {
  const router = useRouter();
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.receiptIconWrap}>
          <Check size={28} className={styles.receiptCheckIcon} />
        </div>
        <h2 className={styles.receiptTitle}>Payment successful</h2>
        <div className={styles.receiptAmount}>
          <span className={styles.receiptCurrencyLabel}>PHP</span>
          <span className={styles.receiptAmountValue}>₱{rate.toLocaleString()}.00</span>
        </div>
        <div className={styles.receiptTable}>
          <div className={styles.receiptRow}>
            <span>Reference</span>
            <span>{PAYMENT_INFO.reference}</span>
          </div>
        </div>
        <button
          className={styles.receiptHomeBtn}
          onClick={() => router.push(`/rate/${jobId}`)}
        >
          Rate your specialist
        </button>
      </div>
    </div>
  );
}