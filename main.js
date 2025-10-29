// main.js
import { Scene } from './core/gameScene.js';
import { Body } from './physics/body.js';
import { Entity } from './core/types.js';
import { vec, dist } from './utils/math.js';
import { Circle } from './shapes/circle.js';
import { Rect } from './shapes/rect.js';
import { Triangle } from './shapes/triangle.js';
import { Line } from './shapes/line.js';

const canvas = document.getElementById('game');
const scene = new Scene({
    canvas,
    onScore: ({ scorer }) => {
        setTimeout(() => {
            ball.shape.position = { x: canvas.width / 2, y: canvas.height / 2 };
            ball.velocity = { x: 0, y: 0 };

            player.shape.position = { x: canvas.width / 2 - 120, y: canvas.height / 2 };
            player.velocity = { x: 0, y: 0 };
        }, 2000);
    }
});

let goalScored = false;

// paredes (retângulos finos que contornam o campo)
const margin = 12;
const fieldW = canvas.width - margin * 2;
const fieldH = canvas.height - margin * 2;

// top
scene.add(new Body({
    shape: new Rect({ position: vec(canvas.width / 2, margin), width: fieldW, height: 12, rotation: 0 }),
    renderStyle: { fill: '#fff', stroke: '#fff', fillAlpha: 0.02 },
    hasPhysics: false, collisionGroup: 'walls', collidesWith: ['players', 'ball', 'walls']
}));
// bottom
scene.add(new Body({
    shape: new Rect({ position: vec(canvas.width / 2, canvas.height - margin), width: fieldW, height: 12 }),
    renderStyle: { fill: '#fff', stroke: '#fff', fillAlpha: 0.02 },
    hasPhysics: false, collisionGroup: 'walls', collidesWith: ['players', 'ball', 'walls']
}));
// left
scene.add(new Body({
    shape: new Rect({ position: vec(margin, canvas.height / 2), width: 12, height: fieldH }),
    renderStyle: { fill: '#fff', stroke: '#fff', fillAlpha: 0.02 },
    hasPhysics: false, collisionGroup: 'walls', collidesWith: ['players', 'ball', 'walls']
}));
// right
scene.add(new Body({
    shape: new Rect({ position: vec(canvas.width - margin, canvas.height / 2), width: 12, height: fieldH }),
    renderStyle: { fill: '#fff', stroke: '#fff', fillAlpha: 0.02 },
    hasPhysics: false, collisionGroup: 'walls', collidesWith: ['players', 'ball', 'walls']
}));

// sensores de gol como linhas verticais no centro das laterais
const goalLeft = scene.add(new Body({
    shape: new Rect({ position: vec(margin + 20, canvas.height / 2), width: 0, height: 120 }),
    hasPhysics: false, isSensor: true, collisionGroup: 'goals', collidesWith: [], canCollideWithTypes: ['circle'],
}), { entity: new Entity({ name: 'GoalLeft', tags: ['goal'] }) });

const goalRight = scene.add(new Body({
    shape: new Rect({ position: vec(canvas.width - margin - 20, canvas.height / 2), width: 0, height: 120 }),
    hasPhysics: false, isSensor: true, collisionGroup: 'goals', collidesWith: [], canCollideWithTypes: ['circle'],
}), { entity: new Entity({ name: 'GoalRight', tags: ['goal'] }) });

/*const goalRight = scene.add(new Body({
    shape: new Line({ start: vec(canvas.width - margin - 20, canvas.height / 2 - 60), end: vec(canvas.width - margin - 20, canvas.height / 2 + 60), thickness: 6 }),
    hasPhysics: false, isSensor: true, collisionGroup: 'goals', collidesWith: [], canCollideWithTypes: ['circle'],
}), { entity: new Entity({ name: 'GoalRight', tags: ['goal'] }) });*/

scene.buildStaticLayer();

// círculo principal (azul-grená)
const playerShape = new Circle({
    position: vec(canvas.width / 2 - 120, canvas.height / 2),
    radius: 20,
    fill: '#004d98',   // azul Barça
    stroke: '#004d98',
    strokeWidth: 3
});

// configuração das listras
const stripeWidth = 5;
const radius = 20;
const stripeSpacing = 4.5; // margem entre a borda do círculo e as listras

// posições horizontais das 3 listras
const offsets = [
    - (stripeWidth + stripeSpacing), // esquerda
    0,                        // centro
    (stripeWidth + stripeSpacing)    // direita
];

// cores: grená, azul, grená
const colors = ['#a50044', '#a50044', '#a50044'];

for (let i = 0; i < 3; i++) {
    playerShape.addChild(
        new Rect({ width: stripeWidth, height: radius * 2, fill: colors[i], strokeWidth: 0 }),
        { offset: vec(offsets[i], 0) }
    );
}

// corpo físico
const player = scene.add(new Body({
    shape: playerShape,
    mass: 5, restitution: 0.1, friction: 1,
    collisionGroup: 'players',
    collidesWith: ['players', 'ball', 'walls', 'goals'],
    canCollideWithTypes: ['circle', 'rect', 'triangle', 'line']
}), { entity: new Entity({ name: 'Barcelona', tags: ['scorable'] }) });

