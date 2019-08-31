import { pixi as PIXI } from "../extends";

const TMP_STYLE = {
	fill: { color: 0, alpha: 1 },
	stroke: { color: 0, alpha: 0, width: 0 }
};

const PIXEL_STRID = 4;

/**
 *
 * @param {number} index
 * @param {Uint8ClampedArray} arr
 */
function colorFromArray(index, arr) {
	const r = (arr[index + 0] << 16) & 0xff0000;
	const g = (arr[index + 1] << 8) & 0xff00;
	const b = arr[index + 2];

	return r + g + b;
}

/**
 *
 * @param {number} color
 * @param {number} index
 * @param {Uint8ClampedArray} arr
 */
function colorToArray(color, alpha, index, arr) {
	const r = (color >> 16) & 0xff;
	const g = (color >> 8) & 0xff;
	const b = color & 0xff;

	arr[index] = r;
	arr[index + 1] = g;
	arr[index + 2] = b;
	arr[index + 3] = (alpha * 255) | 0;
}

class StyleDefenition {
	constructor(id, texture) {
		this.fill = {
			color: 0,
			alpha: 1
		};

		this.stroke = {
			color: 0,
			alpha: 0,
			width: 0
		};

		let hw = texture.width / PIXEL_STRID;

		const x = PIXEL_STRID * (id % hw);
		const y = (id / hw) | 0;

		// single pixel for fill (color + alpha), 2 pixels for stroke (color + alpha, width)
		this.fillTexture = new PIXI.Texture(texture, new PIXI.Rectangle(x + 0.25, y + 0.25, 0.5, 0.5));
		this.strokeTexture = new PIXI.Texture(texture, new PIXI.Rectangle(x + 1 + 0.25, y + 0.25, 0.5, 0.5));

		this.id = id;
		this.palleteX = x;
		this.palleteY = y;

		this._dirty = true;
	}
}

export class Pallete {
	constructor(owner = undefined, size = 256) {
		const canvas = document.createElement("canvas");

		canvas.width = canvas.height = size;

		this._styles = new Map();
		this._ctx = canvas.getContext("2d");
		this._data = undefined;

		this._texture = PIXI.BaseTexture.from(canvas, {
			scaleMode: PIXI.SCALE_MODES.NEAREST
		});

		this.owner = owner;
		this.size = size;
	}

	get texture() {
		return this._texture;
	}

    nextID() {
        const id = this._styles.size;
        return id;
    }
	/**
	 * Get style from pallete
	 * @param {number} id - style ID
	 */
	getStyle(id) {
		if (id === undefined) {
			return;
		}

		const def = this._styles.get(id);
		if (!def) {
			return;
		}

		// prefer direct change
		Object.assign(TMP_STYLE.fill, def.fill);
		Object.assign(TMP_STYLE.stroke, def.stroke);

		return TMP_STYLE;
	}

	/**
	 * Get texture for filling, represent pixel on pallete texture
	 * @param {number} id
	 */
	getFillTexture(id) {
		const def = this._styles.get(id);

		if (!def) {
			return undefined;
		}

		return def.fillTexture;
	}

	/**
	 * Get texture for stroking, represent 2 pixel on pallete texture
	 * @param {number} id
	 */
	getStrokeTexture(id) {
		const def = this._styles.get(id);

		if (!def) {
			return undefined;
		}

		return def.strokeTexture;
	}

	/**
	 * Set style by id
	 * @param {number} id
	 * @param {*} style
	 * @param {*} immediate - set style and coomit to pallete texture
	 */
	setStyle(id, style, immediate = false) {		
        if(id === undefined || id < 0) {
            id = this.nextID();
        }

        if (!style || (!style.fill && !style.stroke)) {
			return undefined;
		}

		if (id > (this.size * this.size) / PIXEL_STRID) {
			return undefined;
		}

		if (!this._data) {
			this._data = this._ctx.getImageData(0, 0, this.size, this.size);
		}

		let styleDef = this._styles.get(id);
		if (!styleDef) {
			styleDef = new StyleDefenition(id, this._texture);
			this._styles.set(id, styleDef);
		}

		Object.assign(styleDef.fill, style.fill || {}, styleDef.fill);
		Object.assign(styleDef.stroke, style.stroke || {}, styleDef.stroke);

		styleDef._dirty = true;

		const block = this._data.data;
		const dataIndex = id * PIXEL_STRID * 4;

		//fill data
		colorToArray(styleDef.fill.color, styleDef.fill.alpha, dataIndex, block);

		//stroke and width data
		colorToArray(styleDef.stroke.color, styleDef.stroke.alpha, dataIndex + 4, block);
		block[dataIndex + 4 + 4] = (styleDef.stroke.width * 255) | 0;
        block[dataIndex + 4 + 4 + 1] = (styleDef.stroke.aligment * 255) | 0;
		block[dataIndex + 4 + 4 + 3] = 255;

		if (immediate) {
			this.commit();
		}

		return id;
	}

	/**
	 * Commit changes to pallete
	 * @param {boolean} force - forcing update
	 */
	commit(force = false) {
		if (!this._data) {
			return;
		}

		let needUpdate = force;
		const defs = this._styles.values();

		for (let d of defs) {
			needUpdate = needUpdate || d._dirty;
			d._dirty = false;
		}

		if (needUpdate) {
			this._ctx.putImageData(this._data, 0, 0);
			this._texture.update();
		}
	}

	/**
	 * Destroy pallete
	 */
	destroy() {
		for (let d of this._styles.values()) {
			d.texture.destroy();
		}

		this._styles = undefined;
		this._data = undefined;
		this._ctx = undefined;
		this._texture.destroy();
		this._destroyed = true;
	}
}
