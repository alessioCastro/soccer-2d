// physics/integrate.js
export function integrate(body, dt) {
    if (!body.hasPhysics) return;

    body.prevPosition.x = body.shape.position.x;
    body.prevPosition.y = body.shape.position.y;

    const ax = body.force.x * body.invMass;
    const ay = body.force.y * body.invMass;

    body.velocity.x += ax * dt;
    body.velocity.y += ay * dt;

    const fric = Math.max(0, Math.min(1, body.friction));
    body.velocity.x *= (1 - fric * dt);
    body.velocity.y *= (1 - fric * dt);

    body.shape.position.x += body.velocity.x * dt;
    body.shape.position.y += body.velocity.y * dt;

    // 👇 respeitar canRotate
    if (body.canRotate && body.angularVelocity) {
        body.shape.rotation += body.angularVelocity * dt;
    
        // damping angular (como atrito do ar)
        body.angularVelocity *= 0.96;
    
        // limitar rotação máxima
        const maxAngularSpeed = 10; // rad/s (~573°/s)
        if (body.angularVelocity > maxAngularSpeed) body.angularVelocity = maxAngularSpeed;
        if (body.angularVelocity < -maxAngularSpeed) body.angularVelocity = -maxAngularSpeed;
    }    

    const maxSpeed = 1200;
    const v2 = body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y;
    if (v2 > maxSpeed * maxSpeed) {
        const vlen = Math.sqrt(v2);
        body.velocity.x *= maxSpeed / vlen;
        body.velocity.y *= maxSpeed / vlen;
    }

    body.force.x = 0;
    body.force.y = 0;
}
