import { SVGNode } from "./svgnode";

/**
 * @typedef {Object} DefaultOptions
 * @property {number} [lineWidth] default stroke thickness (must be greater or equal of 1)
 * @property {number} [lineColor] default stroke color
 * @property {number} [lineOpacity] default stroke opacity
 * @property {number} [fillColor] default fill color
 * @property {number} [fillOpacity] default fill opacity
 * @property {boolean} [unpackTree] unpack node tree, otherwise build single Graphics
 * @property {boolean} [pallete] generate palette texture instead using vertex filling, faster colors changings without rebuilding
 * @property {boolean} [use32Indexes] use 32 index buffer insteand of 16
 */

const DEFAULT = {
	unpackTree: false,
	lineColor: 0,
	lineOpacity: 1,
	fillColor: 0,
	fillOpacity: 1,
	lineWidth: 1,
	palette: false,
	use32Indexes: false
};

export class SVG extends SVGNode {
	/**
	 * Create Graphics from svg
	 * @class
	 * @public
	 * @param {SVGElement | string} svg
	 * @param {DefaultOptions} options
	 */
	constructor(svg, options = DEFAULT) {
		if (!(svg instanceof SVGElement)) {
			const container = document.createElement("div");
			container.innerHTML = svg;

			//@ts-ignore
			svg = container.children[0];
			if (!(svg instanceof SVGElement)) {
				throw new Error("invalid SVG!");
			}
		}

		super(svg, Object.assign({}, DEFAULT, options || {}));

		SVG.CHILD_ID = -1;

		this.root = this;
		this.type = "svg";

		//@ts-ignore
		this.parseChildren(svg.children);

		if (this.palette) {
			this.palette.commit();
		}

		SVG.CHILD_ID = -1;
	}
}

//ID interator
SVG.CHILD_ID = -1;
SVG.nextID = function() {
	return SVG.CHILD_ID++;
};
