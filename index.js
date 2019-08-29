import { SVG } from "./src/svg";
import { SVGNode } from "./src/svgnode"
import { SVGGroup } from "./src/svggroup"

//faster, better, longer!!
SVGGroup.prototype.parseChildren = SVGNode.prototype.parseChildren;

export {
	SVGNode, SVGGroup
}

export default SVG;