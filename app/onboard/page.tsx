"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CloudUpload,
  MapPin,
  Check,
  X,
  FileText,
  Award,
  BadgeCheck,
} from "lucide-react";
import styles from "./page.module.css";

/* ================================================================== */
/*  Data                                                                */
/* ================================================================== */
const TOTAL_STEPS = 5; // Step 5 = Verify

/* ---- Region: CALABARZON only ---- */
const REGION = "CALABARZON (Region IV-A)";

const PROVINCES = ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"];

const CITIES: Record<string, string[]> = {
  Batangas: ["Agoncillo","Alitagtag","Balayan","Balete","Batangas City","Bauan","Calaca","Calatagan","Cuenca","Ibaan","Laurel","Lemery","Lian","Lipa City","Lobo","Mabini","Malvar","Mataas na Kahoy","Nasugbu","Padre Garcia","Rosario","San Jose","San Juan","San Luis","San Nicolas","San Pascual","Santa Teresita","Santo Tomas","Taal","Talisay","Taysan","Tingloy","Tuy"],
  Cavite: ["Alfonso","Amadeo","Bacoor","Carmona","Cavite City","Dasmariñas","General Emilio Aguinaldo","General Mariano Alvarez","General Trias","Imus","Indang","Kawit","Magallanes","Maragondon","Mendez","Naic","Noveleta","Rosario","Silang","Tagaytay","Tanza","Ternate","Trece Martires"],
  Laguna: ["Alaminos","Bay","Biñan","Cabuyao","Calamba","Cavinti","Famy","Kalayaan","Liliw","Los Baños","Luisiana","Lumban","Mabitac","Magdalena","Majayjay","Nagcarlan","Paete","Pagsanjan","Pakil","Pangil","Pila","Rizal","San Pablo","San Pedro","Santa Cruz","Santa Maria","Santa Rosa","Siniloan","Victoria"],
  Quezon: ["Agdangan","Alabat","Atimonan","Buenavista","Burdeos","Calauag","Candelaria","Catanauan","Dolores","General Luna","General Nakar","Guinayangan","Gumaca","Infanta","Jomalig","Lopez","Lucban","Lucena City","Macalelon","Mauban","Mulanay","Padre Burgos","Pagbilao","Panukulan","Patnanungan","Perez","Pitogo","Plaridel","Polillo","Quezon","Real","Sampaloc","San Andres","San Antonio","San Francisco","San Narciso","Sariaya","Tagkawayan","Tayabas","Tiaong","Unisan"],
  Rizal: ["Angono","Antipolo","Baras","Binangonan","Cainta","Cardona","Jalajala","Morong","Pililla","Rodriguez","San Mateo","Tanay","Taytay","Teresa"],
};

const BARANGAYS: Record<string, string[]> = {
  /* Cavite - Indang */
  Indang: ["Agus-os","Alulod","Banaba Cerca","Banaba Lejos","Bancod","Bancod Sur","Biluso","Carasuchi","Guyam Malaki","Guyam Munti","Harasan","Kayquit I","Kayquit II","Kayquit III","Kaytambog","Limbon","Lumampong Balagbag","Lumampong Hagdang","Mabunga","Mataas na Lupa","Pulo","Tambo Balagbag","Tambo Kulit","Tambo Malaki","Toclong I","Toclong II"],
  /* Cavite - Dasmariñas */
  "Dasmariñas": ["Burol I","Burol II","Burol III","Emmanuel Bergado I","Emmanuel Bergado II","Fatima I","Fatima II","Fatima III","Langkaan I","Langkaan II","Luzviminda I","Luzviminda II","Paliparan I","Paliparan II","Paliparan III","Sabang","Salawag","Salitran I","Salitran II","Salitran III","Salitran IV","Sampaloc I","Sampaloc II","Sampaloc III","Sampaloc IV","San Agustin I","San Agustin II","San Agustin III","Zone I","Zone II","Zone III","Zone IV"],
  /* Batangas City */
  "Batangas City": ["Alangilan","Balagtas","Balete","Banaba Center","Banaba East","Banaba West","Banaba South","Bilogo","Bolbok","Bukal","Calicanto","Catandala","Concepcion","Convergys","Cuta","Dalig","Dela Paz","Dela Paz Proper","Domoit","Gulod Itaas","Gulod Labac","Kumintang Ibaba","Kumintang Ilaya","Libjo","Liponpon","Maapaz","Mahabang Dahilig","Mahabang Parang","Mahayaw","Malibayo","Malitam","Maruclap","Mabacong","Pagkilatan","Paharang East","Paharang West","Pallocan East","Pallocan West","Pinamucan","Pinamucan East","Pinamucan West","Sampaga","San Agapito","San Agustin Kanluran","San Agustin Silangan","San Andres","San Antonio","San Isidro","San Jose Sico","San Miguel","San Pedro","Simlong","Sirang Lupa","Sorosoro Ibaba","Sorosoro Ilaya","Sorosoro Karsada","Tabangao","Talahib Pandayan","Talahib Payapa","Talumpok East","Talumpok West","Tulo","Wawa"],
  /* Laguna - Calamba */
  Calamba: ["Bagong Kalsada","Banadero","Banlic","Barandal","Batino","Bubuyan","Bucal","Bunggo","Burol","Camaligan","Canlubang","Halang","Hornalan","Kay-anlog","La Mesa","Laguerta","Lawa","Lecheria","Lingga","Looc","Mabato","Makiling","Mapagong","Masili","Maunong","Mayapa","Milagrosa","Paciano Rizal","Palingon","Palo-Alto","Pansol","Parian","Prinza","Punta","Puting Lupa","Real","Saimsim","Sampiruhan","San Cristobal","San Jose","San Juan","Sirang Lupa","Sucol","Turbina","Ulango","Uwisan"],
  /* Laguna - Los Baños */
  "Los Baños": ["Anos","Bagong Silang","Bambang","Batong Malake","Baybayin","Bayog","Lalakay","Maahas","Malinta","Mayondon","Putho-Tuntungin","San Antonio","Tadlak","Timugan"],
};

