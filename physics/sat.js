// physics/sat.js
import { sub, dot, normalize } from '../utils/math.js';

export function getPolygonPoints(shape) {
    const c = shape.position;
    const cos = Math.cos(shape.rotation), sin = Math.sin(shape.rotation);
    const pts = [];

    // metade do stroke
    const sw = (shape.strokeWidth ?? 0) / 2;

    if (shape.type === 'rect') {
        const hw = shape.width / 2 + sw;
        const hh = shape.height / 2 + sw;
        const loc = [
            { x: -hw, y: -hh }, { x: hw, y: -hh },
            { x: hw, y: hh }, { x: -hw, y: hh }
        ];
        for (const p of loc) {
            pts.push({
                x: c.x + p.x * cos - p.y * sin,
                y: c.y + p.x * sin + p.y * cos
            });
        }
    } else if (shape.type === 'triangle') {
        const w = shape.width + sw * 2;
        const h = shape.height + sw * 2;
        const loc = [
            { x: 0, y: -h / 2 },
            { x: -w / 2, y: h / 2 },
            { x: w / 2, y: h / 2 },
        ];
        for (const p of loc) {
            pts.push({
                x: c.x + p.x * cos - p.y * sin,
                y: c.y + p.x * sin + p.y * cos
            });
        }
    } else {
        throw new Error('getPolygonPoints: shape must be rect or triangle');
    }
    return pts;
}

export function getAxes(points) {
    const axes = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const p0 = points[i];
        const p1 = points[(i + 1) % n];
        const edge = sub(p1, p0);
        // normal perpendicular (edge.y, -edge.x)
        const axis = normalize({ x: edge.y, y: -edge.x });
        axes.push(axis);
    }
    return axes;
}

export function projectPoints(points, axis) {
    let min = dot(points[0], axis);
    let max = min;
    for (let i = 1; i < points.length; i++) {
        const p = dot(points[i], axis);
        if (p < min) min = p;
        if (p > max) max = p;
    }
    return { min, max };
}

export function projectCircle(circle, axis) {
    const c = dot(circle.position, axis);
    return { min: c - circle.radius, max: c + circle.radius };
}

export function intervalOverlap(a, b) {
    // positivo -> overlapped; retorna magnitude e direção (qual lado empurra qual)
    const overlap = Math.min(a.max, b.max) - Math.max(a.min, b.min);
    if (overlap <= 0) return { overlap: 0, sign: 0 };
    const sign = (a.min + a.max) < (b.min + b.max) ? -1 : 1;
    return { overlap, sign };
}