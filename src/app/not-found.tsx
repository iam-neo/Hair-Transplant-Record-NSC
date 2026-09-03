import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Page Not Found</h2>
      <p style={{ color: "#666", margin: "16px 0" }}>The page you are looking for could not be found.</p>
      <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "underline" }}>
        Return to Dashboard
      </Link>
    </div>
  );
}
