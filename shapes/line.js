import { Shape } from './base.js';
import { vec } from '../utils/math.js';

export class Line extends Shape {
    constructor({
        start = vec(),
        end = vec(100, 0),
        thickness = 3,
        roundBorder = false,
        ...rest
    }) {
        super({ type: 'line', position: vec(), rotation: 0, ...rest });
        this.start = start;
        this.end = end;
        this.thickness = thickness;
        this.roundBorder = roundBorder;
    }
}