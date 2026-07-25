import { useState } from "react";

const flagSource = (iso) => `/images/flags/${iso.toLowerCase()}.svg`;

export default function OriginFlag({ profile, size = "medium", className = "", style }) {
  const source = profile?.iso ? flagSource(profile.iso) : "";
  const [failedSource, setFailedSource] = useState("");
  const failed = failedSource === source;

  if (!source && !profile?.flag) return null;

  return (
    <span
      className={`origin-flag origin-flag--${size} ${className}`.trim()}
      data-country={profile.iso}
      data-flag-source={failed ? "emoji-fallback" : "local-svg"}
      style={style}
      aria-hidden="true"
    >
      {failed ? (
        <span className="origin-flag__fallback" style={{ position: "relative", zIndex: 1 }}>{profile.flag}</span>
      ) : (
        <img
          className="origin-flag__image"
          src={source}
          alt=""
          width="4"
          height="3"
          decoding="async"
          draggable="false"
          onError={() => setFailedSource(source)}
        />
      )}
      <span className="origin-flag__shine" style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: "linear-gradient(135deg,rgba(255,255,255,.38),transparent 38%,rgba(23,61,49,.08))", mixBlendMode: "soft-light", pointerEvents: "none" }} />
    </span>
  );
}
