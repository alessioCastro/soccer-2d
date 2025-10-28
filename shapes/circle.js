import { Shape } from './base.js';
import { vec } from '../utils/math.js';

export class Circle extends Shape {
    constructor({
        position = vec(),
        radius = 10,
        ...rest // pega fill, stroke, etc. do base
    }) {
        super({ type: 'circle', position, rotation: 0, ...rest });
        this.radius = radius;
    }
}