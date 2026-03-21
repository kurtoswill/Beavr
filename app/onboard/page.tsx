"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CloudUpload,
  Check,
  X,
  BadgeCheck,
} from "lucide-react";
import styles from "./page.module.css";
import { FaceVerificationModal } from "./FaceVerificationModal";

const LeafletPinMap = dynamic(() => import("./LeafletMap").then((mod) => mod.LeafletPinMap), {
  ssr: false,
});

/* ================================================================== */
/*  Data                                                                */
/* ================================================================== */
const TOTAL_STEPS = 5; // Step 5 = Verify

/* ---- Region: CALABARZON only ---- */
const REGION = "CALABARZON (Region IV-A)";

interface PSGCItem { code: string; name: string; }

const PSGC_BASE = "https://psgc.gitlab.io/api";

const ROLES_PRESET = ["Electrician","Plumber","Caregiver","Painter","Carpenter","HVAC Technician","Welder","Mason","Mover","General Handyman"];
const YEARS_EXP = ["Less than 1 year","1–2 years","3–5 years","More than 5 years"];
const ID_TYPES = ["Driver's License","National ID (PhilSys)","Passport"];

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */
interface UploadSlot { file: File | null; preview: string | null; }

interface FormData {
  firstName: string; middleInitial: string; lastName: string; birthday: string;
  email: string; phone: string;
  region: string; regionCode: string; province: string; provinceCode: string; city: string; cityCode: string; barangay: string; barangayCode: string; street: string;
  latitude: string; longitude: string;
  role: string; roleCustom: string; yearsExp: string;
  idType: string; idFront: UploadSlot; idBack: UploadSlot; selfie: UploadSlot;
  licenseImg: UploadSlot; certificateImg: UploadSlot;
}

type FieldErrors = Record<string, string>;

const EMPTY_SLOT: UploadSlot = { file: null, preview: null };

