"use client";
import { useState, useMemo } from "react";
import { PatientSelect } from "@/components/ui/PatientSelect";
import { DrivePhotoThumbnail } from "./TimelineMatrix";
import type { DocumentRecord, Patient, PhotoRecord } from "@/types";

export const DOCUMENT_CATEGORIES = [
  { key: 'Consultation / OPD Card', label: 'Consultation & OPD Cards', icon: '🩺', badgeBg: '#e0f2fe', badgeColor: '#0369a1' },
  { key: 'Blood Test', label: 'Blood Tests & Lab Reports', icon: '🩸', badgeBg: '#fee2e2', badgeColor: '#b91c1c' },
  { key: 'Biopsy', label: 'Biopsy & Pathology', icon: '🔬', badgeBg: '#ede9fe', badgeColor: '#6d28d9' },
  { key: 'Consent Form', label: 'Consent Forms & Legal', icon: '📝', badgeBg: '#dcfce7', badgeColor: '#15803d' },
  { key: 'Prescription', label: 'Prescriptions & Medication', icon: '💊', badgeBg: '#fef3c7', badgeColor: '#b45309' },
  { key: 'Other', label: 'Other Clinical Documents', icon: '📄', badgeBg: '#f1f5f9', badgeColor: '#475569' },
];

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface DocumentDossierProps {
  documents: DocumentRecord[];
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (id: string) => void;
  token?: string;
  onPreview: (doc: DocumentRecord) => void;
  onEdit: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  onUploadForCategory?: (category: string) => void;
}

