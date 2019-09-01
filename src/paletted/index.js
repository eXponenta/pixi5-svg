import { Palette } from "./palette";
import { PalettedGraphics } from "./palettedgraphics"
import { PalettedGraphicsRenderer } from "./palettedgraphicsrender"

export {
    Palette, PalettedGraphics, PalettedGraphicsRenderer
}

export function registerPlugin(render) {
    if(!render.registerPlugin) {
        throw new Error("Plugin can't be registered!");
    }
    render.registerPlugin("palettedGraphics", PalettedGraphicsRenderer);
}