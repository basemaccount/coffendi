const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;
const MINIMUM_DISTANCE = 70;
const X_MARGIN = 30;
const Y_MARGIN = 30;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function resolveOriginPinLayout(countries) {
  const points = countries.map((country) => {
    const source = country.pin || country.map;
    return {
      x: source.x * 10,
      y: source.y * 5.2,
      anchorX: country.map.x * 10,
      anchorY: country.map.y * 5.2,
    };
  });

  for (let iteration = 0; iteration < 260; iteration += 1) {
    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        const a = points[left];
        const b = points[right];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);

        if (distance >= MINIMUM_DISTANCE) continue;
        if (distance < 0.01) {
          const angle = ((left + 1) * 1.618 + right) * Math.PI;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        const displacement = ((MINIMUM_DISTANCE - distance) * 0.54) / distance;
        const moveX = dx * displacement;
        const moveY = dy * displacement;
        a.x -= moveX;
        a.y -= moveY;
        b.x += moveX;
        b.y += moveY;
      }
    }

    for (const point of points) {
      if (iteration < 190) {
        point.x += (point.anchorX - point.x) * 0.01;
        point.y += (point.anchorY - point.y) * 0.01;
      }
      point.x = clamp(point.x, X_MARGIN, MAP_WIDTH - X_MARGIN);
      point.y = clamp(point.y, Y_MARGIN, MAP_HEIGHT - Y_MARGIN);
    }
  }

  return countries.map((country, index) => ({
    ...country,
    pin: {
      x: Number((points[index].x / 10).toFixed(2)),
      y: Number((points[index].y / 5.2).toFixed(2)),
    },
  }));
}
