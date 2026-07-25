export default function OriginFlag({ profile, size = "medium", className = "" }) {
  if (!profile?.flag) return null;

  return (
    <span
      className={`origin-flag origin-flag--${size} ${className}`.trim()}
      aria-hidden="true"
    >
      {profile.flag}
    </span>
  );
}
