"use client";
import { useState, useMemo } from "react";
import { PatientSelect } from "@/components/ui/PatientSelect";
import type { PhotoRecord, Patient } from "@/types";

const STANDARD_ANGLES = [
  { key: "Front", label: "Front", icon: "🧑" },
  { key: "Top / Crown", label: "Top / Crown", icon: "⬆️" },
  { key: "Left", label: "Left", icon: "◀️" },
  { key: "Right", label: "Right", icon: "▶️" },
  { key: "Back / Donor", label: "Back / Donor", icon: "🔙" },
  { key: "Other", label: "Other", icon: "📷" },
];

const STANDARD_STAGES = [
  { key: "Before Transplant", label: "1. Before HT (Pre-Op)", icon: "📅" },
  { key: "Day of Transplant", label: "2. Day of Transplant (HT Day)", icon: "🏥" },
  { key: "After Transplant", label: "3. After Transplant (Post-Op)", icon: "⏳" },
  { key: "Follow-up 1 (1 Month)", label: "4. Follow-up 1 (1 Month)", icon: "🔄" },
  { key: "Follow-up 2 (3 Months)", label: "5. Follow-up 2 (3 Months)", icon: "🔄" },
  { key: "Follow-up 3 (6 Months)", label: "6. Follow-up 3 (6 Months)", icon: "🌟" },
  { key: "Follow-up 4 (1 Year)", label: "7. Follow-up 4 (1 Year)", icon: "🏆" },
];

interface TimelineMatrixProps {
  photos: PhotoRecord[];
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  token?: string;
  onPreview: (photo: PhotoRecord) => void;
  onEdit: (photo: PhotoRecord) => void;
  onUploadForSlot?: (stage: string, angle: string) => void;
}

