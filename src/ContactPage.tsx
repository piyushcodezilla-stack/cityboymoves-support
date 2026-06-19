import { useEffect, useState, type CSSProperties, type FormEvent, type ChangeEvent, type ReactNode } from "react";
import cityBoyLogo from "./assets/city-boy-logo-white.png";

const THEME = {
  bg: "#0B0D14",
  bgElevated: "#13161F",
  bgCard: "#1A1E2B",
  border: "#2A3040",
  borderSubtle: "#222836",
  text: "#F1F3F9",
  textSecondary: "#9BA3B5",
  textMuted: "#6B7288",
  accent: "#7F77DD",
  accentBright: "#9B94E8",
  accentDim: "#534AB7",
  accentGlow: "rgba(127, 119, 221, 0.15)",
  error: "#F87171",
  errorBg: "rgba(248, 113, 113, 0.1)",
  errorBorder: "rgba(248, 113, 113, 0.35)",
  warning: "#FBBF24",
  warningBg: "rgba(251, 191, 36, 0.1)",
  warningBorder: "rgba(251, 191, 36, 0.35)",
  success: "#4ADE80",
  successBg: "rgba(74, 222, 128, 0.1)",
};

type FormState = { name: string; email: string; message: string };
type FieldErrors = Partial<Record<keyof FormState, string>>;
type SubmitStatus = "idle" | "loading" | "success" | "error" | "rate_limited";

interface ApiResponse {
  status: string;
  message: string;
  data: unknown;
}

function parseApiResponse(body: unknown): ApiResponse | null {
  if (
    body &&
    typeof body === "object" &&
    typeof (body as ApiResponse).status === "string" &&
    typeof (body as ApiResponse).message === "string" &&
    "data" in body
  ) {
    return body as ApiResponse;
  }
  return null;
}

