// utils/math.js
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const vec = (x = 0, y = 0) => ({ x, y });
export const add = (a, b) => vec(a.x + b.x, a.y + b.y);
export const sub = (a, b) => vec(a.x - b.x, a.y - b.y);
export const scale = (a, s) => vec(a.x * s, a.y * s);
export const len2 = (a) => a.x * a.x + a.y * a.y;
export const length = (a) => Math.sqrt(len2(a));
export const normalize = (a) => {
    const l = length(a) || 1;
    return vec(a.x / l, a.y / l);
};

// 🔑 Produto escalar (necessário para SAT)
export const dot = (a, b) => a.x * b.x + a.y * b.y;

// Produto vetorial 2D (retorna escalar)
export const cross = (a, b) => a.x * b.y - a.y * b.x;

// Distância entre dois pontos
export const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// Distância ao quadrado (evita sqrt quando não precisa)
export const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Raio máximo seguro para arredondar triângulo
export function maxTriangleRadius(verts) {
    const maxPerCorner = verts.map((p, i) => {
        const pPrev = verts[(i + 2) % 3];
        const pNext = verts[(i + 1) % 3];
        const len1 = Math.hypot(p.x - pPrev.x, p.y - pPrev.y);
        const len2 = Math.hypot(p.x - pNext.x, p.y - pNext.y);
        return Math.min(len1, len2) / 2;
    });
    return Math.min(...maxPerCorner);
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}