// carregar imagem (pode ser PNG ou SVG)
const crestImg = new Image();
crestImg.src = 'https://cdn.worldvectorlogo.com/logos/fc-barcelona.svg';

crestImg.onload = () => {
    playerShape.image = crestImg;
    playerShape.imageMode = 'contain';
    playerShape.imageScale = 0.35;
    playerShape.imageOffset = vec(10, -5); // desloca para o "peito"
    playerShape.imageZIndex = 1;
};

const opponent = scene.add(new Body({
    shape: new Rect({ position: vec(canvas.width / 2 + 120, canvas.height / 2), width: 40, height: 40 }),
    renderStyle: { fill: '#2e86ff', stroke: '#0b4a7f' },
    mass: 1, restitution: 0.3, friction: 1,
    collisionGroup: 'players', collidesWith: ['players', 'ball', 'walls', 'goals'],
    canCollideWithTypes: ['circle', 'rect', 'triangle', 'line']
}), { entity: new Entity({ name: 'Vermelho', tags: ['scorable'] }) });

// bola
const ball = scene.add(new Body({
    shape: new Circle({ position: vec(canvas.width / 2, canvas.height / 2), radius: 12 }),
    mass: 1, restitution: 0.9, friction: 0.9,
    collisionGroup: 'ball', collidesWith: ['players', 'ball', 'walls', 'goals'],
    canCollideWithTypes: ['circle', 'rect', 'triangle', 'line']
}), { entity: new Entity({ name: 'Bola', tags: ['scorable'] }) });

const midLine = scene.add(new Body({
    shape: new Line({ start: vec(canvas.width - 850, canvas.height / 2.3), end: vec(canvas.width - 120, canvas.height / 2.3), thickness: 6 }),
    renderStyle: { fill: '#2e86ff', stroke: '#0b4a7f', strokeAlpha: 0.2 },
    mass: 2, restitution: 0.3, friction: 0.99,
    collisionGroup: 'walls', collidesWith: ['players', 'ball', 'walls'],
    canCollideWithTypes: ['circle', 'rect', 'triangle', 'line']
}));

// input básico para mover o jogador
const keys = new Set();

window.addEventListener('keydown', (e) => {
    const zoomLevels = { '1': 1, '2': 1.5, '3': 2, '4': 2.5 };
    if (zoomLevels[e.key]) {
        scene.camera.zoom = zoomLevels[e.key];
        return;
    }
    keys.add(e.key);
});

window.addEventListener('keyup', (e) => keys.delete(e.key));

const playerOriginalStrokeColor = player.shape.stroke;

function handleInput() {
    const accel = 1.2 * 1E3;          // aceleração por segundo
    const decelFactor = 0.88;   // fator de desaceleração (0.9–0.98)

    let ax = 0, ay = 0;

    if (keys.has('ArrowUp') || keys.has('w')) ay -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) ay += 1;
    if (keys.has('ArrowLeft') || keys.has('a')) ax -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) ax += 1;

    // 🔑 desaceleração sempre aplicada
    player.velocity.x *= decelFactor;
    player.velocity.y *= decelFactor;

    // normalizar direção e aplicar aceleração se houver input
    const len = Math.hypot(ax, ay);
    if (len > 0) {
        ax /= len;
        ay /= len;

        player.applyForce({ x: ax * accel * player.mass, y: ay * accel * player.mass });
    }

    // chute (mantém seu código original)
    if (keys.has('x')) {
        if (player.shape.stroke !== '#fff') {
            player.shape.stroke = '#fff';
        }
        const kickRange = 40;
        const d = dist(player.shape.position, ball.shape.position);
        if (d < kickRange) {
            const dir = {
                x: ball.shape.position.x - player.shape.position.x,
                y: ball.shape.position.y - player.shape.position.y
            };
            const len = Math.hypot(dir.x, dir.y) || 1;
            dir.x /= len;
            dir.y /= len;

            const kickStrength = 2.8 * 1E4;
            ball.applyForce({ x: dir.x * kickStrength, y: dir.y * kickStrength });

            keys.delete('x');
        }
    }
    
    else if (keys.has('z')) {
        if (player.shape.stroke !== '#fff') {
            player.shape.stroke = '#fff';
        }
    }
    
    else if (player.shape.stroke !== playerOriginalStrokeColor) {
        player.shape.stroke = playerOriginalStrokeColor;
    }
}

// 🔑 Loop com fixed timestep + interpolação
let accumulator = 0;
let lastTime = performance.now();
const fixedDt = 1 / 60; // 60Hz

function loop() {
    const now = performance.now();
    let frameTime = (now - lastTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25; // evita buracos grandes
    lastTime = now;

    accumulator += frameTime;

    // múltiplos steps de física se necessário
    while (accumulator >= fixedDt) {
        handleInput();
        scene.update(fixedDt);
        scene.camera.follow(ball, player, fixedDt);
        accumulator -= fixedDt;
    }

    // fator de interpolação (0..1)
    const alpha = accumulator / fixedDt;

    // render interpolado
    scene.render(alpha);

    requestAnimationFrame(loop);
}
loop();
