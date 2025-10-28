// shapes/base.js
import { vec } from "../utils/math.js";

export class Shape {
    constructor({
        type,
        position = vec(),
        rotation = 0,
        isVisible = true,
        fill = '#dddddd',
        stroke = '#333',
        strokeWidth = 2,
        fillAlpha = 1,
        strokeAlpha = 1,
        borderRadius = 0,

        // 👇 novo
        image = null,          // objeto Image() já carregado
        imageMode = 'cover',   // 'cover' | 'contain' | 'stretch' | 'original'
        imageScale = 1,
        imageOffset = vec(0,0),
        imageZIndex = 0   // 👈 novo: -1 = antes dos filhos, +1 = depois
    }) {
        this.type = type;
        this.position = position;
        this.rotation = rotation;
        this.isVisible = isVisible;

        this.fill = fill;
        this.stroke = stroke;
        this.strokeWidth = strokeWidth;
        this.fillAlpha = fillAlpha;
        this.strokeAlpha = strokeAlpha;
        this.borderRadius = borderRadius;

        this.image = image;
        this.imageMode = imageMode;
        this.imageScale = imageScale;
        this.imageOffset = imageOffset;
        this.imageZIndex = imageZIndex;

        this.localPosition = vec(0, 0);
        this.localRotation = 0;
        this.children = [];
    }

    addChild(shape, { offset = vec(0,0), rotation = 0 } = {}) {
        shape.localPosition = offset;
        shape.localRotation = rotation;
        this.children.push(shape);
        return shape;
    }
}