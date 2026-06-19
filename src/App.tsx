import { BrowserRouter, Routes, Route } from "react-router-dom";
import ContactPage from "./ContactPage";

const THEME = {
  bg: "#0B0D14",
  text: "#F1F3F9",
  textSecondary: "#9BA3B5",
  accent: "#7F77DD",
};

function Home() {
  return (
    <div
      style={{
        minHeight: "100svh",
        padding: "4rem 2rem",
        textAlign: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        background: THEME.bg,
        color: THEME.text,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, color: THEME.text }}>Welcome to CityBoy</h1>
      <p style={{ color: THEME.textSecondary, marginTop: 12 }}>
        Visit <a href="/support" style={{ color: THEME.accent }}>/support</a> to get in touch.
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div
      style={{
        minHeight: "100svh",
        padding: "4rem 2rem",
        textAlign: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        background: THEME.bg,
        color: THEME.text,
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 700, color: THEME.text }}>404</h1>
      <p style={{ color: THEME.textSecondary, marginTop: 8 }}>Page not found.</p>
      <a href="/" style={{ color: THEME.accent, marginTop: 16, display: "inline-block" }}>
        ← Back to Home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/support" element={<ContactPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
