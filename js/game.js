// --- 1. CONFIGURAÇÃO INICIAL E RENDERIZAÇÃO ---

// Configurações do campo
const LARGURA = window.innerWidth;
const ALTURA = window.innerHeight;
const RAIO_JOGADOR = 15;
const RAIO_BOLA = 10;

// Criar o mundo de física P2
const world = new p2.World({
    gravity: [0, 0]
});

// Configurar Pixi.js para renderização (desenhar na tela)
const app = new PIXI.Application({
    width: LARGURA,
    height: ALTURA,
    backgroundColor: 0x447b35,
    antialias: true // Habilitar antisserrilhamento
});
document.body.appendChild(app.view);

// Placar
const placarElement = document.getElementById('placar');
let golsVermelho = 0;
let golsAzul = 0;

function atualizaPlacar() {
    placarElement.innerHTML = `<span class="time-vermelho">${golsVermelho}</span> - <span class="time-azul">${golsAzul}</span>`;
}

// Função para desenhar o campo de futebol
function desenharCampo() {
    const campo = new PIXI.Graphics();
    const corLinha = 0xffffff;
    const espessuraLinha = 3;

    // Linha central
    campo.lineStyle(espessuraLinha, corLinha);
    campo.moveTo(LARGURA / 2, 0);
    campo.lineTo(LARGURA / 2, ALTURA);

    // Círculo central
    campo.drawCircle(LARGURA / 2, ALTURA / 2, 75);

    // Círculos dos gols
    campo.drawCircle(0, ALTURA / 2, 60);
    campo.drawCircle(LARGURA, ALTURA / 2, 60);

    // Adiciona ao palco do Pixi
    app.stage.addChild(campo);
}

// Chamar a função para desenhar o campo
desenharCampo();

// --- 2. DEFINIÇÕES FÍSICAS E CRIAÇÃO DOS OBJETOS ---

// Objeto para guardar as propriedades de cada tipo de corpo
const prop = {
    bola: {
        mass: 1,
        damping: 0.59,
        restitution: 0.5,
        friction: 0.0,
        radius: RAIO_BOLA
    },
    jogador: {
        mass: 5,
        damping: 1,
        restitution: 0.5,
        friction: 0.5,
        radius: RAIO_JOGADOR
    },
    parede: {
        mass: 0,
        restitution: 0.5,
        friction: 0
    },
    obstaculo: {
        mass: 0,
        damping: 1,
        restitution: 0.8,
        friction: 0.5,
    }
};

const corposVisuais = {};

// Materiais para as colisões
const materialJogador = new p2.Material();
const materialBola = new p2.Material();
const materialParede = new p2.Material();
const materialObstaculo = new p2.Material();

prop.jogador.material = materialJogador;
prop.bola.material = materialBola;
prop.parede.material = materialParede;
prop.obstaculo.material = materialObstaculo;

// Configurar os contatos entre os materiais
world.addContactMaterial(new p2.ContactMaterial(materialJogador, materialBola, {
    restitution: prop.jogador.restitution * prop.bola.restitution,
    friction: 0.0
}));
world.addContactMaterial(new p2.ContactMaterial(materialBola, materialParede, {
    restitution: prop.parede.restitution,
    friction: prop.parede.friction
}));
world.addContactMaterial(new p2.ContactMaterial(materialJogador, materialParede, {
    restitution: prop.jogador.restitution,
    friction: prop.jogador.friction
}));
world.addContactMaterial(new p2.ContactMaterial(materialJogador, materialJogador, {
    restitution: prop.jogador.restitution,
    friction: prop.jogador.friction
}));
world.addContactMaterial(new p2.ContactMaterial(materialBola, materialObstaculo, {
    restitution: prop.obstaculo.restitution,
    friction: prop.obstaculo.friction
}));
world.addContactMaterial(new p2.ContactMaterial(materialJogador, materialObstaculo, {
    restitution: prop.obstaculo.restitution,
    friction: prop.obstaculo.friction
}));

const GRUPO_JOGADORES = 1;
const GRUPO_BOLA = 2;
const GRUPO_PAREDES = 4;
const GRUPO_TRAVES = 8;
const GRUPO_OBSTACULOS = 16;


// --- FUNÇÕES GENÉRICAS DE CRIAÇÃO ---

// Nova função para converter graus para radianos
function grausParaRadianos(graus) {
    return graus * (Math.PI / 180);
}

// Função P2.js para criar o corpo físico
function criarCorpoFisico(x, y, propriedades, forma, label, grupoColisao, mascaraColisao, ehSensor = false) {
    const corpo = new p2.Body({
        mass: propriedades.mass,
        position: [x, y],
        damping: propriedades.damping,
        angle: propriedades.angle || 0
    });
    forma.collisionGroup = grupoColisao;
    forma.collisionMask = mascaraColisao;
    forma.sensor = ehSensor;
    forma.material = propriedades.material;
    corpo.addShape(forma);
    world.addBody(corpo);
    corpo.label = label;
    return corpo;
}

