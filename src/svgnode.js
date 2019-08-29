import tcolor from "tinycolor2";
import dPathParse from "d-path-parser";

import * as PIXI from "pixi.js";

import { SVG } from "./svg";
import { SVGGroup } from "./svggroup";
import { parseSvgStyle, parseSvgTransform, arcToBezier } from "./utils";
import { Pallete } from "./pallete";

const EPS = 0.0001;
const tmpPoint = new PIXI.Point();

/**
 * @typedef {Object} DefaultOptions
 * @property {number} [lineWidth] default stroke thickness (must be greater or equal of 1)
 * @property {number} [lineColor] default stroke color
 * @property {number} [lineOpacity] default stroke opacity
 * @property {number} [fillColor] default fill color
 * @property {number} [fillOpacity] default fill opacity
 * @property {boolean} [unpackTree] unpack node tree, otherwise build single Graphics
 * @property {boolean} [pallete] generate palette texture instead using vertex filling, faster colors changings without rebuilding
 */

export class SVGNode extends PIXI.Graphics {
	/**
	 * Create Graphics from svg subnode
	 * @class
	 * @public
	 * @param {SVGElement} svg
	 * @param {DefaultOptions} options
	 */
	constructor(svg, options, root = undefined, id = -1) {
		super();
		this.options = options;
		this.dataNode = svg;
		this.type = svg.nodeName.toLowerCase();
		this.root = root;
		this.nodeId = id;
	}

	/**
	 * Get `GraphicsData` under cursor if available. Similar as `containsPoint`, but return internal `GraphicsData`
	 * @public
	 * @method SVG#pickGraphicsData
	 * @param {PIXI.Point} point - global point for intersection checking
	 * @param {boolean} all - Include all intersected, otherwise first selected if exist
	 * @return {Array<PIXI.GraphicsData>}  list of selected GraphicsData, can be empty or grater that 1
	 */
	pickGraphicsData(point, all) {
		let picked = [];

		point = this.worldTransform.applyInverse(point);

		//@ts-ignore
		const graphicsData = this.geometry.graphicsData;

		for (let i = 0; i < graphicsData.length; ++i) {
			const data = graphicsData[i];

			if (!data.fillStyle.visible || !data.shape) {
				continue;
			}
			if (data.matrix) {
				data.matrix.applyInverse(point, tmpPoint);
			} else {
				tmpPoint.copyFrom(point);
			}

			if (data.shape.contains(tmpPoint.x, tmpPoint.y)) {
				let skip = false;
				if (data.holes) {
					for (let i = 0; i < data.holes.length; i++) {
						const hole = data.holes[i];
						if (hole.shape.contains(tmpPoint.x, tmpPoint.y)) {
							skip = true;
							break;
						}
					}
				}

				if (!skip) {
					if (!all) {
						return [data];
					} else {
						picked.push(data);
					}
				}
			}
		}

		return picked;
	}

	/**
	 * Create a PIXI Graphic from SVG elements
	 * @private
	 * @method SVG#svgChildren
	 * @param {Array<*>} children - Collection of SVG nodes
	 * @param {*} [parentStyle=undefined] Whether to inherit fill settings.
	 * @param {PIXI.Matrix} [parentMatrix=undefined] Matrix fro transformations
	 */
	parseChildren(children, parentStyle, parentMatrix) {
		for (let i = 0; i < children.length; i++) {
			const child = children[i];

			const nodeStyle = parseSvgStyle(child);
			const matrix = parseSvgTransform(child);
			const nodeType = child.nodeName.toLowerCase();

			/**
			 * @type {SVG | SVGNode}
			 */
			let shape = this;

			if (this.options.unpackTree) {
				//@ts-ignore
				shape = nodeType === "g" ? new SVGGroup(child, this.options,  this.nodeId + 1) : new SVGNode(child, this.options, this.nodeId + 1);
			}

			//compile full style inherited from all parents
			const fullStyle = Object.assign({}, parentStyle || {}, nodeStyle);

			shape.fillShapes(fullStyle, matrix);

			switch (nodeType) {
				case "path": {
					shape.svgPath(child);
					break;
				}
				case "line": {
					this.svgLine(child);
					break;
				}
				case "circle":
				case "ellipse": {
					shape.svgCircle(child);
					break;
				}
				case "rect": {
					shape.svgRect(child);
					break;
				}
				case "polygon": {
					shape.svgPoly(child, true);
					break;
				}
				case "polyline": {
					shape.svgPoly(child, false);
					break;
				}
				case "g": {
					break;
				}
				default: {
					// @if DEBUG
					console.info("[SVGUtils] <%s> elements unsupported", child.nodeName);
					// @endif
					break;
				}
			}

			shape.parseChildren(child.children, fullStyle, matrix);
			if (this.options.unpackTree) {
				shape.name = child.getAttribute("id") || "child_" + i;
				this.addChild(shape);
			}
		}
	}

