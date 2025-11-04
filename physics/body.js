// physics/body.js
import { vec, add } from '../utils/math.js';

let BODY_ID_COUNTER = 0;

export class Body {
    constructor({
        shape,
        mass = 1,
        restitution = 0.6,
        friction = 0.01,
        velocity = vec(),
        angularVelocity = 0,
        hasPhysics = true,
        isSensor = false,
        collisionGroup = 'default',
        collidesWith = ['default', 'players', 'ball', 'walls'],
        canCollideWithTypes = ['circle', 'rect', 'triangle', 'line'],
        canRotate = false
    }) {
        this._id = BODY_ID_COUNTER++;
        this.shape = shape;
        this.mass = hasPhysics ? Math.max(0.0001, mass) : 0;
        this.invMass = this.mass > 0 ? 1 / this.mass : 0;
        this.restitution = restitution;
        this.friction = friction;
        this.velocity = velocity;
        this.angularVelocity = angularVelocity;
        this.hasPhysics = hasPhysics;
        this.isSensor = isSensor;
        this.collisionGroup = collisionGroup;
        this.collidesWith = new Set(collidesWith);
        this.canCollideWithTypes = new Set(canCollideWithTypes);
        this.force = vec();

        // 🔑 novo
        this.canRotate = canRotate;

        // 🔑 Momento de inércia
        if (shape.type === 'circle') {
            this.inertia = 0.5 * this.mass * shape.radius * shape.radius;
        } else if (shape.type === 'rect') {
            this.inertia = (1/12) * this.mass * (shape.width**2 + shape.height**2);
        } else {
            this.inertia = this.mass * 100; // fallback
        }
        this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;        

        // posição anterior para interpolação
        this.prevPosition = { ...this.shape.position };
    }

    applyForce(f) { this.force = add(this.force, f); }
    setVisible(v) { this.shape.isVisible = v; }
    setPhysicsEnabled(v) {
        this.hasPhysics = v;
        this.mass = v ? this.mass || 1 : 0;
        this.invMass = this.mass > 0 ? 1 / this.mass : 0;
    }
    setSensor(v) { this.isSensor = v; }

    // 👇 novo: liga/desliga rotação
    setRotationEnabled(v) {
        this.canRotate = v;
        if (!v) this.angularVelocity = 0; // garante que pare
    }
}