// Função Pixi.js para desenhar a forma
function desenharForma(corpo, forma, cor, espessuraLinha = 3, corLinha = 0x000000) {
    const grafico = new PIXI.Graphics();
    grafico.lineStyle(espessuraLinha, corLinha);
    grafico.beginFill(cor);

    if (forma instanceof p2.Circle) {
        const fatorEscala = 5; // aumenta resolução
        const raioDesenho = forma.radius * fatorEscala;
        grafico.drawCircle(0, 0, raioDesenho);
        grafico.scale.set(1 / fatorEscala);
    } else if (forma instanceof p2.Box) {
        grafico.drawRect(-forma.width / 2, -forma.height / 2, forma.width, forma.height);
    } else if (forma instanceof p2.Convex) {
        const pontos = [];
        for (let i = 0; i < forma.vertices.length; i++) {
            pontos.push(forma.vertices[i][0], forma.vertices[i][1]);
        }
        grafico.drawPolygon(pontos);
    } else if (forma instanceof p2.Line) {
        grafico.moveTo(-forma.length / 2, 0);
        grafico.lineTo(forma.length / 2, 0);
        grafico.endFill();
        app.stage.addChild(grafico);
        corposVisuais[corpo.id] = grafico;
        return;
    }

    grafico.endFill();
    app.stage.addChild(grafico);
    corposVisuais[corpo.id] = grafico;

    // Posição inicial do gráfico no mesmo lugar do corpo
    grafico.x = corpo.position[0];
    grafico.y = corpo.position[1];
}

// Funções para criar formas completas (físico + visual)
function criarCirculo(x, y, raio, cor, label, propriedades, grupoColisao, mascaraColisao, ehSensor = false) {
    const forma = new p2.Circle({ radius: raio });
    const corpo = criarCorpoFisico(x, y, propriedades, forma, label, grupoColisao, mascaraColisao, ehSensor);
    desenharForma(corpo, forma, cor);
    return corpo;
}

function criarRetangulo(x, y, largura, altura, cor, anguloGraus, label, propriedades, grupoColisao, mascaraColisao, ehSensor = false) {
    const forma = new p2.Box({ width: largura, height: altura });
    propriedades.angle = grausParaRadianos(anguloGraus);
    const corpo = criarCorpoFisico(x, y, propriedades, forma, label, grupoColisao, mascaraColisao, ehSensor);
    desenharForma(corpo, forma, cor);
    return corpo;
}

function criarPoligono(x, y, vertices, cor, anguloGraus, label, propriedades, grupoColisao, mascaraColisao, ehSensor = false) {
    const forma = new p2.Convex({ vertices: vertices });
    propriedades.angle = grausParaRadianos(anguloGraus);
    const corpo = criarCorpoFisico(x, y, propriedades, forma, label, grupoColisao, mascaraColisao, ehSensor);
    desenharForma(corpo, forma, cor);
    return corpo;
}

function criarLinha(x, y, comprimento, anguloGraus, cor, espessura, label, propriedades, grupoColisao, mascaraColisao, ehSensor = false) {
    const forma = new p2.Line({ length: comprimento });
    propriedades.angle = grausParaRadianos(anguloGraus);
    const corpo = criarCorpoFisico(x, y, propriedades, forma, label, grupoColisao, mascaraColisao, ehSensor);
    desenharForma(corpo, forma, cor, espessura);
    return corpo;
}

// Criando os objetos do jogo
const jogadorVermelho = criarCirculo(LARGURA / 4, ALTURA / 2, RAIO_JOGADOR, 0xd63031, 'jogadorVermelho', prop.jogador, GRUPO_JOGADORES, GRUPO_BOLA | GRUPO_PAREDES | GRUPO_JOGADORES | GRUPO_OBSTACULOS);
const jogadorAzul = criarCirculo(LARGURA * 3 / 4, ALTURA / 2, RAIO_JOGADOR, 0x0984e3, 'jogadorAzul', prop.jogador, GRUPO_JOGADORES, GRUPO_BOLA | GRUPO_PAREDES | GRUPO_JOGADORES | GRUPO_OBSTACULOS);
const bola = criarCirculo(LARGURA / 2, ALTURA / 2, RAIO_BOLA, 0xffffff, 'bola', prop.bola, GRUPO_BOLA, GRUPO_JOGADORES | GRUPO_PAREDES | GRUPO_TRAVES | GRUPO_OBSTACULOS);

// Paredes
const paredeCima = criarRetangulo(LARGURA / 2, 0, LARGURA, 20, 0x555555, 0, 'paredeCima', prop.parede, GRUPO_PAREDES, GRUPO_BOLA | GRUPO_JOGADORES);
const paredeBaixo = criarRetangulo(LARGURA / 2, ALTURA, LARGURA, 20, 0x555555, 0, 'paredeBaixo', prop.parede, GRUPO_PAREDES, GRUPO_BOLA | GRUPO_JOGADORES);
const paredeEsquerda = criarRetangulo(0, ALTURA / 2, 20, ALTURA, 0x555555, 0, 'paredeEsquerda', prop.parede, GRUPO_PAREDES, GRUPO_BOLA | GRUPO_JOGADORES);
const paredeDireita = criarRetangulo(LARGURA, ALTURA / 2, 20, ALTURA, 0x555555, 0, 'paredeDireita', prop.parede, GRUPO_PAREDES, GRUPO_BOLA | GRUPO_JOGADORES);

