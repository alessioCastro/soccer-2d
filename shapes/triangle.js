import { Shape } from './base.js';
import { vec } from '../utils/math.js';

export class Triangle extends Shape {
    constructor({
        position = vec(),
        width = 20,
        height = 20,
        rotation = 0,
        ...rest
    }) {
        super({ type: 'triangle', position, rotation, ...rest });
        this.width = width;
        this.height = height;
    }
}