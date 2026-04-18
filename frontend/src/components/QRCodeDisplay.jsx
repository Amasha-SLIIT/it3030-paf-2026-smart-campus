import { useEffect, useRef, useState } from "react";
import { StatusBadge, TypeBadge } from "./ResourceCard";

// We use the free QR Server API to render the QR image from the UUID.
// The QR encodes a URL: http://localhost:5173/resource?qr=<uuid>
// When a phone scans it, it hits that URL which shows resource info + Book button.
// No backend changes needed — qrCode field already holds the UUID.

const QR_API = (value, size = 200) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=10&color=1a3a2a&bgcolor=f9f7f3`;

const QRCodeDisplay = ({ resource, onClose }) => {
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError, setQrError] = useState(false);

  if (!resource) return null;
  // The QR encodes a URL so a phone camera opens the resource page directly.
  // const viteBaseUrl = import.meta.env?.VITE_APP_BASE_URL.replace(/\/$/, "");
  const backendBaseUrl = import.meta.env?.VITE_API_URL.replace(/\/$/, "");
  const resourceUrl = `${backendBaseUrl}/api/v1/resources/qr/${resource.qrCode}`; // todo: frontend route that shows resource details + Book button instead of backend URL? would need CORS if backend serves the QR image, but easier than implementing a frontend QR generator. For now we can just show the backend URL in the QR and let it 404 if they scan it before setting up VITE_APP_BASE_URL correctly. The QR code value is shown in text below the image too for reference.
  const qrSrc = QR_API(resourceUrl, 220);

  const TYPE_ICONS = {
    LECTURE_HALL: "🏛️",
    LAB: "🔬",
    MEETING_ROOM: "🤝",
    EQUIPMENT: "🔧",
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Resource QR Code</h2>
            <p
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}
            >
              Scan with a phone camera to view details
            </p>
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            style={{ fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: "center" }}>
          {/* Resource name + badges */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 20,
                fontFamily: "var(--font-display)",
                color: "var(--forest)",
                marginBottom: 8,
              }}
            >
              {TYPE_ICONS[resource.type]} {resource.name}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <TypeBadge type={resource.type} />
              <StatusBadge status={resource.status} />
            </div>
          </div>

          {/* Localhost warning */}
          {(resourceUrl.includes("localhost") ||
            resourceUrl.includes("127.0.0.1")) && (
            <div
              style={{
                background: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: 12,
                color: "#7a5f00",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              ⚠️ QR encodes <strong>localhost</strong> — phones can't reach it.
              Add{" "}
              <code
                style={{
                  background: "#fff3cd",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                VITE_APP_BASE_URL=http://&lt;your-lan-ip&gt;:5173
              </code>{" "}
              to your <code>.env</code> and restart the dev server.
            </div>
          )}

          {/* QR Image */}
          <div
            style={{
              display: "inline-block",
              padding: 16,
              background: "#f9f7f3",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--ivory-border)",
              marginBottom: 16,
              position: "relative",
            }}
          >
            {!qrLoaded && !qrError && (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                <div className="spinner" style={{ margin: 0 }} />
              </div>
            )}
            {qrError && (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 32 }}>📵</span>
                <span>QR unavailable offline</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    maxWidth: 200,
                  }}
                >
                  {resource.qrCode}
                </span>
              </div>
            )}
            <img
              src={qrSrc}
              alt={`QR code for ${resource.name}`}
              style={{
                width: 220,
                height: 220,
                display: qrLoaded ? "block" : "none",
                borderRadius: 4,
              }}
              onLoad={() => setQrLoaded(true)}
              onError={() => setQrError(true)}
            />
          </div>

          {/* QR code value */}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "var(--text-muted)",
              background: "var(--ivory-dark)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
              display: "inline-block",
              marginBottom: 20,
              wordBreak: "break-all",
              maxWidth: "100%",
            }}
          >
            {resource.qrCode}
          </div>

          {/* Location info */}
          <div
            style={{
              background: "var(--forest-pale)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              fontSize: 13,
              color: "var(--forest-mid)",
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            📍 {resource.location}
            {resource.building && ` · ${resource.building}`}
            {resource.floor && `, Floor ${resource.floor}`}
            {resource.capacity && (
              <span style={{ marginLeft: 12 }}>
                👥 Capacity: {resource.capacity}
              </span>
            )}
          </div>

          <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            Point your phone camera at the QR code above. It will open the
            resource page where you can view full details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
