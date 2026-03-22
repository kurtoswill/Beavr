"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Check, ArrowLeft } from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Mode = "signin" | "signup";

interface FormState {
  name:     string;
  email:    string;
  password: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

/* ------------------------------------------------------------------ */
/*  Password strength indicator                                         */
/* ------------------------------------------------------------------ */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters",    ok: password.length >= 8       },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password)     },
    { label: "Number",           ok: /[0-9]/.test(password)     },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor = ["", "#EF4444", "#F59E0B", "#22C55E"][score];

  if (!password) return null;

  return (
    <div className={styles.strengthWrap}>
      <div className={styles.strengthBars}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={styles.strengthBar}
            style={{ background: i < score ? barColor : undefined }}
          />
        ))}
      </div>
      <div className={styles.strengthChecks}>
        {checks.map((c) => (
          <span key={c.label} className={`${styles.strengthCheck} ${c.ok ? styles.checkOk : ""}`}>
            <Check size={10} strokeWidth={3} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>("signin");
  const [form, setForm]       = useState<FormState>({ name: "", email: "", password: "" });
  const [errors, setErrors]   = useState<FieldErrors>({});
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (mode === "signup" && !form.name.trim())           e.name     = "Please enter your name";
    if (!form.email.trim())                                e.email    = "Please enter your email";
    else if (!/\S+@\S+\.\S+/.test(form.email))            e.email    = "Enter a valid email address";
    if (!form.password)                                    e.password = "Please enter a password";
    else if (mode === "signup" && form.password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    await new Promise((r) => setTimeout(r, 700));
    router.push("/");
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setForm({ name: "", email: "", password: "" });
    setDone(false);
    setShowPw(false);
  };

  return (
    <div className={styles.page}>

      {/* Background glows */}
      <div className={styles.glow1} aria-hidden />
      <div className={styles.glow2} aria-hidden />

      {/* Back button */}
      <button
        className={styles.backBtn}
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>

      <div className={styles.card}>

        {/* ── Beavr logo ── */}
        <div className={styles.logo}>
          <span className={styles.logoText}>Beavr</span>
        </div>

        {/* ── Headline ── */}
        <div className={styles.headline}>
          <h1 className={styles.title}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className={styles.subtitle}>
            {mode === "signin"
              ? "Sign in to find specialists near you."
              : "Get help in minutes. Join Beavr for free."}
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={mode === "signin"}
            className={`${styles.tab} ${mode === "signin" ? styles.tabActive : ""}`}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === "signup"}
            className={`${styles.tab} ${mode === "signup" ? styles.tabActive : ""}`}
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
        </div>

        {/* ── Form fields ── */}
        <div className={styles.form}>

          {/* Name — signup only */}
          {mode === "signup" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="beavr-name">Full name</label>
              <input
                id="beavr-name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                placeholder="ex. Maria Santos"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "err-name" : undefined}
              />
              {errors.name && <span id="err-name" className={styles.errMsg}>{errors.name}</span>}
            </div>
          )}

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="beavr-email">Email</label>
            <input
              id="beavr-email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "err-email" : undefined}
            />
            {errors.email && <span id="err-email" className={styles.errMsg}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="beavr-pw">Password</label>
              {mode === "signin" && (
                <button type="button" className={styles.forgotBtn}>Forgot password?</button>
              )}
            </div>
            <div className={`${styles.pwWrap} ${errors.password ? styles.inputError : ""}`}>
              <input
                id="beavr-pw"
                type={showPw ? "text" : "password"}
                className={styles.pwInput}
                placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "err-pw" : undefined}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
            </div>
            {errors.password && <span id="err-pw" className={styles.errMsg}>{errors.password}</span>}
            {mode === "signup" && <PasswordStrength password={form.password} />}
          </div>

          {/* Submit */}
          <button
            className={`${styles.submitBtn} ${done ? styles.submitDone : ""}`}
            onClick={handleSubmit}
            disabled={loading || done}
            aria-busy={loading}
          >
            {done ? (
              <><Check size={18} strokeWidth={2.5} /> {mode === "signup" ? "Account created!" : "Signed in!"}</>
            ) : loading ? (
              <span className={styles.spinner} />
            ) : (
              <>{mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={16} strokeWidth={2.5} /></>
            )}
          </button>
        </div>

        {/* ── Divider ── */}
        <div className={styles.divider}>
          <span /><span className={styles.dividerText}>or</span><span />
        </div>

        {/* ── Google OAuth stub ── */}
        <button className={styles.googleBtn} aria-label="Continue with Google">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* ── Switch mode link ── */}
        <p className={styles.switchText}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            className={styles.switchBtn}
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* ── Terms — signup only ── */}
        {mode === "signup" && (
          <p className={styles.terms}>
            By creating an account you agree to our{" "}
            <a href="#" className={styles.termsLink}>Terms of Service</a>{" "}
            and{" "}
            <a href="#" className={styles.termsLink}>Privacy Policy</a>.
          </p>
        )}

      </div>
    </div>
  );
}