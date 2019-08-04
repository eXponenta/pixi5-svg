## PIXIv5 SVG support

This is hybrid of [pixi-svg](https://github.com/bigtimebuddy/pixi-svg), [pixi-svg-graphics](https://github.com/saschagehlich/pixi-svg-graphics) and more fixes and adaptations for pxii v5
### Version support
    
Pixi v5.1.1 or greater

### Supported Features

Only supports a subset of SVG's feature. Current this includes:

SVG Elements:
* \<path>

    * Mm, Ll, Hh, Vv, Ss, Cc, Tt, Qq, Zz - fully
    * Aa - partial, large sweep flag is ignored. ARC transforms to multiple bezier curves
* \<circle>
* \<ellipse>
* \<rect>
* \<line>
* \<polygon>
* \<polyline>
* \<g>

Style attributes with the following properties:
* stroke
* stroke-opacity
* stroke-width
* fill
* fill-opacity
* opacity

Transforms:
* matrix
* translate
* rotate
* scale

## Features
* Support all exists path commands with maximum similarity of SVG, exclude arc large sweep (you can send PR for it)
* Support single graphics
* Support SVG tree unpacking (with options `unpackTree`)
* Support node picking in single mode

### Alternatives

bigtimebuddy/pixi-svg

saschagehlich/pixi-svg-graphics