	/**
	 * Convert the Hexidecimal string (e.g., "#fff") to uint
	 * @private
	 * @method SVG#hexToUint
	 */
	hexToUint(hex) {
		if (hex === undefined || hex === null) return;

		if (hex[0] === "#") {
			// Remove the hash
			hex = hex.substr(1);

			// Convert shortcolors fc9 to ffcc99
			if (hex.length === 3) {
				hex = hex.replace(/([a-f0-9])/gi, "$1$1");
			}
			return parseInt(hex, 16);
		} else {
			const rgb = tcolor(hex).toRgb();

			return (rgb.r << 16) + (rgb.g << 8) + rgb.b;
		}
	}

	/**
	 * Render a <line> element
	 * @private
	 * @method SVG#svgLine
	 * @param {SVGCircleElement} node
	 */
	svgLine(node) {
		const x1 = parseFloat(node.getAttribute("x1"));
		const y1 = parseFloat(node.getAttribute("y1"));
		const x2 = parseFloat(node.getAttribute("x2"));
		const y2 = parseFloat(node.getAttribute("y2"));

		//idiot chek
		if (Math.abs(x1 - x2) + Math.abs(y1 - y2) <= EPS) return;

		this.moveTo(x1, y1);
		this.lineTo(x2, y2);
	}

	/**
	 * Render a <ellipse> element or <circle> element
	 * @private
	 * @method SVG#svgCircle
	 * @param {SVGCircleElement} node
	 */
	svgCircle(node) {
		let heightProp = "r";
		let widthProp = "r";
		const isEllipse = node.nodeName === "ellipse";
		if (isEllipse) {
			heightProp += "y";
			widthProp += "x";
		}
		const width = parseFloat(node.getAttribute(widthProp));
		const height = parseFloat(node.getAttribute(heightProp));
		const cx = node.getAttribute("cx") || "0";
		const cy = node.getAttribute("cy") || "0";
		let x = 0;
		let y = 0;
		if (cx !== null) {
			x = parseFloat(cx);
		}
		if (cy !== null) {
			y = parseFloat(cy);
		}
		if (!isEllipse) {
			this.drawCircle(x, y, width);
		} else {
			this.drawEllipse(x, y, width, height);
		}
	}

	/**
	 * Render a <rect> element
	 * @private
	 * @method SVG#svgRect
	 * @param {SVGRectElement} node
	 */
	svgRect(node) {
		const x = parseFloat(node.getAttribute("x")) || 0;
		const y = parseFloat(node.getAttribute("y")) || 0;
		const width = parseFloat(node.getAttribute("width"));
		const height = parseFloat(node.getAttribute("height"));
		const rx = parseFloat(node.getAttribute("rx"));
		if (rx) {
			this.drawRoundedRect(x, y, width, height, rx);
		} else {
			this.drawRect(x, y, width, height);
		}
	}

	/**
	 * Render a polyline element.
	 * @private
	 * @method SVG#svgPoly
	 * @param {SVGPolylineElement} node
	 */
	svgPoly(node, close) {
		const pointsAttr = node.getAttribute("points");
		const pointsRaw = pointsAttr.split(/[ ,]/g);
		const points = pointsRaw.reduce((acc, p) => (p && acc.push(parseFloat(p)), acc), []);
		this.drawPolygon(points);
		if (!close) {
			//@ts-ignore
			const gd = this.geometry.graphicsData;
			//@ts-ignore
			gd[gd.length - 1].shape.closeStroke = false;
		}
	}

