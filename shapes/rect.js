import { Shape } from './base.js';
import { vec } from '../utils/math.js';

export class Rect extends Shape {
    constructor({
        position = vec(),
        width = 20,
        height = 10,
        rotation = 0,
        ...rest
    }) {
        super({ type: 'rect', position, rotation, ...rest });
        this.width = width;
        this.height = height;
    }
}