import { SVGNode } from "./svgnode";
import * as PIXI from "pixi.js";

export class SVGGroup extends PIXI.Container {
	/**
	 * Create Container from svg subnode of 'g'
	 * @class
	 * @public
	 * @param {SVGElement} svg
	 */
	constructor(svg, options, root = undefined, id = -1) {
		super();
		this.options = options;
		this.dataNode = svg;
		this.type = svg.nodeName.toLowerCase();
		this.name = svg.getAttribute("id") || "";
		this.root = root;
		this.nodeId = id;
	}

	fillShapes(style, matrix) {}

	parseChildren(...args) {
		SVGNode.prototype.parseChildren.call(this, ...args);
	}
}