	/**
	 * Set the fill and stroke style.
	 * @private
	 * @method SVG#fillShapes
	 * @param {*} style
	 * @param {PIXI.Matrix} matrix
	 */
	fillShapes(style, matrix) {
		const { fill, opacity, stroke, strokeWidth, strokeOpacity, fillOpacity } = style;

		const isStrokable = stroke !== undefined && stroke !== "none" && stroke !== "transparent";
		const isFillable = fill !== undefined && fill !== "none" && fill !== "transparent";

		const defaultLineWidth = isStrokable ? this.options.lineWidth || 1 : 0;
		const lineWidth = strokeWidth !== undefined ? Math.max(0.5, parseFloat(strokeWidth)) : defaultLineWidth;
		const lineColor = isStrokable ? this.hexToUint(stroke) : this.options.lineColor;

		let strokeOpacityValue = 0;
		let fillOpacityValue = 0;

		if (isStrokable) {
			strokeOpacityValue =
				opacity || strokeOpacity ? parseFloat(opacity || strokeOpacity) : this.options.lineOpacity;
		}
		if (isFillable) {
			fillOpacityValue = opacity || fillOpacity ? parseFloat(opacity || fillOpacity) : this.options.fillOpacity;
		}

		const usePalllete = this.options.pallete && this.root && this.id > -1;

		if(!usePalllete) {
			if (fill) {
				if (!isFillable) {
					this.beginFill(0, 0);
				} else {
					this.beginFill(this.hexToUint(fill), fillOpacityValue);
				}
			} else {
				this.beginFill(this.options.fillColor, 1);
			}
			this.lineStyle(lineWidth, lineColor, strokeOpacityValue);

		} else {

			/**
			 * @type {Pallete}
			 */
			const p = this.root.palette;
			if(!p.getStyle(this.id)) {
				const hex = isFillable ? this.hexToUint(fill) : 0;
				const style = {
					fill : {
						color : hex,
						alpha : isFillable ?  fillOpacityValue : 0
					},
					stroke :{
						color : lineColor,
						alpha : strokeOpacityValue,
						width : lineWidth / 10 // use global defenition of initial width
					}
				};
				p.setStyle(this.id, style);
			}

			const fillTexture = this.root.palette.getFillTexture(this.id);
			const strokeTexture = this.root.palette.getStrokeTexture(this.id);
			
			//width from texture not supported now

			this.lineTextureStyle(lineWidth, strokeTexture, 0xffffff, 1);
			this.beginTextureFill(fillTexture, 0xffffff, 1);
		}

		this.setMatrix(matrix);
	}

