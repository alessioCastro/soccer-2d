// physics/integrate.js
import { add } from '../utils/math.js';

export function integrate(body, dt) {
    if (!body.hasPhysics) return;

    // 🔑 salvar posição anterior antes de integrar
    body.prevPosition.x = body.shape.position.x;
    body.prevPosition.y = body.shape.position.y;

    // aceleração = força * invMass
    const ax = body.force.x * body.invMass;
    const ay = body.force.y * body.invMass;

    // integra velocidade
    body.velocity.x += ax * dt;
    body.velocity.y += ay * dt;

    // damping simples
    const fric = Math.max(0, Math.min(1, body.friction));
    body.velocity.x *= (1 - fric * dt);
    body.velocity.y *= (1 - fric * dt);

    // integra posição
    body.shape.position.x += body.velocity.x * dt;
    body.shape.position.y += body.velocity.y * dt;

    // rotação
    if (body.angularVelocity) {
        body.shape.rotation += body.angularVelocity * dt;
    }

    // clamp de velocidade
    const maxSpeed = 1200;
    const v2 = body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y;
    if (v2 > maxSpeed * maxSpeed) {
        const vlen = Math.sqrt(v2);
        body.velocity.x *= maxSpeed / vlen;
        body.velocity.y *= maxSpeed / vlen;
    }

    // zera força acumulada
    body.force.x = 0;
    body.force.y = 0;
}