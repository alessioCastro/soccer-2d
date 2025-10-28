// physics/collisionManager.js
import { vec, add, sub, dot, length, clamp } from '../utils/math.js';
import { collideCirclePolygon, collidePolygonPolygon } from './satColliders.js';

export class CollisionManager {
    constructor({ cell = 64, onSensorContact = () => { } } = {}) {
        this.cell = cell;
        this.onSensorContact = onSensorContact;
        this.grid = new Map();
    }

    update(bodies) {
        this.grid.clear();
        // broad-phase: indexar por célula
        for (const b of bodies) {
            if (!b.shape.isVisible && !b.hasPhysics && !b.isSensor) continue;
            const aabb = computeAABB(b.shape);
            const minCell = this.cellCoords(aabb.min);
            const maxCell = this.cellCoords(aabb.max);
            for (let cy = minCell.y; cy <= maxCell.y; cy++) {
                for (let cx = minCell.x; cx <= maxCell.x; cx++) {
                    const key = `${cx},${cy}`;
                    if (!this.grid.has(key)) this.grid.set(key, []);
                    this.grid.get(key).push(b);
                }
            }
        }

        // checar pares em cada célula
        const checked = new Set();
        for (const [, list] of this.grid) {
            const n = list.length;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const a = list[i], b = list[j];
                    const pairKey = pairId(a, b);
                    if (checked.has(pairKey)) continue;
                    checked.add(pairKey);

                    if (!this.shouldCheck(a, b)) continue;

                    const m = collide(a, b);
                    if (!m) continue;

                    // sensor: dispara evento e não resolve
                    if (a.isSensor || b.isSensor) {
                        this.onSensorContact(a, b, m);
                    
                        // só resolve fisicamente se o sensor explicitamente colide
                        if (a.collidesWith.has(b.collisionGroup) && b.hasPhysics) {
                            resolveCollision(a, b, m);
                        }
                        if (b.collidesWith.has(a.collisionGroup) && a.hasPhysics) {
                            resolveCollision(a, b, m);
                        }
                    } else {
                        resolveCollision(a, b, m);
                    }
                }
            }
        }
    }

    cellCoords(p) {
        return { x: Math.floor(p.x / this.cell), y: Math.floor(p.y / this.cell) };
    }

    shouldCheck(a, b) {
        // se qualquer um for sensor, sempre permitir detecção
        if (a.isSensor || b.isSensor) {
            // mas ainda respeita tipos
            if (!a.canCollideWithTypes.has(b.shape.type) &&
                !b.canCollideWithTypes.has(a.shape.type)) {
                return false;
            }
            return true;
        }
    
        // caso normal (não sensores)
        if (!a.collidesWith.has(b.collisionGroup)) return false;
        if (!b.collidesWith.has(a.collisionGroup)) return false;
        if (!a.canCollideWithTypes.has(b.shape.type)) return false;
        if (!b.canCollideWithTypes.has(a.shape.type)) return false;
        return true;
    }    
}

// ---------- Narrow-phase e utilitários ----------

function pairId(a, b) { return a.shape.position.x <= b.shape.position.x ? `${a.entity?.id}-${b.entity?.id}` : `${b.entity?.id}-${a.entity?.id}`; }

function computeAABB(shape) {
    const sw = (shape.strokeWidth ?? 0) / 2; // 👈 metade do stroke

    if (shape.type === 'circle') {
        const r = shape.radius + sw;
        return {
            min: { x: shape.position.x - r, y: shape.position.y - r },
            max: { x: shape.position.x + r, y: shape.position.y + r }
        };
    }
    if (shape.type === 'rect' || shape.type === 'triangle') {
        const pts = getTransformedPoints(shape);
        let minx = pts[0].x, miny = pts[0].y, maxx = pts[0].x, maxy = pts[0].y;
        for (const p of pts) {
            if (p.x < minx) minx = p.x; if (p.y < miny) miny = p.y;
            if (p.x > maxx) maxx = p.x; if (p.y > maxy) maxy = p.y;
        }
        // inflar pelo stroke
        return {
            min: { x: minx - sw, y: miny - sw },
            max: { x: maxx + sw, y: maxy + sw }
        };
    }
    if (shape.type === 'line') {
        const minx = Math.min(shape.start.x, shape.end.x), maxx = Math.max(shape.start.x, shape.end.x);
        const miny = Math.min(shape.start.y, shape.end.y), maxy = Math.max(shape.start.y, shape.end.y);
        const r = (shape.thickness / 2) + sw;
        return {
            min: { x: minx - r, y: miny - r },
            max: { x: maxx + r, y: maxy + r }
        };
    }
    return { min: shape.position, max: shape.position };
}

function getTransformedPoints(shape) {
    const { position: c, rotation } = shape;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const pts = [];
    if (shape.type === 'rect') {
        const hw = shape.width / 2, hh = shape.height / 2;
        const loc = [
            { x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }
        ];
        for (const p of loc) pts.push({ x: c.x + p.x * cos - p.y * sin, y: c.y + p.x * sin + p.y * cos });
    } else if (shape.type === 'triangle') {
        const w = shape.width, h = shape.height;
        const loc = [
            { x: 0, y: -h / 2 },
            { x: -w / 2, y: h / 2 },
            { x: w / 2, y: h / 2 },
        ];
        for (const p of loc) pts.push({ x: c.x + p.x * cos - p.y * sin, y: c.y + p.x * sin + p.y * cos });
    }
    return pts;
}