const ROLES_PRESET = ["Electrician","Plumber","Caregiver","Painter","Carpenter","HVAC Technician","Welder","Mason","Mover","General Handyman"];
const YEARS_EXP    = ["Less than 1 year","1–2 years","3–5 years","More than 5 years"];
const ID_TYPES     = ["Driver's License","National ID (PhilSys)","Passport"];

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */
interface UploadSlot { file: File | null; preview: string | null; }

interface FormData {
  firstName: string; middleInitial: string; lastName: string; birthday: string;
  email: string; phone: string;
  province: string; city: string; barangay: string; street: string;
  role: string; roleCustom: string; yearsExp: string;
  idType: string; idFront: UploadSlot; idBack: UploadSlot; selfie: UploadSlot;
  licenseImg: UploadSlot; certificateImg: UploadSlot;
}

type FieldErrors = Record<string, string>;

const EMPTY_SLOT: UploadSlot = { file: null, preview: null };

const EMPTY: FormData = {
  firstName: "", middleInitial: "", lastName: "", birthday: "",
  email: "", phone: "",
  province: "", city: "", barangay: "", street: "",
  role: "", roleCustom: "", yearsExp: "",
  idType: "", idFront: EMPTY_SLOT, idBack: EMPTY_SLOT, selfie: EMPTY_SLOT,
  licenseImg: EMPTY_SLOT, certificateImg: EMPTY_SLOT,
};

