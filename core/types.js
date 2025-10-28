// core/types.js
export class Entity {
    constructor({ id, name, tags = [] }) {
        this.id = id ?? crypto.randomUUID();
        this.name = name ?? this.id;
        this.tags = new Set(tags);
    }
}