function collide(a, b) {
    const sa = a.shape, sb = b.shape;
    const ta = sa.type, tb = sb.type;

    if (ta === 'circle' && tb === 'circle') return collideCircleCircle(sa, sb);

    // circle vs rect/triangle
    if (ta === 'circle' && (tb === 'rect' || tb === 'triangle')) return collideCirclePolygon(sa, sb);
    if (tb === 'circle' && (ta === 'rect' || ta === 'triangle')) {
        const m = collideCirclePolygon(sb, sa);
        if (!m) return null;
        return { normal: { x: -m.normal.x, y: -m.normal.y }, penetration: m.penetration, contactPoint: m.contactPoint };
    }

    // circle vs line
    /*if (ta === 'circle' && tb === 'line') return collideCircleLine(sa, sb);
    if (tb === 'circle' && ta === 'line') {
        const m = collideCircleLine(sb, sa);
        if (!m) return null;
        return { normal: { x: -m.normal.x, y: -m.normal.y }, penetration: m.penetration, contactPoint: m.contactPoint };
    }*/

    // polygon vs polygon (rect/triangle mistos)
    if ((ta === 'rect' || ta === 'triangle') && (tb === 'rect' || tb === 'triangle')) {
        return collidePolygonPolygon(sa, sb);
    }

    return null;
}

function collideCircleCircle(a, b) {
    const ra = a.radius + (a.strokeWidth ?? 0) / 2;
    const rb = b.radius + (b.strokeWidth ?? 0) / 2;

    const d = sub(b.position, a.position);
    const dist = length(d);
    const r = ra + rb;
    if (dist >= r || dist === 0) return null;

    const normal = { x: d.x / dist, y: d.y / dist };
    const penetration = r - dist;
    const contact = {
        x: a.position.x + normal.x * ra,
        y: a.position.y + normal.y * ra
    };
    return { normal, penetration, contactPoint: contact };
}

function collideCircleRect(circle, rect) {
    // ponto mais próximo do círculo em relação ao rect rotacionado
    const { position: rc, rotation } = rect;
    const cos = Math.cos(-rotation), sin = Math.sin(-rotation);
    // transformar posição do círculo para espaço local do retângulo
    const rel = sub(circle.position, rc);
    const local = { x: rel.x * cos - rel.y * sin, y: rel.x * sin + rel.y * cos };
    const hw = rect.width / 2, hh = rect.height / 2;

    const closest = { x: clamp(local.x, -hw, hw), y: clamp(local.y, -hh, hh) };
    const diff = sub(local, closest);
    const dist2 = diff.x * diff.x + diff.y * diff.y;

    if (dist2 > circle.radius * circle.radius) return null;

    const dist = Math.sqrt(dist2) || 0.00001;
    const nLocal = { x: diff.x / dist, y: diff.y / dist };
    // back to world space
    const cosw = Math.cos(rotation), sinw = Math.sin(rotation);
    const normal = { x: nLocal.x * cosw - nLocal.y * sinw, y: nLocal.x * sinw + nLocal.y * cosw };
    const penetration = circle.radius - dist;

    const contactLocal = { x: closest.x, y: closest.y };
    const contact = {
        x: rc.x + contactLocal.x * cosw - contactLocal.y * sinw,
        y: rc.y + contactLocal.x * sinw + contactLocal.y * cosw
    };
    return { normal, penetration, contactPoint: contact };
}

function resolveCollision(a, b, m) {
    if (!a.hasPhysics && !b.hasPhysics) return;

    const isLine = (a.shape.type === 'line' || b.shape.type === 'line');

    // só ajusta normal para sólidos, não para linhas
    if (!isLine) {
        const dir = {
            x: b.shape.position.x - a.shape.position.x,
            y: b.shape.position.y - a.shape.position.y
        };
        if (dot(m.normal, dir) < 0) {
            m.normal.x *= -1;
            m.normal.y *= -1;
        }
    }

    const totalInvMass = a.invMass + b.invMass;
    if (totalInvMass === 0) return;

    if (isLine) {
        // apenas empurra o círculo para fora da linha
        const circleBody = a.shape.type === 'circle' ? a : b;
        circleBody.shape.position.x += m.normal.x * (m.penetration + 0.1);
        circleBody.shape.position.y += m.normal.y * (m.penetration + 0.1);
    } else {
        // correção posicional normal (para sólidos)
        const percent = 0.8;
        const slop = 0.5;
        const penetration = Math.max(0, m.penetration - slop);
        const maxCorrection = 10;
        const corrMag = Math.min(penetration * percent / totalInvMass, maxCorrection);
        const correction = { x: m.normal.x * corrMag, y: m.normal.y * corrMag };

        if (a.hasPhysics) {
            a.shape.position.x -= correction.x * a.invMass;
            a.shape.position.y -= correction.y * a.invMass;
        }
        if (b.hasPhysics) {
            b.shape.position.x += correction.x * b.invMass;
            b.shape.position.y += correction.y * b.invMass;
        }
    }

    // impulso (bounce)
    const rv = sub(b.velocity, a.velocity);
    const velAlongNormal = dot(rv, m.normal);
    if (velAlongNormal > 0) return;

    const speed = Math.hypot(rv.x, rv.y);
    const eBase = Math.min(a.restitution, b.restitution);
    const e = speed < 30 ? eBase * 0.2 : eBase;

    const j = -(1 + e) * velAlongNormal / totalInvMass;
    const impulse = { x: m.normal.x * j, y: m.normal.y * j };

    if (a.hasPhysics) {
        a.velocity.x -= impulse.x * a.invMass;
        a.velocity.y -= impulse.y * a.invMass;
    }
    if (b.hasPhysics) {
        b.velocity.x += impulse.x * b.invMass;
        b.velocity.y += impulse.y * b.invMass;
    }
}
