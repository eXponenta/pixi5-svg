import { pixi } from "../extends";

export class FilledGeometry extends pixi.GraphicsGeometry {
	constructor(use32 = false) {
		super();
		this._use32 = use32;
	}

    addUvs(verts, uvs, texture, start, size, matrix)
    {        
        let index = 0;
		
        while (index < size)
        {
            let y = (start + index) % 2;
            let x = (start + index) / (start + size);
            uvs.push(x, y);

            index ++;
        }
    }

    isBatchable() {
        return true;
    }

	buildDrawCalls() {
		super.buildDrawCalls();

		if (this._use32 && this.indices.length > 0xffff) {
			this._indexBuffer.update(new Uint32Array(this.indices));
		}
	}
}
