## PIXIv5 SVG support

This is hybrid of [pixi-svg](https://github.com/bigtimebuddy/pixi-svg), [pixi-svg-graphics](https://github.com/saschagehlich/pixi-svg-graphics) and more fixes and adaptations for pixi v5
### Version support
    
Pixi v5.1.1 or greater

## Preview
Test it in [LIVE](https://github.com/eXponenta/pixi5-svg-examples/live.html)

### Supported Features

Only supports a subset of SVG's feature. Current this includes:

SVG Elements:
* `path`
    * M, L, H, V, S, C, T, Q, Z - fully
    * A - partial, large sweep flag is ignored. ARC transforms to multiple bezier curves
* `circle`
* `ellipse`
* `rect`
* `line`
* `polygon`
* `polyline`
* `g`

Style attributes with the following properties (inlcude inline styles):
* `stroke`
* `stroke-opacity`
* `stroke-width`
* `fill`
* `fill-opacity`
* `opacity`

Transforms:
* `matrix`
* `translate`
* `rotate`
* `scale`

## Features
* Support all exists path commands with maximum similarity of SVG, exclude arc large sweep (you can send PR for it)
* Style inheritance from `g`
* Support single graphics
* Support SVG tree unpacking (with options `unpackTree`)
* Support node picking in single mode
* Support `SVGElement` or raw text of svg

## Problems
* Selfcrossed shapes not supports yet in PIXI.Graphics
* Large sweep flags not supported yet (i don't know why it isn't works)
* Because text node cannot support on single graphics mode, it's ignores always
* Mitter limit can't supported in PIXI yet
* Bounds calculation is incorect https://github.com/pixijs/pixi.js/pull/5991
## Usage

Install `npm install pixi5-svg`

Use:
```
import Svg from "pixi5-svg"

const svgText = '.....';
const options = {/* see DefaultOptions */}
const svg = new Svg(svgText, options);


```

Examples : https://github.com/eXponenta/pixi5-svg-examples

Demo: https://exponenta.github.io/pixi5-svg-examples/
Live: https://exponenta.github.io/pixi5-svg-examples/live.html


### Alternatives

https://github.com/bigtimebuddy/pixi-svg

https://github.com/saschagehlich/pixi-svg-graphics