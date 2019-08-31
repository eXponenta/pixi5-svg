import { pixi } from "./../extends";
import { FilledGeometry } from "../filledgeometry";
import { Pallete } from "./pallete";

export class PalletedGraphics extends PIXI.Graphics {
    constructor(pallete) {
        super(new FilledGeometry());

        this.palletIDs = [];
        this.pluginName = "palletedGraphics";

		this._pallete = pallete || new Pallete(this, 64);
        this._currentStyleId = undefined;
    }

    beginFill(color = 0, alpha = 1) {
        const nextId = this._pallete.setStyle(undefined, {
            fill : {
                color,
                alpha
            }
        }, false);

        const fillTexture = this._pallete.getFillTexture(nextId);

        //store ID as color =)
        this.beginTextureFill(fillTexture, nextId);
        this._currentStyleId = nextId;
        this.palletIDs.push(nextId);

        return this;
    }

    lineStyle(width = 0, color = 0, alpha = 1, aligment = 0, native = false) {
        const id = this._pallete.setStyle(this._currentStyleId, {
            stroke: {
                color,
                alpha,
                width :  Math.max(0, width),
                aligment
            }
        }, false);

        const strokeTexture = this._pallete.getStrokeTexture(id);
		
        //store ID as color =)
        this.lineTextureStyle(width, strokeTexture, id | 0xff0000, 1, undefined, 0);
        //reset current style id 
        this._currentStyleId = undefined;

        return this;
    }

    endFill() {
        this._pallete.commit();
        return super.endFill();
    }
}