// Gols (sensores, ou seja, não há colisão, apenas detectam)
const golEsquerdo = criarRetangulo(10, ALTURA / 2, 1, 150, 0x00ff00, 0, 'golEsquerdo', prop.parede, GRUPO_TRAVES, GRUPO_BOLA, true);
const golDireito = criarRetangulo(LARGURA - 10, ALTURA / 2, 1, 150, 0x00ff00, 0, 'golDireito', prop.parede, GRUPO_TRAVES, GRUPO_BOLA, true);

// Exemplo de novas formas personalizadas
// Triângulo estático no meio do campo
const verticesTriangulo = [[30, 30], [-30, 30], [0, -40]];
criarPoligono(LARGURA / 2 + 100, ALTURA / 2, verticesTriangulo, 0xffff00, 0, 'trianguloCentral', prop.obstaculo, GRUPO_OBSTACULOS, GRUPO_BOLA | GRUPO_JOGADORES);

// Linha estática que atravessa o campo
criarLinha(LARGURA / 2, ALTURA / 4, LARGURA / 2, 90, 0xffd700, 5, 'linhaAmarela', prop.obstaculo, GRUPO_OBSTACULOS, GRUPO_BOLA | GRUPO_JOGADORES);

// --- 3. CONTROLE DOS JOGADORES E LÓGICA DO JOGO ---

const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

const forcaMovimento = 20000;
const VELOCIDADE_CHUTE = 300;
const distanciaMaximaChute = RAIO_JOGADOR + RAIO_BOLA + 5;

// Função auxiliar para normalizar vetor
function normalizarVetor(v) {
    const mag = Math.hypot(v[0], v[1]);
    if (mag > 0) {
        return [v[0] / mag, v[1] / mag];
    }
    return [0, 0];
}

// Função auxiliar para aplicar movimento
function aplicarMovimento(jogador, cima, baixo, esquerda, direita) {
    let dir = [0, 0];
    if (keys[cima]) dir[1] -= 1;
    if (keys[baixo]) dir[1] += 1;
    if (keys[esquerda]) dir[0] -= 1;
    if (keys[direita]) dir[0] += 1;

    dir = normalizarVetor(dir);

    jogador.applyForce([dir[0] * forcaMovimento, dir[1] * forcaMovimento]);
}

// Loop principal do jogo
app.ticker.add(() => {
    world.step(1 / 60);

    // Jogador Vermelho (setas)
    aplicarMovimento(jogadorVermelho, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright');

    // Jogador Azul (WASD)
    aplicarMovimento(jogadorAzul, 'w', 's', 'a', 'd');

    // Função genérica de chute
    function tentarChutar(jogador, tecla) {
        if (!keys[tecla]) return;

        const dx = bola.position[0] - jogador.position[0];
        const dy = bola.position[1] - jogador.position[1];
        const distancia = Math.hypot(dx, dy);

        if (distancia < distanciaMaximaChute) {
            let direcaoChute = normalizarVetor([dx, dy]);

            const chuteVetor = [
                direcaoChute[0] * VELOCIDADE_CHUTE,
                direcaoChute[1] * VELOCIDADE_CHUTE
            ];
            p2.vec2.copy(bola.velocity, chuteVetor);
        }
    }

    // Chutes
    tentarChutar(jogadorVermelho, 'x');
    tentarChutar(jogadorAzul, 'm');

    // Atualizar sprites
    world.bodies.forEach(corpo => {
        const sprite = corposVisuais[corpo.id];
        if (sprite) {
            sprite.x = corpo.position[0];
            sprite.y = corpo.position[1];
            sprite.rotation = corpo.angle;
        }
    });
});

// Evento de colisão para marcar gols
world.on('beginContact', function (evt) {
    const bodyA = evt.bodyA;
    const bodyB = evt.bodyB;

    if (bodyA.label === 'bola' && bodyB.label === 'golEsquerdo') {
        console.log('Gol do time Azul!');
        golsAzul++;
        atualizaPlacar();
        reiniciaJogo();
    } else if (bodyA.label === 'bola' && bodyB.label === 'golDireito') {
        console.log('Gol do time Vermelho!');
        golsVermelho++;
        atualizaPlacar();
        reiniciaJogo();
    }
});

// Reiniciar o jogo
function reiniciaJogo() {
    const resetar = (corpo, x, y) => {
        corpo.position = [x, y];
        corpo.velocity = [0, 0];
        corpo.angularVelocity = 0;
    };

    resetar(jogadorVermelho, LARGURA / 4, ALTURA / 2);
    resetar(jogadorAzul, LARGURA * 3 / 4, ALTURA / 2);
    resetar(bola, LARGURA / 2, ALTURA / 2);
}
