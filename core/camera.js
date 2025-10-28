import { lerp } from "../utils/math.js";

export class Camera {
    constructor({ x = 0, y = 0, zoom = 1, mapWidth, mapHeight, canvas }) {
        this.position = { x, y };
        this.prevPosition = { x, y }; // 🔑 posição anterior
        this.zoom = zoom;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.canvas = canvas;
    }

    follow(target, player, dt) {
        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
    
        const targetPos = target.shape.position;
        const playerPos = player.shape.position;
    
        const halfW = (this.canvas.width / 2) / this.zoom;
        const halfH = (this.canvas.height / 2) / this.zoom;
    
        // alvo inicial = bola
        let desiredX = targetPos.x;
        let desiredY = targetPos.y;
    
        // margem de segurança (jogador não pode sair dessa área)
        const marginX = halfW * 0.7; // 70% da tela
        const marginY = halfH * 0.7;
    
        // se o jogador sair da safe zone, ajustamos a câmera
        if (playerPos.x < desiredX - marginX) desiredX = playerPos.x + marginX;
        if (playerPos.x > desiredX + marginX) desiredX = playerPos.x - marginX;
        if (playerPos.y < desiredY - marginY) desiredY = playerPos.y + marginY;
        if (playerPos.y > desiredY + marginY) desiredY = playerPos.y - marginY;
    
        // limitar ao mapa
        desiredX = Math.max(halfW, Math.min(this.mapWidth - halfW, desiredX));
        desiredY = Math.max(halfH, Math.min(this.mapHeight - halfH, desiredY));
    
        // suavização
        const speed = 8;
        const t = 1 - Math.exp(-speed * dt);
    
        this.position.x = lerp(this.position.x, desiredX, t);
        this.position.y = lerp(this.position.y, desiredY, t);
    }

    begin(ctx, pos = this.position) {
        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-pos.x, -pos.y);
    }

    end(ctx) {
        ctx.restore();
    }
}