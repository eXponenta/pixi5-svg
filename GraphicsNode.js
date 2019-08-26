export class GraphicsNode extends Path2D {
	constructor() {
		super();

		this.name = "";
		this.style = {
			fill: {
				color: 0xffffff,
				opacity: 1
			},
			stroke: {
				color: 0xffffff,
				width: 0,
				alpha: 1
			}
		};

		this._matrix = new DOMMatrix();
	}

	addChild(...childs) {
		let l = childs.length;

		for (let i = 0; i < l; i++) {
			let index = this.children.indexOf(childs[i]);
			if (index > 0) {
				continue;
			}

			this.children.push(childs[i]);
		}
	}

	removeChild(...childs) {
		let l = childs.length;

		for (let i = 0; i < l; i++) {
			let index = this.children.indexOf(childs[i]);
			if (index > 0) {
				this.children = this.children.splice(index, i);
			}
		}
	}

	drawEllipse(x, y, width, height) {
		this.ellipse(x, y, width, height, 0, 0, Math.PI * 2);

		return this;
	}

	drawCircle(x, y, r) {
		this.drawEllipse(x, y, r, r);

		return this;
	}

	drawRoundedRect(x, y, width, height, radius = 5) {
		const ctx = this;

		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();

		return this;
	}

	drawRect(x, y, width, height) {
		this.rect(x, y, width, height);

		return this;
	}

	/**
	 *
	 * @param {number[]} points
	 * @param {boolean} [close]
	 */
	drawPolygon(points, close = true) {
		const ctx = this;

		ctx.moveTo(points[0], points[1]);

		let l = points.length;

		for (let i = 2; i < l; i += 2) {
			ctx.lineTo(points[i], points[i + 1]);
		}

		if (close) ctx.closePath();

		return this;
	}

	beginFill(color = 0, alpha = 1) {
		const fill = this.style.fill;

		fill.color = color;
		fill.opacity = alpha;

		return this;
	}

	lineStyle(width = 0, color = 0xfffff, alpha = 1) {
		const stroke = this.style.stroke;

		stroke.alpha = alpha;
		stroke.color = color;
		stroke.width = width;

		return this;
	}

	setMatrix(matrix) {
		this._matrix = matrix;

		return this;
    }
    
    /**
     * Draw self into context
     * @param {CanvasRenderingContext2D} context 
     */
    draw( context ) {

    }
}