/* ================================================================== */
/*  Shared UI components                                                */
/* ================================================================== */
function BeavrLogo() {
  return (
    <span className={styles.logoInline}>
      <span className={styles.logoBold}>Beavr</span>
    </span>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className={styles.fieldLabel}>
      {label}{required && <span className={styles.required}> *</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className={styles.errorMsg}>{msg}</span>;
}

function Input({ label, value, onChange, placeholder, type = "text", required, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; error?: string;
}) {
  return (
    <div className={styles.fieldGroup}>
      <FieldLabel label={label} required={required} />
      <input
        type={type}
        className={`${styles.input} ${error ? styles.fieldError : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      <FieldError msg={error} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, required, error, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; required?: boolean; error?: string; disabled?: boolean;
}) {
  return (
    <div className={styles.fieldGroup}>
      <FieldLabel label={label} required={required} />
      <div className={`${styles.selectWrap} ${error ? styles.fieldError : ""} ${disabled ? styles.disabled : ""}`}>
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
        >
          <option value="">{placeholder ?? `Select ${label}`}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={15} strokeWidth={2} className={styles.selectChevron} />
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function UploadBox({ label, sublabel, slot, onChange, error }: {
  label: string; sublabel?: string; slot: UploadSlot;
  onChange: (s: UploadSlot) => void; error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = (f: File | null) => f && onChange({ file: f, preview: URL.createObjectURL(f) });
  const clear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(EMPTY_SLOT); };

  return (
    <div className={styles.fieldGroup}>
      {sublabel && <FieldLabel label={sublabel} />}
      <input ref={ref} type="file" accept="image/*" className={styles.fileHidden}
        onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      <div
        className={`${styles.uploadBox} ${error ? styles.uploadBoxError : ""} ${slot.preview ? styles.uploadBoxFilled : ""}`}
        onClick={() => ref.current?.click()}
        role="button" tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
      >
        {slot.preview ? (
          <>
            <img src={slot.preview} alt={label} className={styles.uploadPreview} />
            <button className={styles.uploadClear} onClick={clear} aria-label="Remove">
              <X size={11} strokeWidth={3} />
            </button>
          </>
        ) : (
          <div className={styles.uploadPlaceholder}>
            <CloudUpload size={22} strokeWidth={1.5} className={styles.uploadIcon} />
            <span className={styles.uploadHint}>{label}</span>
          </div>
        )}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

/* ================================================================== */
/*  Fake pin map                                                        */
/* ================================================================== */
function PinMap() {
  return (
    <div className={styles.pinMapWrap}>
      <div className={styles.pinMapBg} />
      <svg className={styles.pinMapRoads} viewBox="0 0 320 160" aria-hidden>
        <line x1="0" y1="80" x2="320" y2="95"  stroke="#4a5568" strokeWidth="5" />
        <line x1="160" y1="0" x2="168" y2="160" stroke="#4a5568" strokeWidth="4" />
        <line x1="0" y1="40" x2="320" y2="48"  stroke="#374151" strokeWidth="2" opacity="0.5" />
        <line x1="0" y1="130" x2="320" y2="138" stroke="#374151" strokeWidth="2" opacity="0.5" />
        <line x1="80"  y1="0" x2="82"  y2="160" stroke="#374151" strokeWidth="2" opacity="0.4" />
        <line x1="250" y1="0" x2="252" y2="160" stroke="#374151" strokeWidth="2" opacity="0.4" />
        <text x="172" y="56" fill="#6b7280" fontSize="8" fontFamily="sans-serif">Cavite State University</text>
        <text x="12"  y="130" fill="#6b7280" fontSize="8" fontFamily="sans-serif">Indang</text>
      </svg>
      <div className={styles.pinMarker}>
        <MapPin size={22} strokeWidth={2} className={styles.pinIcon} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Step 1 — Basic Information                                          */
/* ================================================================== */
function Step1({ data, errors, on }: { data: FormData; errors: FieldErrors; on: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Basic Information</h2>
      <Input label="First name"     value={data.firstName}     onChange={(v) => on("firstName", v)}     placeholder="ex. Kazel Arwen Jane"  required error={errors.firstName} />
      <Input label="Middle Initial" value={data.middleInitial} onChange={(v) => on("middleInitial", v)} placeholder="ex. L"                  required error={errors.middleInitial} />
      <Input label="Last name"      value={data.lastName}      onChange={(v) => on("lastName", v)}      placeholder="ex. Tuazon"             required error={errors.lastName} />
      <Input label="Birthday"       value={data.birthday}      onChange={(v) => on("birthday", v)}      placeholder="MM/DD/YYYY"             required error={errors.birthday} />

      <h2 className={`${styles.sectionTitle} ${styles.mt}`}>Contact Information</h2>
      <Input label="Email"        value={data.email} onChange={(v) => on("email", v)} placeholder="@example.com" type="email" required error={errors.email} />
      <Input label="Phone number" value={data.phone} onChange={(v) => on("phone", v)} placeholder="09----------"  type="tel"   required error={errors.phone} />
    </>
  );
}

/* ================================================================== */
/*  Step 2 — Address                                                    */
/* ================================================================== */
function Step2({ data, errors, on }: { data: FormData; errors: FieldErrors; on: (k: keyof FormData, v: string) => void }) {
  const cities    = data.province ? (CITIES[data.province]    ?? []) : [];
  const barangays = data.city     ? (BARANGAYS[data.city]     ?? []) : [];

  return (
    <>
      <h2 className={styles.sectionTitle}>Address</h2>

      {/* Region — locked */}
      <div className={styles.fieldGroup}>
        <FieldLabel label="Region" required />
        <div className={styles.lockedField}>
          <span>{REGION}</span>
        </div>
      </div>

      <SelectField label="Province" value={data.province}
        onChange={(v) => { on("province", v); on("city", ""); on("barangay", ""); }}
        options={PROVINCES} required error={errors.province} />

      <SelectField label="City / Municipality" value={data.city}
        onChange={(v) => { on("city", v); on("barangay", ""); }}
        options={cities} required error={errors.city} disabled={!data.province} />

      <SelectField label="Barangay" value={data.barangay}
        onChange={(v) => on("barangay", v)}
        options={barangays} required error={errors.barangay} disabled={!data.city} />

      <Input label="Street Name, Building, House No." value={data.street}
        onChange={(v) => on("street", v)} required error={errors.street} />

      <div className={styles.fieldGroup}>
        <FieldLabel label="Pin Location" />
        <PinMap />
      </div>
    </>
  );
}

/* ================================================================== */
/*  Step 3 — Occupation                                                 */
/* ================================================================== */
function Step3({ data, errors, on }: { data: FormData; errors: FieldErrors; on: (k: keyof FormData, v: string) => void }) {
  const isCustom = data.role === "__custom__";

  return (
    <>
      <h2 className={styles.sectionTitle}>Your occupation</h2>

      {/* Role — dropdown + custom input */}
      <div className={styles.fieldGroup}>
        <FieldLabel label="Role" required />
        <div className={`${styles.selectWrap} ${errors.role ? styles.fieldError : ""}`}>
          <select
            className={styles.select}
            value={data.role}
            onChange={(e) => { on("role", e.target.value); if (e.target.value !== "__custom__") on("roleCustom", ""); }}
            aria-label="Role"
          >
            <option value="">Select a role</option>
            {ROLES_PRESET.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__custom__">Other (type your role)</option>
          </select>
          <ChevronDown size={15} strokeWidth={2} className={styles.selectChevron} />
        </div>
        {isCustom && (
          <input
            type="text"
            className={`${styles.input} ${styles.inputMt} ${errors.roleCustom ? styles.fieldError : ""}`}
            value={data.roleCustom}
            onChange={(e) => on("roleCustom", e.target.value)}
            placeholder="Type your occupation"
            aria-label="Custom role"
          />
        )}
        <FieldError msg={errors.role || errors.roleCustom} />
      </div>

      <SelectField label="Years of experience" value={data.yearsExp}
        onChange={(v) => on("yearsExp", v)}
        options={YEARS_EXP} required error={errors.yearsExp} />
    </>
  );
}

/* ================================================================== */
/*  Step 4 — Verify Identity                                            */
/* ================================================================== */
function Step4({ data, errors, on, onSlot }: {
  data: FormData; errors: FieldErrors;
  on: (k: keyof FormData, v: string) => void;
  onSlot: (k: keyof FormData, s: UploadSlot) => void;
}) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Verify your identity</h2>

      <SelectField label="Type of ID" value={data.idType} onChange={(v) => on("idType", v)}
        options={ID_TYPES} required error={errors.idType} />

      <UploadBox label="Upload front of your ID" sublabel="Front of ID" slot={data.idFront}
        onChange={(s) => onSlot("idFront", s)} error={errors.idFront} />
      <UploadBox label="Upload back of your ID" sublabel="Back of ID" slot={data.idBack}
        onChange={(s) => onSlot("idBack", s)} error={errors.idBack} />
      <UploadBox label="Upload a selfie with your ID" sublabel="Selfie with ID" slot={data.selfie}
        onChange={(s) => onSlot("selfie", s)} error={errors.selfie} />

      {/* Additional credentials */}
      <h2 className={`${styles.sectionTitle} ${styles.mt}`}>Additional Information</h2>
      <p className={styles.sectionSub}>Optional — upload any supporting credentials.</p>

      <UploadBox label="Upload your license" sublabel="License" slot={data.licenseImg}
        onChange={(s) => onSlot("licenseImg", s)} />
      <UploadBox label="Upload your certificate" sublabel="Certificate" slot={data.certificateImg}
        onChange={(s) => onSlot("certificateImg", s)} />
    </>
  );
}

/* ================================================================== */
/*  Step 5 — Verify (loading → result)                                  */
/* ================================================================== */
function Step5Verify({ fullName, role }: { fullName: string; role: string }) {
  const [verifyState, setVerifyState] = useState<"loading" | "done">("loading");

  useEffect(() => {
    const t = setTimeout(() => setVerifyState("done"), 5000);
    return () => clearTimeout(t);
  }, []);

  if (verifyState === "loading") {
    return (
      <div className={styles.verifyScreen}>
        <div className={styles.verifySpinnerWrap}>
          <div className={styles.verifyRing1} />
          <div className={styles.verifyRing2} />
          <div className={styles.verifyRing3} />
          <div className={styles.verifyCenter}>
            <BadgeCheck size={28} strokeWidth={1.5} className={styles.verifyIcon} />
          </div>
        </div>
        <h2 className={styles.verifyTitle}>Verifying your details…</h2>
        <p className={styles.verifySub}>This usually takes a few seconds. Please wait.</p>
        <div className={styles.verifyDots}>
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.verifyScreen}>
      {/* Same concentric-ring + check design as payment receipt */}
      <div className={styles.verifyDoneWrap}>
        <div className={styles.verifyDoneRing2} />
        <div className={styles.verifyDoneRing1} />
        <div className={styles.verifyDoneCenter}>
          <Check size={28} strokeWidth={2.5} className={styles.verifyDoneCheck} />
        </div>
      </div>
      <h2 className={styles.verifyTitle}>Verified!</h2>
      <p className={styles.verifySub}>Welcome to Beavr,</p>
      <div className={styles.verifyCard}>
        <span className={styles.verifyCardName}>{fullName || "Your Name"}</span>
        <div className={styles.verifyCardRole}>
          <BadgeCheck size={14} strokeWidth={2} className={styles.verifyCardRoleIcon} />
          <span>{role || "Specialist"}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function OnboardPage() {
  const router            = useRouter();
  const [step, setStep]   = useState(1);
  const [data, setData]   = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  const onChange = (k: keyof FormData, v: string) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  const onSlot = (k: keyof FormData, s: UploadSlot) => {
    setData((d) => ({ ...d, [k]: s }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (step === 1) {
      if (!data.firstName.trim())      e.firstName    = "Required";
      if (!data.middleInitial.trim())  e.middleInitial = "Required";
      if (!data.lastName.trim())       e.lastName     = "Required";
      if (!data.birthday.trim())       e.birthday     = "Required";
      if (!data.email.trim())          e.email        = "Required";
      else if (!/\S+@\S+\.\S+/.test(data.email)) e.email = "Enter a valid email";
      if (!data.phone.trim())          e.phone        = "Required";
    }
    if (step === 2) {
      if (!data.province)              e.province  = "Required";
      if (!data.city)                  e.city      = "Required";
      if (!data.barangay)              e.barangay  = "Required";
      if (!data.street.trim())         e.street    = "Required";
    }
    if (step === 3) {
      if (!data.role)                  e.role      = "Required";
      if (data.role === "__custom__" && !data.roleCustom.trim()) e.roleCustom = "Please type your role";
      if (!data.yearsExp)              e.yearsExp  = "Required";
    }
    if (step === 4) {
      if (!data.idType)                e.idType  = "Required";
      if (!data.idFront.file)          e.idFront = "Please upload the front of your ID";
      if (!data.idBack.file)           e.idBack  = "Please upload the back of your ID";
      if (!data.selfie.file)           e.selfie  = "Please upload a selfie with your ID";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => s + 1);
  };

  const handleGoHome = () => router.push("/");

  const progress    = (step / TOTAL_STEPS) * 100;
  const displayRole = data.role === "__custom__" ? data.roleCustom : data.role;
  const fullName    = [data.firstName, data.middleInitial ? `${data.middleInitial}.` : "", data.lastName].filter(Boolean).join(" ");
  const isVerifyStep = step === TOTAL_STEPS;

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          Sign in to <BeavrLogo />
        </h1>
        <div className={styles.progressTrack} aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Main scrollable content */}
      <main className={styles.main}>
        <div className={styles.stepContent}>
          {step === 1 && <Step1 data={data} errors={errors} on={onChange} />}
          {step === 2 && <Step2 data={data} errors={errors} on={onChange} />}
          {step === 3 && <Step3 data={data} errors={errors} on={onChange} />}
          {step === 4 && <Step4 data={data} errors={errors} on={onChange} onSlot={onSlot} />}
          {step === 5 && <Step5Verify fullName={fullName} role={displayRole} />}
        </div>
      </main>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        {step < 4 && (
          <button className={styles.nextBtn} onClick={handleNext}>Next</button>
        )}
        {step === 4 && (
          <button className={styles.nextBtn} onClick={handleNext}>Verify</button>
        )}
        {isVerifyStep && (
          <button className={`${styles.nextBtn} ${styles.nextBtnGhost}`} onClick={() => router.push("/specialist/dashboard")}>
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
}