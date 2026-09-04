"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
import type { Patient } from "@/types";

interface PatientSelectProps {
  value?: string;
  onChange: (patientId: string, patient?: Patient) => void;
  required?: boolean;
  label?: string;
  disabled?: boolean;
  initialPatients?: Patient[];
  placeholder?: string;
}

export function PatientSelect({
  value = "",
  onChange,
  required = false,
  label = "Select Patient",
  disabled = false,
  initialPatients,
  placeholder = "Search by patient name, phone, or ID...",
}: PatientSelectProps) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load patients if not already supplied
  useEffect(() => {
    if (initialPatients && initialPatients.length > 0) {
      setPatients(initialPatients);
      return;
    }
    const session = sessionStore.get();
    if (!session) return;
    setLoading(true);
    api<{ items: Patient[] }>("patients.list", { limit: 200 }, session.token)
      .then((res) => {
        setPatients(res.items || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load patients");
      })
      .finally(() => setLoading(false));
  }, [initialPatients]);

  const selectedPatient = useMemo(() => {
    if (!value) return null;
    return patients.find((p) => p.id === value) || null;
  }, [value, patients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) => {
      const matchName = p.fullName?.toLowerCase().includes(q);
      const matchId = p.id?.toLowerCase().includes(q);
      const matchContact = p.contactNumber?.includes(q);
      return matchName || matchId || matchContact;
    });
  }, [patients, search]);

  const handleSelect = (patient: Patient) => {
    onChange(patient.id, patient);
    setDropdownOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("", undefined);
    setSearch("");
    setDropdownOpen(true);
  };

  return (
    <div style={{ display: "grid", gap: "6px", width: "100%" }}>
      {label && (
        <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
          {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
        </span>
      )}

      {/* Hidden input for HTML form validation */}
      <input
        type="text"
        value={value}
        required={required}
        readOnly
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
        tabIndex={-1}
      />

      {/* When a patient is already selected */}
      {selectedPatient ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f0f9ff",
            border: "1.5px solid var(--primary)",
            borderRadius: "8px",
            padding: "10px 14px",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: "15px",
                flexShrink: 0,
              }}
            >
              {selectedPatient.fullName?.charAt(0).toUpperCase() || "P"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--navy)" }}>
                {selectedPatient.fullName}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                ID: <strong style={{ color: "var(--ink)" }}>{selectedPatient.id}</strong>
                {selectedPatient.contactNumber && ` · 📞 ${selectedPatient.contactNumber}`}
              </div>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="button secondary"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                height: "auto",
                whiteSpace: "nowrap",
              }}
            >
              Change
            </button>
          )}
        </div>
      ) : (
        /* Patient search & selection dropdown */
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              disabled={disabled}
              onChange={(e) => {
                setSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "11px 12px",
                background: "#fff",
              }}
            />
          </div>

          {error && <div style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px" }}>{error}</div>}

          {/* Dropdown List */}
          {dropdownOpen && !disabled && (
            <>
              {/* Overlay to close when clicking outside */}
              <div
                style={{ position: "fixed", inset: 0, zIndex: 19 }}
                onClick={() => setDropdownOpen(false)}
              />

              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                  maxHeight: "260px",
                  overflowY: "auto",
                  zIndex: 20,
                }}
              >
                {loading ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    Loading registered patients...
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    {search ? `No patient matching "${search}"` : "No registered patients found."}
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        background: "#f8fafc",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      Click a patient to select ({filtered.length})
                    </div>
                    {filtered.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#edf7fb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: "#e0f2fe",
                              color: "var(--primary-dark)",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            {p.fullName?.charAt(0).toUpperCase() || "P"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "13px" }}>
                              {p.fullName}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                              <span>ID: <strong>{p.id}</strong></span>
                              {p.contactNumber && <span> · 📞 {p.contactNumber}</span>}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: p.status === "Active" ? "#e7f7ef" : "#f1f5f9",
                            color: p.status === "Active" ? "var(--success)" : "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {p.status || "Active"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
