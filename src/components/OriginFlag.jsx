export default function OriginFlag({ profile, size = "medium", className = "", style }) {
  if (!profile?.flag) return null;

  return (
    <span
      className={`origin-flag origin-flag--${size} ${className}`.trim()}
      data-country={profile.iso}
      style={style}
      aria-hidden="true"
    >
      <span className="origin-flag__glyph" style={{ position: "relative", zIndex: 1, transform: "scale(1.08)" }}>{profile.flag}</span>
      <span className="origin-flag__shine" style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: "linear-gradient(135deg,rgba(255,255,255,.72),transparent 42%,rgba(23,61,49,.12))", mixBlendMode: "soft-light", pointerEvents: "none" }} />
    </span>
  );
}
