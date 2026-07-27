export const originPinPosition = (profile) => profile.pin || profile.map;

export function handleMapArrowNavigation(event) {
  const offset = ["ArrowLeft", "ArrowUp"].includes(event.key)
    ? -1
    : ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : 0;
  if (!offset) return;
  const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled):not([aria-hidden="true"])')];
  if (controls.length < 2) return;
  const current = Math.max(0, controls.indexOf(document.activeElement));
  const next = controls[(current + offset + controls.length) % controls.length];
  event.preventDefault();
  controls[current].tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
}

export default function OriginMapAnchors({ profiles, showLeaders = true }) {
  return (
    <g data-origin-anchors="" aria-hidden="true">
      {profiles.map((profile) => {
        const pin = originPinPosition(profile);
        const offset = pin.x !== profile.map.x || pin.y !== profile.map.y;
        const anchorX = profile.map.x * 10;
        const anchorY = profile.map.y * 5.2;

        return (
          <g key={profile.id} data-origin-anchor={profile.iso}>
            {showLeaders && offset && (
              <line
                x1={anchorX}
                y1={anchorY}
                x2={pin.x * 10}
                y2={pin.y * 5.2}
                stroke="#efc979"
                strokeOpacity=".46"
                strokeWidth="1.2"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <circle cx={anchorX} cy={anchorY} r="4.5" fill="#efc979" fillOpacity=".2" stroke="#efc979" strokeOpacity=".78" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
            <circle cx={anchorX} cy={anchorY} r="1.5" fill="#efc979" />
          </g>
        );
      })}
    </g>
  );
}
