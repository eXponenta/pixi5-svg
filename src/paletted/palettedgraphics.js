import { pixi } from "../extends";
import { FilledGeometry } from "./filledgeometry";
import { Palette } from "./palette";

export class PalettedGraphics extends pixi.Graphics {
	
	constructor(palette = undefined, use32 = false) {
		super(new FilledGeometry(use32));

		this.init(palette);
	}

	/**
	 * Init 
	 * @param {Palette} [palette] 
	 */
	init(palette = undefined) {		
		this.paletteIDs = [];
		this.pluginName = "palettedGraphics";
		this._palette = palette || new Palette(this, 64);
		this._currentStyleId = undefined;
	}
	
	beginFill(color = 0, alpha = 1) {
		const nextId = this._palette.setStyle(undefined, {
			fill : {
				color,
				alpha
			}
		}, false);

		const fillTexture = this._palette.getFillTexture(nextId);

		//store ID as color =)
		this.beginTextureFill(fillTexture, nextId);
		this._currentStyleId = nextId;
		this.paletteIDs.push(nextId);

		return this;
	}

	lineStyle(width = 0, color = 0, alpha = 1, aligment = 0, native = false) {
		const id = this._palette.setStyle(this._currentStyleId, {
			stroke: {
				color,
				alpha,
				width :  Math.max(0, .8),
				aligment
			}
		}, false);

		const strokeTexture = this._palette.getStrokeTexture(id);
		
		//store ID as color =)
		this.lineTextureStyle(width, strokeTexture, id | 0xff0000, 1, undefined, .5);
		//reset current style id 
		this._currentStyleId = undefined;

		return this;
	}

	endFill() {
		this._palette.commit();
		return super.endFill();
	}

	get palette() {
		return this._palette;
	}
}