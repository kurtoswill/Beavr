"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Clock,
  CheckCircle2,
  X,
  Copy,
  Check,
} from "lucide-react";
import StarRating from "@/components/StarRating/StarRating";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */
type WorkStage = "working" | "done";

const WORKER = {
  name:     "Kurt Oswill McCarver",
  avatar:   "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80",
  role:     "Electrician",
  rating:   4.2,
  reviews:  203,
  rate:     500,
  currency: "₱",
};

const PAYMENT = {
  method:      "GCash",
  badge:       "G",
  badgeColor:  "#1B6FD8",
  reference:   "807319",
  date:        new Date(2026, 2, 14, 14, 16), // 14 Mar 2026, 14:16
};

/** Simulated job duration in ms (10 s for demo) */
const JOB_DURATION_MS = 10_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatDate(d: Date) {
  return d.toLocaleString("en-GB", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", "");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ================================================================== */
/*  Working spinner                                                     */
/* ================================================================== */
function WorkingSpinner() {
  return (
    <div className={styles.spinnerWrap} aria-label="Worker is currently working">
      <div className={styles.spinnerRing1} />
      <div className={styles.spinnerRing2} />
      <div className={styles.spinnerRing3} />
      <div className={styles.spinnerCenter}>
        <Zap size={28} strokeWidth={1.5} className={styles.spinnerIcon} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Done checkmark                                                      */
/* ================================================================== */
function DoneCheck() {
  return (
    <div className={styles.doneWrap} aria-label="Job complete">
      <div className={styles.doneRing1} />
      <div className={styles.doneRing2} />
      <div className={styles.doneCenter}>
        <CheckCircle2 size={32} strokeWidth={1.5} className={styles.doneIcon} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  COD Pending modal                                                   */
/* ================================================================== */
function CodPendingModal({ onConfirmed }: { onConfirmed: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(onConfirmed, 800);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Payment pending"
      >
        <div className={styles.pendingIconWrap}>
          <div className={styles.pendingRing} />
          <div className={styles.pendingCenter}>
            {confirmed
              ? <Check size={26} strokeWidth={2.5} className={styles.pendingCheckIcon} />
              : <Clock size={26} strokeWidth={1.5} className={styles.pendingClockIcon} />
            }
          </div>
        </div>

        <h2 className={styles.receiptTitle}>
          {confirmed ? "Payment confirmed!" : "Payment pending"}
        </h2>
        <p className={styles.pendingNote}>
          {confirmed
            ? "Your specialist has confirmed the payment. Generating your receipt…"
            : "Waiting for your specialist to confirm the cash payment. This usually takes a moment."}
        </p>

        {!confirmed && (
          <button className={styles.receiptHomeBtn} onClick={handleConfirm}>
            Specialist confirmed — show receipt
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Receipt modal                                                       */
/* ================================================================== */
function ReceiptModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PAYMENT.reference).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Payment receipt"
      >
        {/* Close */}
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Success icon */}
        <div className={styles.receiptIconWrap}>
          <div className={styles.receiptIconRing1} />
          <div className={styles.receiptIconRing2} />
          <div className={styles.receiptIconCenter}>
            <Check size={28} strokeWidth={2.5} className={styles.receiptCheckIcon} />
          </div>
        </div>

        <h2 className={styles.receiptTitle}>Payment successful</h2>

        {/* Amount */}
        <div className={styles.receiptAmount}>
          <span className={styles.receiptCurrencyLabel}>PHP</span>
          <span className={styles.receiptAmountValue}>
            {WORKER.currency}{WORKER.rate.toLocaleString()}.00
          </span>
        </div>

        {/* Details table */}
        <div className={styles.receiptTable}>
          {/* Payment method row */}
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>Payment method:</span>
            <div className={styles.receiptMethodBadge}>
              <span
                className={styles.receiptBadgeIcon}
                style={{ background: PAYMENT.badgeColor }}
              >
                {PAYMENT.badge}
              </span>
              <span className={styles.receiptMethodName}>{PAYMENT.method}</span>
            </div>
          </div>

          <div className={styles.receiptDivider} />

          {/* Work fee */}
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>Work fee</span>
            <span className={styles.receiptValue}>
              {WORKER.currency}{WORKER.rate.toLocaleString()}
            </span>
          </div>

          <div className={styles.receiptDivider} />

          {/* Reference */}
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>Reference Number</span>
            <button className={styles.receiptRefRow} onClick={handleCopy} aria-label="Copy reference number">
              <span className={styles.receiptValue}>{PAYMENT.reference}</span>
              {copied
                ? <Check size={13} strokeWidth={2.5} className={styles.receiptCopied} />
                : <Copy size={13} strokeWidth={2} className={styles.receiptCopyIcon} />
              }
            </button>
          </div>

          <div className={styles.receiptDivider} />

          {/* Date */}
          <div className={styles.receiptRow}>
            <span className={styles.receiptLabel}>Transaction Date &amp; Time</span>
            <span className={styles.receiptValue}>{formatDate(PAYMENT.date)}</span>
          </div>
        </div>

        {/* CTA */}
        <button
          className={styles.receiptHomeBtn}
          onClick={() => router.push("/rate/job-001")}
        >
          Rate your specialist
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function WorkingPage() {
  const router                          = useRouter();
  const [stage, setStage]               = useState<WorkStage>("working");
  const [elapsed, setElapsed]           = useState(0);     // seconds
  const [showReceipt, setShowReceipt]   = useState(false);
  const [showCodPending, setShowCodPending] = useState(false);
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Simulate job completing after JOB_DURATION_MS */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    const done = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setStage("done");
    }, JOB_DURATION_MS);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(done);
    };
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const isCOD = PAYMENT.method === "COD";

  const handlePay = () => {
    if (isCOD) {
      setShowCodPending(true);
    } else {
      setShowReceipt(true);
    }
  };

  // Called when COD is confirmed by the pro
  const handleCodConfirmed = () => {
    setShowCodPending(false);
    setShowReceipt(true);
  };

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <span className={styles.headerTitle}>
          {stage === "working" ? "In Progress" : "Job Complete"}
        </span>
      </header>

      {/* Main content */}
      <main className={styles.main}>

        {/* Status animation */}
        <div className={styles.statusSection}>
          {stage === "working" ? <WorkingSpinner /> : <DoneCheck />}

          <div className={styles.statusText}>
            <h1 className={styles.statusHeadline}>
              {stage === "working"
                ? "Your specialist is on the job"
                : "All wrapped up!"}
            </h1>
            <p className={styles.statusSub}>
              {stage === "working"
                ? "Sit tight — your specialist is hard at work right now."
                : "Your specialist has finished the job. Time to settle up."}
            </p>
          </div>

          {/* Elapsed timer — only while working */}
          {stage === "working" && (
            <div className={styles.timer}>
              <Clock size={14} strokeWidth={2} className={styles.timerIcon} />
              <span className={styles.timerText}>
                {mins > 0 ? `${mins}m ` : ""}{pad(secs)}s elapsed
              </span>
            </div>
          )}
        </div>

        {/* Worker card */}
        <div className={styles.workerCard}>
          <div className={styles.workerAvatar}>
            <img src={WORKER.avatar} alt={WORKER.name} />
          </div>
          <div className={styles.workerInfo}>
            <span className={styles.workerName}>{WORKER.name}</span>
            <StarRating rating={WORKER.rating} reviewCount={WORKER.reviews} size={13} />
            <div className={styles.workerRoleRow}>
              <Zap size={13} strokeWidth={2} className={styles.workerRoleIcon} />
              <span className={styles.workerRole}>{WORKER.role}</span>
            </div>
          </div>
          <span className={styles.workerRate}>
            {WORKER.currency}{WORKER.rate.toLocaleString()}
          </span>
        </div>

      </main>

      {/* Bottom CTA — only when done */}
      {stage === "done" && (
        <div className={styles.bottomBar}>
          <button className={styles.payBtn} onClick={handlePay}>
            {isCOD
              ? `Pay ${WORKER.currency}${WORKER.rate.toLocaleString()} — Cash`
              : `Pay ${WORKER.currency}${WORKER.rate.toLocaleString()} via ${PAYMENT.method}`}
          </button>
        </div>
      )}

      {/* COD pending modal */}
      {showCodPending && (
        <CodPendingModal onConfirmed={handleCodConfirmed} />
      )}

      {/* Receipt modal */}
      {showReceipt && (
        <ReceiptModal onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}