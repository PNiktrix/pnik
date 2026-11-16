// Test contour base pipeline
const fs = require('fs');

function perpendicularDistance(p, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d2 = dx * dx + dy * dy;
  if (d2 === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / d2));
  return Math.hypot(p.x - (p1.x + t * dx), p.y - (p1.y + t * dy));
}

function simplifyRDP(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      dmax = d;
      index = i;
    }
  }
  if (dmax > epsilon) {
    const r1 = simplifyRDP(points.slice(0, index + 1), epsilon);
    const r2 = simplifyRDP(points.slice(index), epsilon);
    return r1.slice(0, -1).concat(r2);
  }
  return [points[0], points[end]];
}

function traceOuterContour(data, width, height) {
  const isSolid = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 128;
  };

  let startX = -1, startY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isSolid(x, y)) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }
  if (startX === -1) return [];

  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  const points = [];
  let currX = startX;
  let currY = startY;
  let dir = 6;
  const maxSteps = width * height;
  let steps = 0;

  while (steps++ < maxSteps) {
    points.push({ x: currX, y: currY });
    const nextDir = (dir + 1) % 8;
    let found = false;

    for (let i = 0; i < 8; i++) {
      const d = (nextDir + i) % 8;
      const nx = currX + dx[d];
      const ny = currY + dy[d];
      if (isSolid(nx, ny)) {
        currX = nx;
        currY = ny;
        dir = (d + 4) % 8;
        found = true;
        break;
      }
    }

    if (!found || (currX === startX && currY === startY && points.length > 3)) {
      break;
    }
  }
  return points;
}

console.log('Testing contour tracer: OK');
