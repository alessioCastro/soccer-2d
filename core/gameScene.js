// core/gameScene.js
import { CanvasRenderer } from '../canvas/canvasRenderer.js';
import { Camera } from './camera.js';
import { CollisionManager } from '../physics/collisionManager.js';
import { integrate } from '../physics/integrate.js';

export class Scene {
    constructor({ canvas, onScore = () => { } }) {
        this.renderer = new CanvasRenderer(canvas);
        this.bodies = [];
        this.hasScored = false;

        this.cm = new CollisionManager({
            cell: 64,
            onSensorContact: (a, b, manifold) => {
                const sensor = a.isSensor ? a : b.isSensor ? b : null;
                const scorable = a.entity?.tags?.has('scorable') ? a :
                    b.entity?.tags?.has('scorable') ? b : null;

                if (!this.hasScored && sensor && scorable) {
                    const redScore = document.querySelector('#red-score');
                    const blueScore = document.querySelector('#blue-score');
                    const eventText = document.querySelector('#event-text');

                    if (sensor.entity.name == 'GoalLeft') {
                        blueScore.textContent = parseInt(blueScore.textContent) + 1;
                    } else if (sensor.entity.name == 'GoalRight') {
                        redScore.textContent = parseInt(redScore.textContent) + 1;
                    }

                    eventText.textContent = 'GOAL!';
                    eventText.style.opacity = 1;

                    onScore({ scorer: scorable, manifold });

                    setTimeout(() => {
                        eventText.style.opacity = 0;
                        this.resetDynamicBodies();
                        this.hasScored = false;
                    }, 2000);

                    this.hasScored = true;
                }
            }
        });

        this.camera = new Camera({
            x: canvas.width / 2,
            y: canvas.height / 2,
            zoom: 1,
            mapWidth: canvas.width,
            mapHeight: canvas.height,
            canvas
        });

        // buffer para estáticos
        this.staticCanvas = document.createElement('canvas');
        this.staticCanvas.width = canvas.width;
        this.staticCanvas.height = canvas.height;
        this.staticRenderer = new CanvasRenderer(this.staticCanvas);

        this.staticBodies = [];
        this.dynamicBodies = [];

        // flag para saber se precisamos reconstruir a camada estática
        this.staticDirty = true;
    }

    resetDynamicBodies() {
        for (const b of this.dynamicBodies) {
            if (b.initialPosition) {
                b.shape.position.x = b.initialPosition.x;
                b.shape.position.y = b.initialPosition.y;
                b.prevPosition = { ...b.initialPosition };
            }
            // zera velocidades se existirem
            if (b.velocity) {
                b.velocity.x = 0;
                b.velocity.y = 0;
            }
            if (b.angularVelocity !== undefined) {
                b.angularVelocity = 0;
            }
        }
    }    

    add(body, meta = { entity: null }) {
        if (meta.entity) body.entity = meta.entity;
        this.bodies.push(body);
    
        if (!body.hasPhysics && !body.isSensor) {
            this.staticBodies.push(body);
            this.staticDirty = true; // precisa rebuild
        } else {
            // salva posição inicial
            body.initialPosition = { 
                x: body.shape.position.x, 
                y: body.shape.position.y 
            };
            this.dynamicBodies.push(body);
        }
        return body;
    }    

    remove(body) {
        // remove da lista geral
        this.bodies = this.bodies.filter(b => b !== body);

        if (!body.hasPhysics && !body.isSensor) {
            // era estático → precisa rebuild
            this.staticBodies = this.staticBodies.filter(b => b !== body);
            this.staticDirty = true;
        } else {
            // era dinâmico
            this.dynamicBodies = this.dynamicBodies.filter(b => b !== body);
        }
    }

    buildStaticLayer() {
        this.staticRenderer.clear('#101820'); // fundo
        for (const b of this.staticBodies) {
            const style = this.styleFor(b);
            this.staticRenderer.drawShape(b.shape, style);
        }
        this.staticDirty = false;
    }

    update(dt) {
        for (const b of this.dynamicBodies) integrate(b, dt);
        this.cm.update(this.bodies);
    }

    render(alpha = 1) {
        const ctx = this.renderer.ctx;
        ctx.clearRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);

        // interpolação da câmera
        const camX = this.camera.prevPosition.x + (this.camera.position.x - this.camera.prevPosition.x) * alpha;
        const camY = this.camera.prevPosition.y + (this.camera.position.y - this.camera.prevPosition.y) * alpha;

        this.camera.begin(ctx, { x: camX, y: camY });

        if (this.staticDirty) this.buildStaticLayer();
        ctx.drawImage(this.staticCanvas, 0, 0);

        for (const b of this.dynamicBodies) {
            const style = this.styleFor(b);
            const pos = {
                x: b.prevPosition.x + (b.shape.position.x - b.prevPosition.x) * alpha,
                y: b.prevPosition.y + (b.shape.position.y - b.prevPosition.y) * alpha
            };
            const original = b.shape.position;
            b.shape.position = pos;
            this.renderer.drawShape(b.shape, style);
            b.shape.position = original;
        }

        this.camera.end(ctx);
    }

    styleFor(b) {
        if (b.shape.fill || b.shape.stroke) return null;
        const group = b.collisionGroup;
        if (group === 'players') return { fill: '#3aa6ff', stroke: '#0b4a7f', lineWidth: 2 };
        if (group === 'ball') return { fill: '#ffcf3a', stroke: '#7f670b', lineWidth: 2 };
        if (group === 'walls') return { fill: '#8f9aa8', stroke: '#4a525e', lineWidth: 2 };
        if (b.isSensor && b.tags?.has('goal')) return { fill: '#00ff88', stroke: '#00ff88', lineWidth: 2 };
        return { fill: '#dddddd', stroke: '#333', lineWidth: 2 };
    }
}
