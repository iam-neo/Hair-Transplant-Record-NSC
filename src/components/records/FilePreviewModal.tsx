"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import type { PhotoRecord, DocumentRecord } from "@/types";

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  item: PhotoRecord | DocumentRecord | null;
  type: "photo" | "document";
  token?: string;
  patientName?: string;
  onEditRequest?: (item: PhotoRecord | DocumentRecord) => void;
}

export function FilePreviewModal({
  open,
  onClose,
  item,
  type,
  token,
  patientName,
  onEditRequest,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ base64?: string; mimeType?: string; url?: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!open || !item) {
      setPreviewData(null);
      setZoom(1);
      setRotation(0);
      return;
    }

    let isMounted = true;
    setZoom(1);
    setRotation(0);

    async function loadPreview() {
      if (!token || !item) return;
      setLoading(true);
      try {
        const isPhoto = type === "photo";
        const id = isPhoto ? (item as PhotoRecord).PhotoID : (item as DocumentRecord).DocumentID;
        const res = await api<{ base64?: string; mimeType?: string; url?: string }>(
          isPhoto ? "photos.get" : "documents.get",
          isPhoto ? { photoId: id } : { documentId: id },
          token
        );
        if (isMounted) {
          setPreviewData(res);
        }
      } catch {
        if (isMounted) {
          // Fallback to Drive URL if base64 fetch fails
          setPreviewData({
            url: item.DriveFileID ? `https://drive.google.com/file/d/${item.DriveFileID}/view` : undefined,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [open, item, type, token]);

  if (!open || !item) return null;

  const isPhoto = type === "photo";
  const photo = isPhoto ? (item as PhotoRecord) : null;
  const doc = !isPhoto ? (item as DocumentRecord) : null;

  const driveUrl = item.DriveFileID
    ? `https://drive.google.com/file/d/${item.DriveFileID}/view?usp=sharing`
    : previewData?.url;

  const imageSrc = previewData?.base64
    ? `data:${previewData.mimeType || "image/jpeg"};base64,${previewData.base64}`
    : item.DriveFileID
    ? `https://drive.google.com/thumbnail?id=${item.DriveFileID}&sz=w1600`
    : "";

  const isPdf = previewData?.mimeType?.includes("pdf") || item.FileName.toLowerCase().endsWith(".pdf");

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="preview-lightbox-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 96vw)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            background: "#fafcfe",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span style={{ fontSize: "20px" }}>{isPhoto ? "📷" : "📄"}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--navy)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{item.FileName}</span>
                {photo?.SessionType && (
                  <span className="badge" style={{ fontSize: "11px" }}>
                    {photo.SessionType}
                  </span>
                )}
                <span className="badge-muted" style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px" }}>
                  {photo?.Category || doc?.DocumentType}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                Patient: <strong>{item.PatientID}</strong> {patientName && `(${patientName})`}
                {photo?.PhotoDate && ` • Clicked: ${photo.PhotoDate}`}
              </div>
            </div>
          </div>

          {/* Action buttons & Close */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onEditRequest && (
              <button
                type="button"
                className="button secondary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => {
                  onClose();
                  onEditRequest(item);
                }}
              >
                ✏️ Edit info
              </button>
            )}
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
                style={{ padding: "6px 12px", fontSize: "12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Open in Drive ↗
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: 0,
                fontSize: "22px",
                lineHeight: 1,
                cursor: "pointer",
                padding: "4px 8px",
                color: "var(--muted)",
              }}
              title="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            minHeight: "480px",
            maxHeight: "calc(92vh - 130px)",
            overflow: "hidden",
          }}
          className="preview-lightbox-body"
        >
          {/* Main Visual Display */}
          <div
            style={{
              background: "#0f172a",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {loading ? (
              <div style={{ color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "32px", animation: "spin 1s linear infinite" }}>⏳</span>
                <span>Loading preview...</span>
              </div>
            ) : isPhoto || previewData?.mimeType?.startsWith("image/") ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "auto",
                  padding: "16px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={item.FileName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                    borderRadius: "6px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  }}
                />
              </div>
            ) : isPdf && previewData?.base64 ? (
              <iframe
                src={`data:application/pdf;base64,${previewData.base64}`}
                title={item.FileName}
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : (
              <div style={{ color: "#fff", textAlign: "center", padding: "32px" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📑</div>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>{item.FileName}</div>
                <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "6px" }}>
                  Direct in-browser preview not supported for this file format.
                </p>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="button"
                    style={{ marginTop: "16px", display: "inline-block", textDecoration: "none" }}
                  >
                    View Document in Google Drive ↗
                  </a>
                )}
              </div>
            )}

            {/* Zoom / Rotate Controls for Photos */}
            {isPhoto && !loading && (
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(6px)",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  color: "#fff",
                }}
              >
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  style={{ background: "transparent", border: 0, color: "#fff", fontSize: "16px", cursor: "pointer", padding: "0 6px" }}
                  title="Zoom Out"
                >
                  🔍−
                </button>
                <span style={{ fontSize: "11px", fontWeight: 600, minWidth: "36px", textAlign: "center" }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  style={{ background: "transparent", border: 0, color: "#fff", fontSize: "16px", cursor: "pointer", padding: "0 6px" }}
                  title="Zoom In"
                >
                  🔍+
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  style={{ background: "transparent", border: 0, color: "#fff", fontSize: "14px", cursor: "pointer", padding: "0 6px" }}
                  title="Rotate"
                >
                  🔄
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: "11px", cursor: "pointer", padding: "0 4px" }}
                  title="Reset"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Right Details Panel */}
          <div
            style={{
              padding: "20px",
              background: "#fff",
              borderLeft: "1px solid var(--border)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>
                Patient Details
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
                {patientName || "Patient"}
              </div>
              <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
                ID: {item.PatientID}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>
                {isPhoto ? "Photo Timeline & Angle" : "Document Category"}
              </div>
              {photo?.SessionType && (
                <div style={{ marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Timeline Stage: </span>
                  <strong style={{ color: "var(--navy)" }}>{photo.SessionType}</strong>
                </div>
              )}
              <div>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {isPhoto ? "Anatomical Angle:" : "Type:"}{" "}
                </span>
                <strong style={{ color: "var(--primary-dark)" }}>
                  {photo?.Category || doc?.DocumentType}
                </strong>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <div className="eyebrow" style={{ marginBottom: "6px" }}>
                Dates & Timestamps
              </div>
              {photo?.PhotoDate && (
                <div style={{ marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Date Clicked: </span>
                  <strong>{photo.PhotoDate}</strong>
                </div>
              )}
              <div>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Uploaded: </span>
                <span style={{ fontSize: "12px" }}>{item.CreatedAt}</span>
              </div>
            </div>

            {item.Notes && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                <div className="eyebrow" style={{ marginBottom: "6px" }}>
                  Clinical Notes
                </div>
                <div
                  style={{
                    background: "var(--bg)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    color: "var(--ink)",
                  }}
                >
                  {item.Notes}
                </div>
              </div>
            )}

            <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                  style={{ width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}
                >
                  Open in Google Drive ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