function getRetrySeconds(res: Response, data: unknown): number {
  const retryHeader = res.headers.get("Retry-After");
  if (retryHeader) {
    const parsed = parseInt(retryHeader, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (data && typeof data === "object" && data !== null) {
    const retryAfter = (data as Record<string, unknown>).retryAfter;
    if (typeof retryAfter === "number" && retryAfter > 0) return retryAfter;
    if (typeof retryAfter === "string") {
      const parsed = parseInt(retryAfter, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return 60;
}

const CONTACT_ITEMS: {
  label: string;
  lines: string[];
  href?: string;
  icon: ReactNode;
}[] = [
  {
    label: "Email",
    lines: ["info@cityboymoves.com"],
    href: "mailto:info@cityboymoves.com",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="M22 6l-10 7L2 6" />
      </svg>
    ),
  },
  {
    label: "Website",
    lines: ["cityboymoves.com"],
    href: "https://cityboymoves.com",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
] ;

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "Please enter your name.";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!form.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!form.message.trim()) {
    errors.message = "Please enter a message.";
  } else if (form.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }

  return errors;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "success") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setStatus("idle");
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [status]);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
  }

  function startCountdown(seconds: number) {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setStatus("idle");
          setRetryAfter(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStatus("loading");
    setErrorMsg("");
    setResponseMessage("");
    setRetryAfter(null);

    try {
      const res = await fetch("https://api.cityboymoves.com/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });

      const body = await res.json().catch(() => null);
      const api = parseApiResponse(body);

      if (!api) {
        throw new Error(`Server error (${res.status}). Please try again later.`);
      }

      if (res.status === 429) {
        const seconds = getRetrySeconds(res, api.data);
        setResponseMessage(api.message);
        setRetryAfter(seconds);
        setStatus("rate_limited");
        startCountdown(seconds);
        return;
      }

      if (api.status === "success") {
        setResponseMessage(api.message);
        setForm({ name: "", email: "", message: "" });
        setStatus("success");
        return;
      }

      throw new Error(api.message || `Server error (${res.status}). Please try again later.`);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setErrorMsg("Network error — please check your connection and try again.");
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const isRateLimited = status === "rate_limited";

  const inputStyle = (hasError: boolean): CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: `1.5px solid ${hasError ? THEME.errorBorder : THEME.border}`,
    fontSize: 15,
    color: THEME.text,
    outline: "none",
    boxSizing: "border-box",
    background: isLoading || isRateLimited ? THEME.bgElevated : THEME.bgCard,
    transition: "border-color 0.15s, box-shadow 0.15s",
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: THEME.bg, color: THEME.text, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Header — logo only */}
      <header
        className="px-6 py-5"
        style={{ background: THEME.bgElevated, borderBottom: `1px solid ${THEME.borderSubtle}` }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <img
            src={cityBoyLogo}
            alt="CityBoy"
            style={{ height: 36, width: "auto", display: "block" }}
          />
        </div>
      </header>

      {/* Hero */}
      <div
        className="py-12 px-6 text-center"
        style={{ background: THEME.bgElevated, borderBottom: `1px solid ${THEME.borderSubtle}` }}
      >
        <p
          style={{
            color: THEME.accentBright,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Get in Touch
        </p>
        <h1
          style={{
            color: THEME.text,
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          We&apos;d love to hear from you
        </h1>
        <p
          style={{
            color: THEME.textSecondary,
            fontSize: 16,
            marginTop: 12,
            maxWidth: 520,
            margin: "12px auto 0",
            lineHeight: 1.6,
          }}
        >
          Whether it&apos;s an inquiry, a quick question, or just a hello — our team typically
          responds within one or two business days.
        </p>
      </div>

      {/* Main */}
      <main className="flex-1 px-6 py-14" style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 48,
            alignItems: "start",
          }}
        >
          {/* Contact info */}
          <div>
            <h2 style={{ color: THEME.text, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Contact Information
            </h2>
            <p
              style={{
                color: THEME.textSecondary,
                fontSize: 15,
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              Reach us through any of the channels below.
            </p>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              {CONTACT_ITEMS.map(({ label, lines, href, icon }) => (
                <li key={label} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: THEME.accentGlow,
                      border: `1px solid ${THEME.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: THEME.accentBright,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <div style={{ minWidth: 0, paddingTop: 2 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: THEME.accentBright,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        margin: "0 0 6px",
                      }}
                    >
                      {label}
                    </p>
                    {lines.map((line) =>
                      href ? (
                        <a
                          key={line}
                          href={href}
                          style={{
                            display: "block",
                            fontSize: 15,
                            color: THEME.text,
                            textDecoration: "none",
                            lineHeight: 1.6,
                            wordBreak: "break-word",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = THEME.accentBright)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = THEME.text)}
                        >
                          {line}
                        </a>
                      ) : (
                        <p
                          key={line}
                          style={{
                            fontSize: 15,
                            color: THEME.textSecondary,
                            margin: 0,
                            lineHeight: 1.6,
                          }}
                        >
                          {line}
                        </p>
                      ),
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Form */}
          <div
            style={{
              background: THEME.bgCard,
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              padding: "36px 32px",
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.35)`,
            }}
          >
            <h2 style={{ color: THEME.text, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              Send Us a Message
            </h2>
            <p style={{ color: THEME.textMuted, fontSize: 14, marginBottom: 28 }}>
              We read every message and reply personally.
            </p>

            {status === "error" && (
              <div
                role="alert"
                style={{
                  background: THEME.errorBg,
                  border: `1px solid ${THEME.errorBorder}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 24,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: THEME.error, fontSize: 18, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
                  ⚠
                </span>
                <div>
                  <p style={{ color: THEME.error, fontWeight: 600, margin: "0 0 4px", fontSize: 14 }}>
                    Couldn&apos;t send your message
                  </p>
                  <p style={{ color: THEME.textSecondary, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    {errorMsg}
                  </p>
                </div>
              </div>
            )}

            {status === "rate_limited" && (
              <div
                role="alert"
                style={{
                  background: THEME.warningBg,
                  border: `1px solid ${THEME.warningBorder}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 24,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ color: THEME.warning, fontSize: 18, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
                  ⏱
                </span>
                <div>
                  <p style={{ color: THEME.warning, fontWeight: 600, margin: "0 0 4px", fontSize: 14 }}>
                    Too many requests
                  </p>
                  <p style={{ color: THEME.textSecondary, fontSize: 13, margin: "0 0 6px", lineHeight: 1.5 }}>
                    {responseMessage || "We've received a lot of messages recently."}
                  </p>
                  {(countdown ?? retryAfter) !== null && (
                    <p style={{ color: THEME.textMuted, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Retry in <strong style={{ color: THEME.text }}>{countdown ?? retryAfter}s</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {(["name", "email", "message"] as const).map((field) => {
                const labels = { name: "Full name", email: "Email address", message: "Message" };
                const placeholders = {
                  name: "Full Name",
                  email: "Email",
                  message: "Ask your queries here.",
                };
                const isTextarea = field === "message";

                return (
                  <div key={field} style={{ marginBottom: isTextarea ? 28 : 20 }}>
                    <label
                      htmlFor={field}
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: THEME.textSecondary,
                        marginBottom: 6,
                      }}
                    >
                      {labels[field]} <span style={{ color: THEME.error }}>*</span>
                    </label>
                    {isTextarea ? (
                      <textarea
                        id={field}
                        name={field}
                        value={form[field]}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder={placeholders[field]}
                        disabled={isLoading || isRateLimited}
                        aria-invalid={!!fieldErrors[field]}
                        aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
                        style={{
                          ...inputStyle(!!fieldErrors[field]),
                          resize: "vertical",
                          fontFamily: "inherit",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = THEME.accent;
                          e.target.style.boxShadow = `0 0 0 3px ${THEME.accentGlow}`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = fieldErrors[field] ? THEME.errorBorder : THEME.border;
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    ) : (
                      <input
                        id={field}
                        type={field === "email" ? "email" : "text"}
                        name={field}
                        value={form[field]}
                        onChange={handleChange}
                        required
                        placeholder={placeholders[field]}
                        disabled={isLoading || isRateLimited}
                        aria-invalid={!!fieldErrors[field]}
                        aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
                        style={inputStyle(!!fieldErrors[field])}
                        onFocus={(e) => {
                          e.target.style.borderColor = THEME.accent;
                          e.target.style.boxShadow = `0 0 0 3px ${THEME.accentGlow}`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = fieldErrors[field] ? THEME.errorBorder : THEME.border;
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    )}
                    {fieldErrors[field] && (
                      <p
                        id={`${field}-error`}
                        role="alert"
                        style={{ color: THEME.error, fontSize: 12, margin: "6px 0 0", lineHeight: 1.4 }}
                      >
                        {fieldErrors[field]}
                      </p>
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={isLoading || isRateLimited}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: isLoading || isRateLimited ? THEME.border : THEME.accentDim,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isLoading || isRateLimited ? "not-allowed" : "pointer",
                  letterSpacing: "0.2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && !isRateLimited) e.currentTarget.style.background = THEME.accent;
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && !isRateLimited) e.currentTarget.style.background = THEME.accentDim;
                }}
              >
                {isLoading ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="animate-spin"
                      aria-hidden="true"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Sending…
                  </>
                ) : isRateLimited ? (
                  `Retry in ${countdown ?? retryAfter}s`
                ) : (
                  <>
                    Send message
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-6 text-center"
        style={{ borderTop: `1px solid ${THEME.borderSubtle}`, background: THEME.bgElevated }}
      >
        <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>
          © 2026 CityboyConnect ·{" "}
          <a
            href="/support"
            style={{ color: THEME.textSecondary, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = THEME.accentBright)}
            onMouseLeave={(e) => (e.currentTarget.style.color = THEME.textSecondary)}
          >
            Support
          </a>
        </p>
      </footer>

      {/* Success modal */}
      {status === "success" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setStatus("idle")}
        >
          <div
            style={{
              background: THEME.bgCard,
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              padding: "32px 28px",
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: THEME.successBg,
                border: `1px solid rgba(74, 222, 128, 0.35)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: THEME.success,
                fontSize: 28,
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <h3 id="success-title" style={{ color: THEME.text, fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>
              Message sent!
            </h3>
            <p style={{ color: THEME.textSecondary, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
              {responseMessage || "Thanks for reaching out. Someone from our team will be in touch within 1 business day."}
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              style={{
                width: "100%",
                padding: "11px 20px",
                borderRadius: 10,
                border: "none",
                background: THEME.accentDim,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.background = THEME.accentDim)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
