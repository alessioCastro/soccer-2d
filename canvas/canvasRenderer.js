// canvasRenderer.js
export class CanvasRenderer {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.canvas = canvas;
    }

    clear(color = '#0b0b0b') {
        const { ctx, canvas } = this;
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    drawShape(shape, style) {
        if (!shape.isVisible) return;
        const ctx = this.ctx;
        ctx.save();

        // aplica transformações do shape pai
        ctx.translate(shape.position.x, shape.position.y);
        ctx.rotate(shape.rotation);

        // 1) constrói o path da forma principal
        ctx.beginPath();
        this._buildPathLocal(shape);

        // 2) aplica estilo da forma principal (fill/stroke)
        this._applyStyle(shape, style);

        // 3) cria máscara de clipping
        ctx.clip();

        // 4) se imagem deve vir antes dos filhos
        if (shape.image && (shape.imageZIndex ?? 0) <= 0) {
            this._drawImage(shape);
        }

        // 5) desenha filhos dentro do clipping
        for (const child of shape.children) {
            ctx.save();
            ctx.translate(child.localPosition.x, child.localPosition.y);
            ctx.rotate(child.localRotation);
            this._drawPrimitiveLocal(child, child.renderStyle ?? null);
            this._drawChildrenRecursive(child);
            ctx.restore();
        }

        // 6) se imagem deve vir depois dos filhos
        if (shape.image && (shape.imageZIndex ?? 0) > 0) {
            this._drawImage(shape);
        }

        ctx.restore();
    }

    _buildPathLocal(shape) {
        const ctx = this.ctx;
        if (shape.type === 'circle') {
            ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
        } else if (shape.type === 'rect') {
            const x = -shape.width / 2;
            const y = -shape.height / 2;
            const r = Math.max(0, Math.min(shape.borderRadius, Math.min(shape.width, shape.height) / 2));
            this.roundRect(ctx, x, y, shape.width, shape.height, r);
        } else if (shape.type === 'triangle') {
            const { width: w, height: h } = shape;
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(-w / 2, h / 2);
            ctx.lineTo(w / 2, h / 2);
            ctx.closePath();
        } else if (shape.type === 'line') {
            const { start, end } = shape;
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
        }
    }

    _applyStyle(shape, style) {
        const ctx = this.ctx;
        const fill = style?.fill ?? shape.fill ?? '#dddddd';
        const stroke = style?.stroke ?? shape.stroke ?? '#333';
        const lineWidth = style?.lineWidth ?? shape.strokeWidth ?? 2;
        const fillAlpha = style?.fillAlpha ?? shape.fillAlpha ?? 1.0;
        const strokeAlpha = style?.strokeAlpha ?? shape.strokeAlpha ?? 1.0;

        if (fillAlpha > 0) {
            ctx.globalAlpha = fillAlpha;
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (strokeAlpha > 0 && lineWidth > 0) {
            ctx.globalAlpha = strokeAlpha;
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = stroke;
            ctx.stroke();
        }
    }

    _drawImage(shape) {
        const ctx = this.ctx;
        const img = shape.image;
        const w = shape.width ?? (shape.radius * 2);
        const h = shape.height ?? (shape.radius * 2);

        let drawW, drawH;

        if (shape.imageMode === 'stretch') {
            drawW = w;
            drawH = h;
        } else if (shape.imageMode === 'cover') {
            const scale = Math.max(w / img.width, h / img.height);
            drawW = img.width * scale;
            drawH = img.height * scale;
        } else if (shape.imageMode === 'contain') {
            const scale = Math.min(w / img.width, h / img.height);
            drawW = img.width * scale;
            drawH = img.height * scale;
        } else if (shape.imageMode === 'original') {
            drawW = img.width;
            drawH = img.height;
        }

        drawW *= shape.imageScale;
        drawH *= shape.imageScale;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(
            img,
            -drawW / 2 + shape.imageOffset.x,
            -drawH / 2 + shape.imageOffset.y,
            drawW,
            drawH
        );
        ctx.restore();
    }

    _drawChildrenRecursive(shape) {
        const ctx = this.ctx;
        if (!shape.children || shape.children.length === 0) return;
        for (const child of shape.children) {
            ctx.save();
            ctx.translate(child.localPosition.x, child.localPosition.y);
            ctx.rotate(child.localRotation);
            this._drawPrimitiveLocal(child, child.renderStyle ?? null);
            this._drawChildrenRecursive(child);
            ctx.restore();
        }
    }

    _drawPrimitiveLocal(shape, style) {
        const ctx = this.ctx;

        const fill = style?.fill ?? shape.fill ?? '#dddddd';
        const stroke = style?.stroke ?? shape.stroke ?? '#333';
        const lineWidth = style?.lineWidth ?? shape.strokeWidth ?? 2;
        const fillAlpha = style?.fillAlpha ?? shape.fillAlpha ?? 1.0;
        const strokeAlpha = style?.strokeAlpha ?? shape.strokeAlpha ?? 1.0;

        ctx.beginPath();

        if (shape.type === 'circle') {
            ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
        } else if (shape.type === 'rect') {
            const x = -shape.width / 2;
            const y = -shape.height / 2;
            const r = Math.max(0, Math.min(shape.borderRadius, Math.min(shape.width, shape.height) / 2));
            this.roundRect(ctx, x, y, shape.width, shape.height, r);
        } else if (shape.type === 'triangle') {
            const { width: w, height: h } = shape;
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(-w / 2, h / 2);
            ctx.lineTo(w / 2, h / 2);
            ctx.closePath();
        } else if (shape.type === 'line') {
            const { start, end, thickness, roundBorder } = shape;
            ctx.lineCap = roundBorder ? 'round' : 'butt';
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);

            if (strokeAlpha > 0) {
                ctx.globalAlpha = strokeAlpha;
                ctx.lineWidth = thickness;
                ctx.strokeStyle = stroke ?? fill;
                ctx.stroke();
            }
            return;
        }

        if (fillAlpha > 0) {
            ctx.globalAlpha = fillAlpha;
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (strokeAlpha > 0 && lineWidth > 0) {
            ctx.globalAlpha = strokeAlpha;
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = stroke;
            ctx.stroke();
        }
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}