export function DocumentDossier({
  documents,
  patients,
  selectedPatientId,
  onSelectPatient,
  token,
  onPreview,
  onEdit,
  onDelete,
  onUploadForCategory,
}: DocumentDossierProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"categorized" | "grid">("categorized");

  // Selected patient details
  const currentPatient = useMemo(() => {
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  // Documents filtered for the selected patient
  const patientDocs = useMemo(() => {
    if (!selectedPatientId) return [];
    return documents.filter((d) => d.PatientID === selectedPatientId);
  }, [documents, selectedPatientId]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: patientDocs.length };
    DOCUMENT_CATEGORIES.forEach((cat) => {
      counts[cat.key] = 0;
    });
    patientDocs.forEach((doc) => {
      const matched =
        DOCUMENT_CATEGORIES.find(
          (c) =>
            c.key.toLowerCase() === (doc.DocumentType || "").toLowerCase() ||
            c.label.toLowerCase().includes((doc.DocumentType || "").toLowerCase())
        )?.key || "Other";
      counts[matched] = (counts[matched] || 0) + 1;
    });
    return counts;
  }, [patientDocs]);

  // Filtered documents by search & category filter
  const filteredDocs = useMemo(() => {
    return patientDocs.filter((doc) => {
      const matchesCategory =
        activeCategory === "all" ||
        doc.DocumentType === activeCategory ||
        (activeCategory === "Other" &&
          !DOCUMENT_CATEGORIES.some((c) => c.key === doc.DocumentType));

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        doc.FileName.toLowerCase().includes(query) ||
        (doc.Notes && doc.Notes.toLowerCase().includes(query)) ||
        (doc.DocumentType && doc.DocumentType.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [patientDocs, activeCategory, searchQuery]);

  // Patients who have documents (for quick switching)
  const patientsWithDocs = useMemo(() => {
    const map = new Map<string, number>();
    documents.forEach((d) => {
      if (d.PatientID) {
        map.set(d.PatientID, (map.get(d.PatientID) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([pId, count]) => {
      const p = patients.find((x) => x.id === pId);
      return { id: pId, name: p?.fullName || pId, count };
    });
  }, [documents, patients]);

  return (
    <div className="document-dossier-container">
      {/* Patient Selection & Summary Header */}
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
            label="Select Patient for Document Dossier"
            placeholder="Search patient to view all clinical records..."
          />
        </div>

        {currentPatient && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
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
                padding: "8px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary-dark)" }}>
                {patientDocs.length}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                Documents
              </div>
            </div>
            {onUploadForCategory && (
              <button
                type="button"
                className="button"
                style={{ fontSize: "12.5px", padding: "8px 14px" }}
                onClick={() => onUploadForCategory("Consultation / OPD Card")}
              >
                + Upload Document
              </button>
            )}
          </div>
        )}
      </div>

      {/* No Patient Selected State */}
      {!selectedPatientId ? (
        <div className="panel empty" style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>📁</div>
          <h3 style={{ margin: "0 0 6px" }}>Select a patient to view their complete document dossier</h3>
          <p className="subtle" style={{ maxWidth: "520px", margin: "0 auto 20px" }}>
            All clinical paperwork, lab reports, consent forms, and prescriptions for a single patient are consolidated right here in one view.
          </p>

          {patientsWithDocs.length > 0 && (
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase" }}>
                Quick Select Patients With Uploaded Documents ({patientsWithDocs.length}):
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {patientsWithDocs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="button secondary"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => onSelectPatient(item.id)}
                  >
                    👤 {item.name} ({item.count} doc{item.count !== 1 ? "s" : ""})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Controls: Search, Filter Chips, and View Mode Toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {/* Filter Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <button
                type="button"
                className={`view-tab-btn ${activeCategory === "all" ? "active" : ""}`}
                style={{ fontSize: "12px", padding: "6px 12px" }}
                onClick={() => setActiveCategory("all")}
              >
                All Documents ({categoryCounts.all || 0})
              </button>
              {DOCUMENT_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.key] || 0;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`view-tab-btn ${activeCategory === cat.key ? "active" : ""}`}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    <span>{cat.icon}</span> {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search & Layout Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files or notes…"
                style={{
                  fontSize: "12.5px",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  minWidth: "200px",
                }}
              />
              <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "6px", padding: "2px" }}>
                <button
                  type="button"
                  onClick={() => setViewMode("categorized")}
                  style={{
                    border: 0,
                    background: viewMode === "categorized" ? "#fff" : "transparent",
                    color: viewMode === "categorized" ? "var(--primary-dark)" : "var(--muted)",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: viewMode === "categorized" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                  title="Grouped by clinical category"
                >
                  📁 Categories
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  style={{
                    border: 0,
                    background: viewMode === "grid" ? "#fff" : "transparent",
                    color: viewMode === "grid" ? "var(--primary-dark)" : "var(--muted)",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                  title="Show all files in a single flat grid"
                >
                  ▦ Flat Grid
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: Categorized Dossier */}
          {viewMode === "categorized" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {DOCUMENT_CATEGORIES.filter(
                (cat) => activeCategory === "all" || activeCategory === cat.key
              ).map((cat) => {
                const docsInCat = filteredDocs.filter(
                  (d) =>
                    d.DocumentType === cat.key ||
                    (cat.key === "Other" &&
                      !DOCUMENT_CATEGORIES.some((c) => c.key === d.DocumentType))
                );

                return (
                  <section
                    key={cat.key}
                    className="panel"
                    style={{ margin: 0, padding: "18px 20px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "14px",
                        borderBottom: "1px solid #f1f5f9",
                        paddingBottom: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                        <h3 style={{ margin: 0, fontSize: "15px", color: "var(--navy)" }}>
                          {cat.label}
                        </h3>
                        <span
                          className="badge"
                          style={{
                            background: cat.badgeBg,
                            color: cat.badgeColor,
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {docsInCat.length} file{docsInCat.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {onUploadForCategory && (
                        <button
                          type="button"
                          className="button secondary"
                          style={{ fontSize: "11.5px", padding: "4px 10px" }}
                          onClick={() => onUploadForCategory(cat.key)}
                        >
                          + Add {cat.icon}
                        </button>
                      )}
                    </div>

                    {docsInCat.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                          gap: "14px",
                        }}
                      >
                        {docsInCat.map((doc) => (
                          <DocumentCard
                            key={doc.DocumentID}
                            doc={doc}
                            token={token}
                            onPreview={onPreview}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "24px 16px",
                          textAlign: "center",
                          border: "1.5px dashed #e2e8f0",
                          borderRadius: "8px",
                          background: "#fafafa",
                          color: "var(--muted)",
                          fontSize: "12.5px",
                        }}
                      >
                        No {cat.label.toLowerCase()} attached for this patient yet.
                        {onUploadForCategory && (
                          <span
                            style={{
                              marginLeft: "8px",
                              color: "var(--primary)",
                              fontWeight: 600,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                            onClick={() => onUploadForCategory(cat.key)}
                          >
                            Upload one now →
                          </span>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: Flat Grid View */}
          {viewMode === "grid" && (
            <section className="panel" style={{ margin: 0, padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", color: "var(--navy)" }}>
                  All Documents ({filteredDocs.length})
                </h3>
                {onUploadForCategory && (
                  <button
                    type="button"
                    className="button"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => onUploadForCategory("Consultation / OPD Card")}
                  >
                    + Upload New Document
                  </button>
                )}
              </div>

              {filteredDocs.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {filteredDocs.map((doc) => (
                    <DocumentCard
                      key={doc.DocumentID}
                      doc={doc}
                      token={token}
                      onPreview={onPreview}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="panel empty" style={{ padding: "32px 16px", textAlign: "center" }}>
                  <p className="subtle">No documents match your search or filter.</p>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Individual Document Card ─── */
function DocumentCard({
  doc,
  token,
  onPreview,
  onEdit,
  onDelete,
}: {
  doc: DocumentRecord;
  token?: string;
  onPreview: (doc: DocumentRecord) => void;
  onEdit: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
}) {
  const isImage =
    (doc.MimeType && doc.MimeType.startsWith("image/")) ||
    /\.(jpe?g|png|webp|gif)$/i.test(doc.FileName);
  const isPdf =
    (doc.MimeType && doc.MimeType.includes("pdf")) ||
    doc.FileName.toLowerCase().endsWith(".pdf");

  const catMeta =
    DOCUMENT_CATEGORIES.find(
      (c) =>
        c.key.toLowerCase() === (doc.DocumentType || "").toLowerCase() ||
        c.label.toLowerCase().includes((doc.DocumentType || "").toLowerCase())
    ) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];

  const driveUrl = doc.DriveFileID
    ? `https://drive.google.com/file/d/${doc.DriveFileID}/view?usp=sharing`
    : "";

  return (
    <div
      className="matrix-slot-card"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "10px",
        background: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* Visual Header / Thumbnail Box */}
      <div
        style={{
          position: "relative",
          height: "140px",
          background: isPdf ? "#fff5f5" : "#f8fafc",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
        }}
        onClick={() => onPreview(doc)}
        title="Click to preview file"
      >
        {isImage && doc.DriveFileID ? (
          <DrivePhotoThumbnail
            photo={
              {
                PhotoID: doc.DocumentID,
                PatientID: doc.PatientID,
                Category: doc.DocumentType,
                FileName: doc.FileName,
                DriveFileID: doc.DriveFileID,
                MimeType: doc.MimeType,
                Size: doc.Size,
                Notes: doc.Notes,
                CreatedAt: doc.CreatedAt,
              } as PhotoRecord
            }
            token={token}
            alt={doc.FileName}
            size={400}
            objectFit="cover"
          />
        ) : isPdf ? (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "40px", marginBottom: "2px" }}>📄</div>
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "4px",
                letterSpacing: "0.5px",
              }}
            >
              PDF DOCUMENT
            </span>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "40px", marginBottom: "2px" }}>{catMeta.icon}</div>
            <span
              style={{
                background: "#64748b",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "4px",
              }}
            >
              FILE
            </span>
          </div>
        )}

        {/* Top Floating Category Badge */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 700,
            color: catMeta.badgeColor,
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>{catMeta.icon}</span>
          <span>{doc.DocumentType || "Document"}</span>
        </div>

        {/* Overlay Action Button on Hover */}
        <div className="matrix-slot-actions">
          <button
            type="button"
            className="btn-icon-slot"
            title="Preview file"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(doc);
            }}
          >
            👁️
          </button>
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon-slot"
              title="Open in Google Drive"
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: "none", color: "inherit", display: "grid", placeItems: "center" }}
            >
              🔗
            </a>
          )}
        </div>
      </div>

      {/* Card Content Info */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "13px",
            color: "var(--navy)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "4px",
            cursor: "pointer",
          }}
          onClick={() => onPreview(doc)}
          title={doc.FileName}
        >
          {doc.FileName}
        </div>

        {/* Date and Size */}
        <div style={{ fontSize: "11.5px", color: "var(--muted)", marginBottom: "8px" }}>
          <span>📅 {doc.CreatedAt ? String(doc.CreatedAt).slice(0, 16) : "—"}</span>
          {doc.Size ? <span style={{ marginLeft: "8px" }}>• {formatBytes(doc.Size)}</span> : null}
        </div>

        {/* Notes if any */}
        {doc.Notes ? (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #f1f5f9",
              borderRadius: "6px",
              padding: "6px 8px",
              fontSize: "11.5px",
              color: "var(--ink)",
              marginBottom: "10px",
              fontStyle: "italic",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={doc.Notes}
          >
            "{doc.Notes}"
          </div>
        ) : null}

        {/* Card Footer Actions */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "8px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            className="button secondary"
            style={{ fontSize: "11.5px", padding: "4px 10px" }}
            onClick={() => onPreview(doc)}
          >
            👁️ Preview
          </button>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn-icon"
              style={{ width: "28px", height: "28px", fontSize: "12px" }}
              title="Edit document category or notes"
              onClick={() => onEdit(doc)}
            >
              ✏️
            </button>
            <button
              type="button"
              className="btn-icon"
              style={{ width: "28px", height: "28px", fontSize: "12px", color: "var(--danger)" }}
              title="Delete document"
              onClick={() => onDelete(doc)}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