export function TimelineMatrix({
  photos,
  patients,
  selectedPatientId,
  onSelectPatient,
  onPreview,
  onEdit,
  onUploadForSlot,
}: TimelineMatrixProps) {
  // Compare state: holds up to 2 photos for side-by-side comparison
  const [compareItems, setCompareItems] = useState<PhotoRecord[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100

  // Filter photos for selected patient
  const patientPhotos = useMemo(() => {
    if (!selectedPatientId) return [];
    return photos.filter((p) => p.PatientID === selectedPatientId);
  }, [photos, selectedPatientId]);

  // Selected patient details
  const currentPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Derive all stages present: standard stages + any custom stage present in the patient's photos
  const activeStages = useMemo(() => {
    const presentStages = new Set(patientPhotos.map((p) => p.SessionType || "Before Transplant"));
    const list = [...STANDARD_STAGES];

    // Check if patient has any custom stage not in standard list
    presentStages.forEach((st) => {
      if (!list.some((s) => s.key === st || s.label.toLowerCase().includes(st.toLowerCase()))) {
        list.push({ key: st, label: st, icon: "📁" });
      }
    });

    return list;
  }, [patientPhotos]);

  // Map photos into a 2D lookup: [stageKey][angleKey] -> PhotoRecord
  const matrix = useMemo(() => {
    const map: Record<string, Record<string, PhotoRecord>> = {};

    patientPhotos.forEach((ph) => {
      const stage = ph.SessionType || "Before Transplant";
      // Match to stage key
      const matchedStage =
        activeStages.find(
          (s) =>
            s.key === stage ||
            s.label.toLowerCase().includes(stage.toLowerCase()) ||
            stage.toLowerCase().includes(s.key.toLowerCase())
        )?.key || stage;

      if (!map[matchedStage]) map[matchedStage] = {};

      // Match angle
      const angle = ph.Category || "Other";
      const matchedAngle =
        STANDARD_ANGLES.find(
          (a) =>
            a.key === angle ||
            a.label.toLowerCase() === angle.toLowerCase() ||
            (a.key === "Top / Crown" && (angle === "Top" || angle === "Crown")) ||
            (a.key === "Back / Donor" && (angle === "Back" || angle === "Donor"))
        )?.key || "Other";

      // If multiple, keep latest or first
      if (!map[matchedStage][matchedAngle]) {
        map[matchedStage][matchedAngle] = ph;
      }
    });

    return map;
  }, [patientPhotos, activeStages]);

  // Compute capture date per stage from photos
  const stageDates = useMemo(() => {
    const dates: Record<string, string> = {};
    patientPhotos.forEach((ph) => {
      const stage = ph.SessionType || "Before Transplant";
      const matchedStage =
        activeStages.find(
          (s) =>
            s.key === stage ||
            s.label.toLowerCase().includes(stage.toLowerCase()) ||
            stage.toLowerCase().includes(s.key.toLowerCase())
        )?.key || stage;

      const d = ph.PhotoDate || (ph.CreatedAt ? String(ph.CreatedAt).slice(0, 10) : "");
      if (d && (!dates[matchedStage] || d > dates[matchedStage])) {
        dates[matchedStage] = d;
      }
    });
    return dates;
  }, [patientPhotos, activeStages]);

  // Toggle photo in compare list
  function toggleCompare(photo: PhotoRecord) {
    if (compareItems.some((x) => x.PhotoID === photo.PhotoID)) {
      setCompareItems((prev) => prev.filter((x) => x.PhotoID !== photo.PhotoID));
    } else {
      if (compareItems.length >= 2) {
        setCompareItems([compareItems[1], photo]);
      } else {
        const next = [...compareItems, photo];
        setCompareItems(next);
        if (next.length === 2) {
          setCompareModalOpen(true);
        }
      }
    }
  }

  return (
    <div className="timeline-matrix-container">
      {/* Patient Selection & Summary Bar */}
      <div
        className="panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          padding: "16px 20px",
          marginBottom: "16px",
        }}
      >
        <div style={{ flex: "1 1 340px", maxWidth: "480px" }}>
          <PatientSelect
            value={selectedPatientId}
            onChange={onSelectPatient}
            initialPatients={patients}
            label="Select Patient for Timeline Comparison"
            placeholder="Select a patient to view their timeline..."
          />
        </div>

        {currentPatient && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "15px" }}>
                {currentPatient.fullName}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                ID: {currentPatient.id} • Registered: {currentPatient.registrationDate}
              </div>
            </div>
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bdeafb",
                borderRadius: "10px",
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary-dark)" }}>
                {patientPhotos.length}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Photos
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedPatientId ? (
        <div className="panel empty" style={{ padding: "48px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📊</div>
          <h3>Select a patient above</h3>
          <p style={{ color: "var(--muted)", maxWidth: "440px", margin: "6px auto 0" }}>
            Select any registered patient to compare their hair transplant photos row-by-row across Before HT, Procedure Day, and Follow-ups.
          </p>
        </div>
      ) : (
        <>
          {/* Comparison Bar (if 1 or 2 photos selected) */}
          {compareItems.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                color: "#fff",
                borderRadius: "12px",
                padding: "12px 20px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>⚖️</span>
                <div>
                  <strong style={{ fontSize: "14px" }}>Compare Mode: </strong>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                    {compareItems.length === 1
                      ? "1 photo selected. Click 'Compare' on a second photo to view split slider."
                      : "2 photos selected for comparison!"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {compareItems.length === 2 && (
                  <button
                    type="button"
                    className="button"
                    style={{ padding: "8px 16px", fontSize: "13px" }}
                    onClick={() => setCompareModalOpen(true)}
                  >
                    Open Before/After Slider 🔍
                  </button>
                )}
                <button
                  type="button"
                  className="button secondary"
                  style={{ padding: "8px 14px", fontSize: "12px", background: "rgba(255,255,255,0.15)", color: "#fff", border: 0 }}
                  onClick={() => setCompareItems([])}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Matrix Board */}
          <div className="panel" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "#fafcfe" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--navy)" }}>
                    Hair Transplant Clinical Progression Matrix
                  </h3>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                    Each row represents a timeline milestone. Compare identical angles down each column.
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Tip: Click <strong>⚖️</strong> on two photos to compare them side-by-side.
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  minWidth: "980px",
                }}
              >
                {/* Column Headers: 6 Angles */}
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ width: "190px", padding: "12px 16px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", letterSpacing: ".05em" }}>
                      Timeline Stage
                    </th>
                    {STANDARD_ANGLES.map((angle) => (
                      <th
                        key={angle.key}
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          color: "var(--navy)",
                          fontWeight: 700,
                          letterSpacing: ".04em",
                        }}
                      >
                        <span style={{ marginRight: "4px", fontSize: "14px" }}>{angle.icon}</span>
                        {angle.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows: Each Timeline Stage */}
                <tbody>
                  {activeStages.map((stage) => {
                    const stagePhotos = matrix[stage.key] || {};
                    const hasAnyInStage = Object.keys(stagePhotos).length > 0;
                    const dateClicked = stageDates[stage.key];

                    return (
                      <tr
                        key={stage.key}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: hasAnyInStage ? "#fff" : "#fafcfe",
                        }}
                      >
                        {/* Stage Row Header */}
                        <td
                          style={{
                            padding: "14px 16px",
                            verticalAlign: "middle",
                            borderRight: "1px solid var(--border)",
                            background: "#fcfdfe",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "var(--ink)", fontSize: "13px" }}>
                            <span>{stage.icon}</span>
                            <span>{stage.label}</span>
                          </div>
                          {dateClicked && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--primary-dark)",
                                fontWeight: 600,
                                marginTop: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                background: "#e0f6ff",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              <span>📅</span> {dateClicked}
                            </div>
                          )}
                          <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "3px" }}>
                            {Object.keys(stagePhotos).length} / 6 angles
                          </div>
                        </td>

                        {/* Cells: 6 Angle slots for this stage */}
                        {STANDARD_ANGLES.map((angle) => {
                          const ph = stagePhotos[angle.key];
                          const isComparing = ph && compareItems.some((c) => c.PhotoID === ph.PhotoID);

                          return (
                            <td
                              key={angle.key}
                              style={{
                                padding: "8px",
                                textAlign: "center",
                                verticalAlign: "middle",
                                borderRight: "1px solid #f1f5f9",
                              }}
                            >
                              {ph ? (
                                <div
                                  className={`matrix-slot-card ${isComparing ? "is-comparing" : ""}`}
                                  style={{
                                    position: "relative",
                                    aspectRatio: "1",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    background: "#0f172a",
                                    boxShadow: isComparing
                                      ? "0 0 0 3px var(--primary)"
                                      : "0 2px 6px rgba(0,0,0,0.08)",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => onPreview(ph)}
                                  title={`${angle.label} • Clicked: ${ph.PhotoDate || "N/A"}`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={
                                      ph.DriveFileID
                                        ? `https://drive.google.com/thumbnail?id=${ph.DriveFileID}&sz=w400`
                                        : ""
                                    }
                                    alt={angle.label}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />

                                  {/* Overlay Date Badge */}
                                  {ph.PhotoDate && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "4px",
                                        left: "4px",
                                        background: "rgba(0,0,0,0.65)",
                                        color: "#fff",
                                        fontSize: "9px",
                                        fontWeight: 700,
                                        padding: "1px 5px",
                                        borderRadius: "4px",
                                        backdropFilter: "blur(4px)",
                                      }}
                                    >
                                      {ph.PhotoDate}
                                    </div>
                                  )}

                                  {/* Hover Action Bar */}
                                  <div
                                    className="matrix-slot-actions"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="btn-icon-slot"
                                      title="Preview full size"
                                      onClick={() => onPreview(ph)}
                                    >
                                      👁️
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon-slot"
                                      title="Compare with another photo"
                                      onClick={() => toggleCompare(ph)}
                                      style={{
                                        background: isComparing ? "var(--primary)" : "rgba(255,255,255,0.9)",
                                        color: isComparing ? "#fff" : "inherit",
                                      }}
                                    >
                                      ⚖️
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon-slot"
                                      title="Edit photo info"
                                      onClick={() => onEdit(ph)}
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    aspectRatio: "1",
                                    borderRadius: "8px",
                                    border: "1px dashed #cbd5e1",
                                    background: "#fafcfe",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "3px",
                                    color: "#94a3b8",
                                    fontSize: "11px",
                                    cursor: onUploadForSlot ? "pointer" : "default",
                                  }}
                                  onClick={() => onUploadForSlot && onUploadForSlot(stage.key, angle.key)}
                                  title={onUploadForSlot ? `Click to upload ${angle.label} for ${stage.label}` : "No photo"}
                                >
                                  <span style={{ fontSize: "16px", opacity: 0.6 }}>📷</span>
                                  <span style={{ fontSize: "9.5px", fontWeight: 600 }}>Empty</span>
                                  {onUploadForSlot && (
                                    <span style={{ fontSize: "9px", color: "var(--primary)", fontWeight: 700 }}>
                                      + Add
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Before / After Comparison Slider Modal */}
      {compareModalOpen && compareItems.length === 2 && (
        <div className="modal-backdrop" onClick={() => setCompareModalOpen(false)} style={{ zIndex: 1020 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(1000px, 96vw)", padding: "20px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "var(--navy)" }}>
                  ⚖️ Before & After Hair Transplant Comparison
                </h2>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                  Drag the slider left and right to inspect follicle density and regrowth side-by-side.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                style={{ background: "transparent", border: 0, fontSize: "20px", cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Stages / Dates Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div style={{ background: "#f0f9ff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bdeafb" }}>
                <span className="eyebrow">Left Side</span>
                <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "14px" }}>
                  {compareItems[0].SessionType || "Before HT"} • {compareItems[0].Category}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Date: <strong>{compareItems[0].PhotoDate || compareItems[0].CreatedAt.slice(0, 10)}</strong>
                </div>
              </div>
              <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <span className="eyebrow" style={{ color: "var(--success)" }}>Right Side</span>
                <div style={{ fontWeight: 700, color: "var(--success)", fontSize: "14px" }}>
                  {compareItems[1].SessionType || "After HT"} • {compareItems[1].Category}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Date: <strong>{compareItems[1].PhotoDate || compareItems[1].CreatedAt.slice(0, 10)}</strong>
                </div>
              </div>
            </div>

            {/* Interactive Split Slider Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "520px",
                background: "#000",
                borderRadius: "10px",
                overflow: "hidden",
                userSelect: "none",
              }}
            >
              {/* Photo 2 (Right / After) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  compareItems[1].DriveFileID
                    ? `https://drive.google.com/thumbnail?id=${compareItems[1].DriveFileID}&sz=w1600`
                    : ""
                }
                alt="After"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />

              {/* Photo 1 (Left / Before) with clip-path */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    compareItems[0].DriveFileID
                      ? `https://drive.google.com/thumbnail?id=${compareItems[0].DriveFileID}&sz=w1600`
                      : ""
                  }
                  alt="Before"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>

              {/* Slider Divider Line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  width: "3px",
                  background: "#fff",
                  boxShadow: "0 0 10px rgba(0,0,0,0.8)",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--navy)",
                  }}
                >
                  ◀▶
                </div>
              </div>

              {/* Transparent Slider Input Control */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "ew-resize",
                  margin: 0,
                  zIndex: 10,
                }}
              />
            </div>

            {/* Bottom Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Drag slider across image or use slider bar: <strong>{sliderPos}%</strong>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSliderPos(50)}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  Center (50%)
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => setCompareModalOpen(false)}
                  style={{ fontSize: "12px", padding: "6px 16px" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
