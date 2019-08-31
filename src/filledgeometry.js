import { pixi } from "./extends";

export class FilledGeometry extends pixi.GraphicsGeometry {
	constructor(use32 = false) {
		super();
		this._use32 = use32;
	}

	addUvs(verts, uvs, texture, start, size, matrix) {
		const uvsStart = uvs.length;
		const baseTexture = texture.baseTexture;
		const w = texture.frame.width,
			h = texture.frame.height,
			fx = texture.frame.x,
			fy = texture.frame.y,
			bw = baseTexture.width,
			bh = baseTexture.height;

		let index = 0;
		let maxX = -Infinity,
			minX = Infinity;
		let maxY = -Infinity,
			minY = Infinity;

		while (index < size) {
			let x = verts[(start + index) * 2];
			let y = verts[(start + index) * 2 + 1];

			maxX = x > maxX ? x : maxX;
			minX = x < minX ? x : minX;

			maxY = y > maxY ? y : maxY;
			minY = y < minY ? y : minY;

			index++;
		}

		index = 0;
		while (index < size) {
			let x = verts[(start + index) * 2];
			let y = verts[(start + index) * 2 + 1];

			if (matrix) {
				const nx = matrix.a * x + matrix.c * y + matrix.tx;

				y = matrix.b * x + matrix.d * y + matrix.ty;
				x = nx;
			}

			index++;

			x = fx + (w * (x - minX)) / (maxX - minX);
			y = fy + (h * (y - minY)) / (maxY - minY);

			x /= bw;
			y /= bh;

			uvs.push(x, y);
		}
	}

	buildDrawCalls() {
		super.buildDrawCalls();

		if (this._use32 && this.indices.length > 0xffff) {
			this._indexBuffer.update(new Uint32Array(this.indices));
		}
	}
}