	/**
	 * Render a <path> d element
	 * @method SVG#svgPath
	 * @param {SVGPathElement} node
	 */
	svgPath(node) {
		const d = node.getAttribute("d");
		let x = 0,
			y = 0;
		let iX = 0,
			iY = 0;
		const commands = dPathParse(d);
		let prevCommand = undefined;

		for (var i = 0; i < commands.length; i++) {
			const command = commands[i];

			switch (command.code) {
				case "m": {
					this.moveTo((x += command.end.x), (y += command.end.y));
					(iX = x), (iY = y);
					break;
				}
				case "M": {
					this.moveTo((x = command.end.x), (y = command.end.y));
					(iX = x), (iY = y);
					break;
				}
				case "H": {
					this.lineTo((x = command.value), y);
					break;
				}
				case "h": {
					this.lineTo((x += command.value), y);
					break;
				}
				case "V": {
					this.lineTo(x, (y = command.value));
					break;
				}
				case "v": {
					this.lineTo(x, (y += command.value));
					break;
				}
				case "Z":
				case "z": {
					//jump corete to first point
					(x = iX), (y = iY);
					this.closePath();
					break;
				}
				case "L": {
					const { x: nx, y: ny } = command.end;

					if (Math.abs(x - nx) + Math.abs(y - ny) <= EPS) {
						(x = nx), (y = ny);
						break;
					}

					this.lineTo((x = nx), (y = ny));
					break;
				}
				case "l": {
					const { x: dx, y: dy } = command.end;

					if (Math.abs(dx) + Math.abs(dy) <= EPS) {
						(x += dx), (y += dy);
						break;
					}

					this.lineTo((x += dx), (y += dy));
					break;
				}
				//short C, selet cp1 from last command
				case "S": {
					let cp1 = { x, y };
					let cp2 = command.cp;

					//S is compute points from old points
					if (prevCommand.code == "S" || prevCommand.code == "C") {
						const lc = prevCommand.cp2 || prevCommand.cp;
						cp1.x = 2 * prevCommand.end.x - lc.x;
						cp1.y = 2 * prevCommand.end.y - lc.y;
					} else {
						cp1 = cp2;
					}

					this.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, (x = command.end.x), (y = command.end.y));
					break;
				}
				case "C": {
					const cp1 = command.cp1;
					const cp2 = command.cp2;

					this.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, (x = command.end.x), (y = command.end.y));
					break;
				}
				//diff!!
				//short C, select cp1 from last command
				case "s": {
					const currX = x;
					const currY = y;

					let cp1 = { x, y };
					let cp2 = command.cp;

					//S is compute points from old points
					if (prevCommand.code == "s" || prevCommand.code == "c") {
						const lc = prevCommand.cp2 || prevCommand.cp;
						cp1.x = prevCommand.end.x - lc.x;
						cp1.y = prevCommand.end.y - lc.y;
					} else {
						this.quadraticCurveTo(currX + cp2.x, currY + cp2.y, (x += command.end.x), (y += command.end.y));
						break;
					}

					this.bezierCurveTo(
						currX + cp1.x,
						currY + cp1.y,
						currX + cp2.x,
						currY + cp2.y,
						(x += command.end.x),
						(y += command.end.y)
					);
					break;
				}
				case "c": {
					const currX = x;
					const currY = y;
					const cp1 = command.cp1;
					const cp2 = command.cp2;

					this.bezierCurveTo(
						currX + cp1.x,
						currY + cp1.y,
						currX + cp2.x,
						currY + cp2.y,
						(x += command.end.x),
						(y += command.end.y)
					);
					break;
				}
				case "t": {
					let cp = command.cp || { x, y };
					let prevCp = { x, y };

					if (prevCommand.code != "t" || prevCommand.code != "q") {
						prevCp = prevCommand.cp || prevCommand.cp2 || prevCommand.end;
						cp.x = prevCommand.end.x - prevCp.x;
						cp.y = prevCommand.end.y - prevCp.y;
					} else {
						this.lineTo((x += command.end.x), (y += command.end.y));
						break;
					}

					const currX = x;
					const currY = y;

					this.quadraticCurveTo(currX + cp.x, currY + cp.y, (x += command.end.x), (y += command.end.y));
					break;
				}
				case "q": {
					const currX = x;
					const currY = y;

					this.quadraticCurveTo(
						currX + command.cp.x,
						currY + command.cp.y,
						(x += command.end.x),
						(y += command.end.y)
					);
					break;
				}

				case "T": {
					let cp = command.cp || { x, y };
					let prevCp = { x, y };

					if (prevCommand.code != "T" || prevCommand.code != "Q") {
						prevCp = prevCommand.cp || prevCommand.cp2 || prevCommand.end;
						cp.x = 2 * prevCommand.end.x - prevCp.x;
						cp.y = 2 * prevCommand.end.y - prevCp.y;
					} else {
						this.lineTo((x = command.end.x), (y = command.end.y));
						break;
					}

					this.quadraticCurveTo(cp.x, cp.y, (x = command.end.x), (y = command.end.y));
					break;
				}

				case "Q": {
					let cp = command.cp;
					this.quadraticCurveTo(cp.x, cp.y, (x = command.end.x), (y = command.end.y));
					break;
				}

				//arc as bezier
				case "a":
				case "A": {
					const currX = x;
					const currY = y;

					if (command.relative) {
						x += command.end.x;
						y += command.end.y;
					} else {
						x = command.end.x;
						y = command.end.y;
					}
					const beziers = arcToBezier({
						x1: currX,
						y1: currY,
						rx: command.radii.x,
						ry: command.radii.y,
						x2: x,
						y2: y,
						phi: command.rotation,
						fa: command.large,
						fs: command.clockwise
					});
					for (let b of beziers) {
						this.bezierCurveTo(b[2], b[3], b[4], b[5], b[6], b[7]);
					}
					break;
				}
				default: {
					console.info("[SVGUtils] Draw command not supported:", command.code, command);
				}
			}

			//save previous command fro C S and Q
			prevCommand = command;
		}
	}
}