const EMPTY: FormData = {
  firstName: "", middleInitial: "", lastName: "", birthday: "",
  email: "", phone: "",
  region: "", regionCode: "", province: "", provinceCode: "", city: "", cityCode: "", barangay: "", barangayCode: "", street: "",
  latitude: "", longitude: "",
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
  options: Array<string | { value: string; label: string }>; placeholder?: string; required?: boolean; error?: string; disabled?: boolean;
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
          {options.map((o) => {
            if (typeof o === "string") return <option key={o} value={o}>{o}</option>;
            return <option key={o.value} value={o.value}>{o.label}</option>;
          })}
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

function PinMap({ center, coords, onCoordsChange }: { center?: string; coords?: { lat: number; lon: number }; onCoordsChange: (lat: number, lon: number) => void }) {
  const fallback = { lat: 14.2819, lon: 120.9106 }; // Cavite southern Luzon
  const current = coords || fallback;
  const info = center || "Cavite State University";

  const bounds = `${current.lon - 0.02},${current.lat - 0.02},${current.lon + 0.02},${current.lat + 0.02}`;

  return (
    <div className={styles.pinMapWrap} style={{ minHeight: "240px" }}>
      {typeof window !== "undefined" ? (
        <LeafletPinMap current={current} onCoordsChange={onCoordsChange} />
      ) : (
        <>
          <iframe
            title="Current location map"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${current.lat}%2C${current.lon}`}
            style={{ border: 0, width: "100%", height: "180px" }}
            loading="lazy"
          />
          <div className={styles.pinMapLabel}>
            {info} • lat: {current.lat.toFixed(6)}, lon: {current.lon.toFixed(6)}
          </div>
        </>
      )}
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
      <Input label="Birthday"       value={data.birthday}      onChange={(v) => on("birthday", v)}      type="date" placeholder="YYYY-MM-DD"             required error={errors.birthday} />

      <h2 className={`${styles.sectionTitle} ${styles.mt}`}>Contact Information</h2>
      <Input label="Email"        value={data.email} onChange={(v) => on("email", v)} placeholder="@example.com" type="email" required error={errors.email} />
      <Input label="Phone number" value={data.phone} onChange={(v) => on("phone", v)} placeholder="09----------"  type="tel"   required error={errors.phone} />
    </>
  );
}

/* ================================================================== */
/*  Step 2 — Address                                                    */
/* ================================================================== */
function Step2({ data, errors, onField, onRegion, onProvince, onCity, onBarangay, regions, provinces, municipalities, barangays, mapLabel, mapCoords, onCoordsChange }: {
  data: FormData; errors: FieldErrors;
  onField: (k: keyof FormData, v: string) => void;
  onRegion: (code: string, name: string) => void;
  onProvince: (code: string, name: string) => void;
  onCity: (code: string, name: string) => void;
  onBarangay: (code: string, name: string) => void;
  regions: PSGCItem[];
  provinces: PSGCItem[];
  municipalities: PSGCItem[];
  barangays: PSGCItem[];
  mapLabel: string;
  mapCoords: { lat: number; lon: number } | null;
  onCoordsChange: (lat: number, lon: number) => void;
}) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Address</h2>

      {/* Region — locked */}
      <SelectField label="Region" value={data.regionCode}
        onChange={(value) => {
          const selected = regions.find((r: PSGCItem) => r.code === value);
          if (value && selected) onRegion(value, selected.name);
        }}
        options={regions.map((r: PSGCItem) => ({ value: r.code, label: r.name }))}
        placeholder="Select Region"
        required error={errors.region} />

      <SelectField label="Province" value={data.provinceCode}
        onChange={(value) => {
          const selected = provinces.find((p: PSGCItem) => p.code === value);
          onProvince(value, selected?.name ?? "");
        }}
        options={provinces.map((p: PSGCItem) => ({ value: p.code, label: p.name }))}
        required error={errors.province} />

      <SelectField label="City / Municipality" value={data.cityCode}
        onChange={(value) => {
          const selected = municipalities.find((m: PSGCItem) => m.code === value);
          onCity(value, selected?.name ?? "");
        }}
        options={municipalities.map((m: PSGCItem) => ({ value: m.code, label: m.name }))}
        required error={errors.city} disabled={!data.provinceCode} />

      <SelectField label="Barangay" value={data.barangayCode}
        onChange={(value) => {
          const selected = barangays.find((b: PSGCItem) => b.code === value);
          onBarangay(value, selected?.name ?? "");
        }}
        options={barangays.map((b: PSGCItem) => ({ value: b.code, label: b.name }))}
        required error={errors.barangay} disabled={!data.cityCode} />

      <Input label="Street Name, Building, House No." value={data.street}
        onChange={(v) => onField("street", v)} required error={errors.street} />

      <div className={styles.fieldGroup}>
        <FieldLabel label="Pin Location" />
        <PinMap center={mapLabel} coords={mapCoords || undefined} onCoordsChange={onCoordsChange} />
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
function Step4({ data, errors, on, onSlot, faceVerificationStatus, onFaceVerificationChange, onOpenFaceModal }: {
  data: FormData; errors: FieldErrors;
  on: (k: keyof FormData, v: string) => void;
  onSlot: (k: keyof FormData, s: UploadSlot) => void;
  faceVerificationStatus: "pending" | "success" | "failed";
  onFaceVerificationChange: (status: "pending" | "success" | "failed") => void;
  onOpenFaceModal: () => void;
}) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Verify your identity</h2>

      {/* Face Verification Status */}
      <div className={styles.fieldGroup}>
        <FieldLabel label="Face Verification" required />
        <div
          style={{
            padding: "1rem",
            borderRadius: "8px",
            border: faceVerificationStatus === "success" ? "2px solid #22c55e" : faceVerificationStatus === "failed" ? "2px solid #ef4444" : "2px solid #d1d5db",
            backgroundColor: faceVerificationStatus === "success" ? "#f0fdf4" : faceVerificationStatus === "failed" ? "#fef2f2" : "#f9fafb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {faceVerificationStatus === "success" && (
              <>
                <Check size={20} strokeWidth={2.5} style={{ color: "#22c55e" }} />
                <span style={{ color: "#16a34a", fontWeight: 500 }}>Face Verification Complete</span>
              </>
            )}
            {faceVerificationStatus === "failed" && (
              <>
                <X size={20} strokeWidth={2.5} style={{ color: "#ef4444" }} />
                <span style={{ color: "#dc2626", fontWeight: 500 }}>Face Verification Failed</span>
              </>
            )}
            {faceVerificationStatus === "pending" && (
              <>
                <BadgeCheck size={20} strokeWidth={1.5} style={{ color: "#9ca3af" }} />
                <span style={{ color: "#6b7280", fontWeight: 500 }}>Pending Face Verification</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenFaceModal()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: faceVerificationStatus === "success" ? "#dcfce7" : "#e5e7eb",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {faceVerificationStatus === "success" ? "Verify Again" : "Verify Face"}
          </button>
        </div>
      </div>
      <FieldError msg={errors.faceVerification} />

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
function Step5Verify({
  fullName,
  role,
  formData,
  faceVerificationStatus,
  onRetry,
}: {
  fullName: string;
  role: string;
  formData: FormData;
  faceVerificationStatus: "pending" | "success" | "failed";
  onRetry: () => void;
}) {
  const [verifyState, setVerifyState] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // STOP GATE: Check face verification status
    if (faceVerificationStatus !== "success") {
      setVerifyState("error");
      setErrorMsg("Face verification must be completed before submission");
      return;
    }

    const submitOnboarding = async () => {
      try {
        // STEP 1: Upload files to /api/upload endpoint
        const uploadFile = async (file: File | null, filename: string): Promise<string | null> => {
          if (!file) return null;
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bucket', 'worker-docs');

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to upload ${filename}: ${errorData.error}`);
          }

          const data = await response.json();
          return data.url;
        };

        const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
          uploadFile(formData.idFront.file, 'ID Front'),
          uploadFile(formData.idBack.file, 'ID Back'),
          uploadFile(formData.selfie.file, 'Selfie'),
        ]);

        if (!idFrontUrl || !idBackUrl || !selfieUrl) {
          throw new Error('Failed to upload required documents');
        }

        // STEP 2: Call onboard/verify with file URLs
        const payload = {
          firstName: formData.firstName,
          middleInitial: formData.middleInitial,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          province: formData.province,
          municipality: formData.city,
          barangay: formData.barangay,
          street_address: formData.street,
          latitude: formData.latitude,
          longitude: formData.longitude,
          role: formData.role === "__custom__" ? formData.roleCustom : formData.role,
          yearsExp: formData.yearsExp,
          idType: formData.idType,
          idFrontUrl,
          idBackUrl,
          selfieUrl,
          faceVerificationStatus,
        };

        const response = await fetch("/api/onboard/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log('Full error data:', errorData);
          throw new Error(
            errorData.details ? `${errorData.error} - Details: ${errorData.details.join(', ')}` : errorData.error || `Verification failed with status ${response.status}`
          );
        }

        // Simulate completion delay for UX
        setTimeout(() => setVerifyState("done"), 2000);
      } catch (error) {
        console.error("Verification error:", error);
        setErrorMsg(error instanceof Error ? error.message : "Verification failed");
        setVerifyState("error");
      }
    };

    const timer = setTimeout(submitOnboarding, 2000);
    return () => clearTimeout(timer);
  }, [faceVerificationStatus, formData]);

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

  if (verifyState === "error") {
    return (
      <div className={styles.verifyScreen}>
        <div className={styles.verifyDoneWrap}>
          <div className={styles.verifyDoneRing2} />
          <div className={styles.verifyDoneRing1} />
          <div className={styles.verifyDoneCenter}>
            <X size={28} strokeWidth={2.5} className={styles.verifyDoneCheck} style={{ color: "#ef4444" }} />
          </div>
        </div>
        <h2 className={styles.verifyTitle} style={{ color: "#ef4444" }}>Verification Failed</h2>
        <p className={styles.verifySub}>{errorMsg || "An error occurred during verification"}</p>
        <button
          className={`${styles.nextBtn}`}
          onClick={onRetry}
          style={{ marginTop: "2rem" }}
        >
          Try Again
        </button>
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
  const [faceVerificationStatus, setFaceVerificationStatus] = useState<"pending" | "success" | "failed">("pending");
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceModalAutoStart, setFaceModalAutoStart] = useState(false);

  const [regions, setRegions] = useState<PSGCItem[]>([]);
  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapLabel, setMapLabel] = useState<string>("");

  const fetchPSGCResource = async (level: string, code?: string): Promise<PSGCItem[]> => {
    const params = new URLSearchParams({ level });
    if (code) params.set("code", code);

    try {
      const res = await fetch(`/api/psgc?${params.toString()}`);
      if (!res.ok) throw new Error(`PSGC proxy error ${res.status}`);
      const raw = await res.json();
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.value)
          ? raw.value
          : [];

      return list.map((item: { code: string; name: string }) => ({ code: item.code, name: item.name }));
    } catch (err) {
      console.error("PSGC fetch failed:", err);
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      const list = await fetchPSGCResource("regions");
      setRegions(list);
      // default region if no choice yet
      if (list.length > 0 && !data.regionCode) {
        const calabarzon = list.find((r: PSGCItem) => r.name.toLowerCase().includes("calabarzon") || r.code === "040000000");
        if (calabarzon) {
          onRegionSelect(calabarzon.code, calabarzon.name);
          return;
        }
      }
    })();
  }, []);

  const updateCoordinates = (lat: number, lon: number) => {
    setMapCoords({ lat, lon });
    setData((d) => ({ ...d, latitude: lat.toString(), longitude: lon.toString() }));
  };

  useEffect(() => {
    const address = [data.street, data.barangay, data.city, data.province, data.region]
      .filter(Boolean)
      .join(", ");

    setMapLabel(address || "Cavite State University");

    if (!address) {
      setMapCoords(null);
      setData((d) => ({ ...d, latitude: "", longitude: "" }));
      return;
    }

    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    fetch(url, { signal: controller.signal, headers: { "Accept-Language": "en" } })
      .then((res) => res.json())
      .then((items) => {
        if (items && items[0] && items[0].lat && items[0].lon) {
          updateCoordinates(parseFloat(items[0].lat), parseFloat(items[0].lon));
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.warn("Geocoding failed", err);
      });

    return () => controller.abort();
  }, [data.street, data.barangay, data.city, data.province, data.region]);

  useEffect(() => {
    if (!data.regionCode) {
      setProvinces([]);
      setMunicipalities([]);
      setBarangays([]);
      return;
    }

    (async () => {
      const list = await fetchPSGCResource("provinces", data.regionCode);
      setProvinces(list);
      setMunicipalities([]);
      setBarangays([]);
    })();
  }, [data.regionCode]);

  useEffect(() => {
    if (!data.provinceCode) {
      setMunicipalities([]);
      setBarangays([]);
      return;
    }

    (async () => {
      const list = await fetchPSGCResource("cities-municipalities", data.provinceCode);
      setMunicipalities(list);
      setBarangays([]);
    })();
  }, [data.provinceCode]);

  useEffect(() => {
    if (!data.cityCode) {
      setBarangays([]);
      return;
    }

    (async () => {
      const list = await fetchPSGCResource("barangays", data.cityCode);
      setBarangays(list);
    })();
  }, [data.cityCode]);

  const onChange = (k: keyof FormData, v: string) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  const onSlot = (k: keyof FormData, s: UploadSlot) => {
    setData((d) => ({ ...d, [k]: s }));
    setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };

  const onRetryVerification = () => {
    setStep(4);
  };

  const closeFaceModal = () => {
    setIsFaceModalOpen(false);
    setFaceModalAutoStart(false);
  };

  const onRegionSelect = (code: string, name: string) => {
    setData((d) => ({
      ...d,
      regionCode: code,
      region: name,
      provinceCode: "",
      province: "",
      cityCode: "",
      city: "",
      barangayCode: "",
      barangay: "",
    }));
    setErrors((e) => { const n = { ...e }; delete n.region; delete n.province; delete n.city; delete n.barangay; return n; });
  };

  const onProvinceSelect = (code: string, name: string) => {
    setData((d) => ({
      ...d,
      provinceCode: code,
      province: name,
      cityCode: "",
      city: "",
      barangayCode: "",
      barangay: "",
    }));
    setErrors((e) => { const n = { ...e }; delete n.province; delete n.city; delete n.barangay; return n; });
  };

  const onCitySelect = (code: string, name: string) => {
    setData((d) => ({
      ...d,
      cityCode: code,
      city: name,
      barangayCode: "",
      barangay: "",
    }));
    setErrors((e) => { const n = { ...e }; delete n.city; delete n.barangay; return n; });
  };

  const onBarangaySelect = (code: string, name: string) => {
    setData((d) => ({ ...d, barangayCode: code, barangay: name }));
    setErrors((e) => { const n = { ...e }; delete n.barangay; return n; });
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (step === 1) {
      if (!data.firstName.trim())      e.firstName    = "Required";
      if (!data.middleInitial.trim())  e.middleInitial = "Required";
      if (!data.lastName.trim())       e.lastName     = "Required";
      if (!data.birthday.trim())       e.birthday     = "Required";
      if (!data.email.trim())          e.email        = "Required";
      else if (!/\S+@\S+\.\S+/.test(data.email)) e.email = "Invalid email format";
      if (!data.phone.trim())          e.phone        = "Required";
    }
    if (step === 2) {
      if (!data.region)                e.region    = "Required";
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
      if (faceVerificationStatus !== "success") e.faceVerification = "Face verification must be completed";
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
          {step === 2 && (
            <Step2
              data={data}
              errors={errors}
              onField={onChange}
              onRegion={onRegionSelect}
              onProvince={onProvinceSelect}
              onCity={onCitySelect}
              onBarangay={onBarangaySelect}
              regions={regions}
              provinces={provinces}
              municipalities={municipalities}
              barangays={barangays}
              mapLabel={mapLabel}
              mapCoords={mapCoords}
              onCoordsChange={updateCoordinates}
            />
          )}
          {step === 3 && <Step3 data={data} errors={errors} on={onChange} />}
          {step === 4 && (
            <Step4
              data={data}
              errors={errors}
              on={onChange}
              onSlot={onSlot}
              faceVerificationStatus={faceVerificationStatus}
              onFaceVerificationChange={setFaceVerificationStatus}
              onOpenFaceModal={() => {
                setFaceVerificationStatus("pending");
                setFaceModalAutoStart(true);
                setIsFaceModalOpen(true);
              }}
            />
          )}
          {step === 5 && (
            <Step5Verify
              fullName={fullName}
              role={displayRole}
              formData={data}
              faceVerificationStatus={faceVerificationStatus}
              onRetry={onRetryVerification}
            />
          )}
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

      {/* Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        autoStart={faceModalAutoStart}
        onClose={closeFaceModal}
        onSuccess={() => {
          setFaceVerificationStatus("success");
          closeFaceModal();
        }}
        onError={(error) => {
          console.error("Face verification error:", error);
          setFaceVerificationStatus("failed");
        }}
      />
    </div>
  );
}