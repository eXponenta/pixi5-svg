
import * as PIXI from "pixi.js"

export class FilledGeometry extends PIXI.GraphicsGeometry {
	
	addUvs(verts, uvs, texture, start, size, matrix)
    {
        let index = 0;
        const uvsStart = uvs.length;
        
		let w = texture.frame.width;
		let h = texture.frame.height;
		
		let maxX = -Infinity, minX = Infinity;
		let maxY = -Infinity, minY = Infinity;
		
		while (index < size)
        {
            let x = verts[(start + index) * 2];
            let y = verts[((start + index) * 2) + 1];
			
			maxX = Math.max(x, maxX);
			minX = Math.min(x, minX);

			maxY = Math.max(y, maxY);
			minY = Math.min(y, minY);
			
			index ++;
		}

		index = 0;
        while (index < size)
        {
            let x = verts[(start + index) * 2];
            let y = verts[((start + index) * 2) + 1];

            if (matrix)
            {
                const nx = (matrix.a * x) + (matrix.c * y) + matrix.tx;

                y = (matrix.b * x) + (matrix.d * y) + matrix.ty;
                x = nx;
            }

            index++;

			x =  (x - minX) / (maxX - minX);
			y =	 (y - minY) / (maxY - minY);

            uvs.push(x, y);
        }

        const baseTexture = texture.baseTexture;

        if (w < baseTexture.width
            || h < baseTexture.height)
        {
            this.adjustUvs(uvs, texture, uvsStart, size);
        }
    }
}