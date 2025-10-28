// physics/satColliders.js
import { getPolygonPoints, getAxes, projectPoints, projectCircle, intervalOverlap } from './sat.js';
import { length, normalize } from '../utils/math.js';

export function collideCirclePolygon(circle, polyShape) {
    const pts = getPolygonPoints(polyShape);
    const axes = getAxes(pts);

    // incluir eixo do vértice mais próximo
    let closestIdx = 0;
    let minDist2 = Infinity;
    for (let i = 0; i < pts.length; i++) {
        const dx = circle.position.x - pts[i].x;
        const dy = circle.position.y - pts[i].y;
        const d2 = dx*dx + dy*dy;
        if (d2 < minDist2) { minDist2 = d2; closestIdx = i; }
    }
    const cp = pts[closestIdx];
    const extraAxis = normalize({ x: circle.position.x - cp.x, y: circle.position.y - cp.y });
    if (length(extraAxis) > 0) axes.push(extraAxis);

    let smallestOverlap = Infinity;
    let bestAxis = null;

    // raio efetivo do círculo
    const rEff = circle.radius + (circle.strokeWidth ?? 0) / 2;

    for (const axis of axes) {
        const projPoly = projectPoints(pts, axis);
        const projCirc = projectCircle({ position: circle.position, radius: rEff }, axis);
        const { overlap, sign } = intervalOverlap(projPoly, projCirc);
        if (overlap <= 0) return null;
        if (overlap < smallestOverlap) {
            smallestOverlap = overlap;
            bestAxis = { x: axis.x * sign, y: axis.y * sign };
        }
    }

    const contactPoint = {
        x: circle.position.x - bestAxis.x * rEff,
        y: circle.position.y - bestAxis.y * rEff
    };

    return { normal: bestAxis, penetration: smallestOverlap, contactPoint };
}

export function collidePolygonPolygon(shapeA, shapeB) {
    const ptsA = getPolygonPoints(shapeA);
    const ptsB = getPolygonPoints(shapeB);
    const axes = [...getAxes(ptsA), ...getAxes(ptsB)];

    let smallestOverlap = Infinity;
    let bestAxis = null;

    for (const axis of axes) {
        const projA = projectPoints(ptsA, axis);
        const projB = projectPoints(ptsB, axis);
        const { overlap } = intervalOverlap(projA, projB);
        if (overlap <= 0) return null; // separação
        if (overlap < smallestOverlap) {
            smallestOverlap = overlap;
            bestAxis = axis;
        }
    }

    // normal consistente: de A -> B
    const cA = centroid(ptsA);
    const cB = centroid(ptsB);
    const dir = { x: cB.x - cA.x, y: cB.y - cA.y };
    const len = Math.hypot(bestAxis.x, bestAxis.y) || 1;
    let nx = bestAxis.x / len, ny = bestAxis.y / len;
    if (nx * dir.x + ny * dir.y < 0) { nx = -nx; ny = -ny; }

    // slop mínimo no SAT para evitar jitter em contatos rasos
    const satSlop = 0.3;
    const penetration = Math.max(0, smallestOverlap - satSlop);

    // ponto de contato aproximado (centro de A projetado)
    const contactPoint = { x: cA.x, y: cA.y };

    return { normal: { x: nx, y: ny }, penetration, contactPoint };
}


function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) { x += p.x; y += p.y; }
    const n = pts.length;
    return { x: x / n, y: y / n };
}