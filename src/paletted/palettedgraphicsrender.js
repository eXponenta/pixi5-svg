import { pixi } from "./../extends";

class PalettedShaderGenerator {
	/**
	 * @param {string} vertexSrc - Vertex shader
	 * @param {string} fragTemplate - Fragment shader template
	 */
	constructor(vertexSrc, fragTemplate) {
		this.vertexSrc = vertexSrc;
		this.fragTemplate = fragTemplate;
		this.programCache = {};
		this.defaultGroupCache = {};
	}

	generateShader(maxTextures) {
		if (!this.programCache[maxTextures]) {
			const sampleValues = new Int32Array(maxTextures);
			const sampleSizeValues = new Float32Array(maxTextures);

			for (let i = 0; i < maxTextures; i++) {
				sampleValues[i] = i;
			}

			this.defaultGroupCache[maxTextures] = pixi.UniformGroup.from(
				{
					uSamplers: sampleValues,
					uSamplersSize: sampleSizeValues
				},
				true
			);

			let fragmentSrc = this.fragTemplate;
			let vertexSrc = this.vertexSrc;

			vertexSrc = vertexSrc.replace(/%count%/gi, `${maxTextures}`);
			fragmentSrc = fragmentSrc.replace(/%count%/gi, `${maxTextures}`);
			vertexSrc = vertexSrc.replace(/%data_loop%/gi, this.generateSampleSrc(maxTextures));

			this.programCache[maxTextures] = new pixi.Program(vertexSrc, fragmentSrc);
		}
		const uniforms = {
			tint: new Float32Array([1, 1, 1, 1]),
			translationMatrix: new pixi.Matrix(),
			uSamplersSize: new Float32Array(maxTextures),
			default: this.defaultGroupCache[maxTextures]
		};

		return new pixi.Shader(this.programCache[maxTextures], uniforms);
	}

	generateSampleSrc(maxTextures) {
		let src = "\n\n";
		for (let i = 0; i < maxTextures; i++) {
            
            if (i > 0) {
				src += "\nelse ";
			}
            
            if (i < maxTextures - 1) {
				src += `if(aTextureId < ${i}.5)`;
			}
            
            src += `{
                vStrokeColor = texture2D(uSamplers[${i}], pS);
                vStrokeData.yz = texture2D(uSamplers[${i}], pD).xy;
                vFillColor = texture2D(uSamplers[${i}], p);
            }`;
		}
		src += "\n";
		src += "\n";
		return src;
	}
}

const vertex = `
	precision highp float;
	attribute vec2 aVertexPosition;
	attribute vec2 aTextureCoord;
	attribute vec4 aColor;
	attribute float aTextureId;

	uniform mat3 projectionMatrix;
	uniform mat3 translationMatrix;
	uniform vec4 tint;
	uniform float uSamplersSize[%count%];
	uniform sampler2D uSamplers[%count%];

	varying vec2 vTextureCoord;
	varying vec4 vColor;
	varying float vTextureId;
	varying vec4 vFillColor;
	varying vec4 vStrokeColor;
	varying vec4 vStrokeData;

	const vec4 cColor2ID = vec4(0., 256. * 255., 255., 0.);

	void main(void){
		gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

		float shapeId = dot(aColor, cColor2ID);
        highp int textureId = int(vTextureId);
        
        //какие-то проблемы с рендерерром

		float size = 1./128.;//uSamplersSize[textureId];
		float hsize = size * 4.;

		vStrokeData = vec4(aColor.r, 0., 0., 0.);
		
		vec2 p = size * ( 0.5 + vec2(4. * mod(shapeId, 1. / hsize), floor(shapeId * hsize)));
        vec2 pS = p + vec2(1. * size, 0.);
        vec2 pD = p + vec2(2. * size, 0.);
        
		%data_loop%

		vTextureCoord = aTextureCoord;
		vTextureId = aTextureId;
		vColor = tint;
	}
`;

const fragment = `
	varying vec2 vTextureCoord;
	varying vec4 vColor;
	varying float vTextureId;
	varying vec4 vFillColor;
	varying vec4 vStrokeColor;
	varying vec4 vStrokeData;

	uniform sampler2D uSamplers[%count%];

	void main(void){

        vec2 uv = vTextureCoord;
        
        float width = vStrokeData.y;
        float align = vStrokeData.z;
        float factor = abs (uv.y - .5) * 2.;
        float gap = max(.075, width * 0.1) ;
        
        vec4 stroke = vStrokeColor;
        stroke *= 1. - smoothstep(width - gap, width  + gap, factor);
        
		gl_FragColor = vColor * mix(vFillColor, stroke, vStrokeData.r);
	}
`;

const { premultiplyBlendMode } = pixi.utils;

const { settings, BaseTexture } = pixi;

export class PalettedGraphicsRenderer extends pixi.AbstractBatchRenderer {
	constructor(renderer) {
		super(renderer);

		this.shaderGenerator = new PalettedShaderGenerator(vertex, fragment);
		this.geometryClass = pixi.BatchGeometry;
		this.vertexSize = 6;
	}

	flush() {
		if (this._vertexCount === 0) {
			return;
		}

		const attributeBuffer = this.getAttributeBuffer(this._vertexCount);
		const indexBuffer = this.getIndexBuffer(this._indexCount);

		const {
			_bufferedElements: elements,
			_drawCalls: drawCalls,
			MAX_TEXTURES,
			_packedGeometries: packedGeometries,
			vertexSize
		} = this;

		const touch = this.renderer.textureGC.count;

		let index = 0;
		let _indexCount = 0;

		let nextTexture;
		let currentTexture;
		let textureCount = 0;

		let currentGroup = drawCalls[0];
		let groupCount = 0;

		let blendMode = -1; // blend-mode of previous element/sprite/object!

		currentGroup.textureCount = 0;
		currentGroup.start = 0;
		currentGroup.blend = blendMode;

		let TICK = ++BaseTexture._globalBatch;
		let i;

		for (i = 0; i < this._bufferSize; ++i) {
			const sprite = elements[i];

			elements[i] = null;
			nextTexture = sprite._texture.baseTexture;

			const spriteBlendMode = premultiplyBlendMode[nextTexture.premultiplyAlpha ? 1 : 0][sprite.blendMode];

			if (blendMode !== spriteBlendMode) {
				blendMode = spriteBlendMode;

				// force the batch to break!
				currentTexture = null;
				textureCount = MAX_TEXTURES;
				TICK++;
			}

			if (currentTexture !== nextTexture) {
				currentTexture = nextTexture;

				if (nextTexture._batchEnabled !== TICK) {
					if (textureCount === MAX_TEXTURES) {
						TICK++;

						textureCount = 0;

						currentGroup.size = _indexCount - currentGroup.start;

						currentGroup = drawCalls[groupCount++];
						currentGroup.textureCount = 0;
						currentGroup.blend = blendMode;
						currentGroup.start = _indexCount;
					}

					nextTexture.touched = touch;
					nextTexture._batchEnabled = TICK;
					nextTexture._id = textureCount;

					currentGroup.textures[currentGroup.textureCount++] = nextTexture;
					textureCount++;
				}
			}

			this.packInterleavedGeometry(sprite, attributeBuffer, indexBuffer, index, _indexCount);

			// push a graphics..
			index += (sprite.vertexData.length / 2) * vertexSize;
			_indexCount += sprite.indices.length;
		}

		BaseTexture._globalBatch = TICK;
		currentGroup.size = _indexCount - currentGroup.start;

		if (!settings.CAN_UPLOAD_SAME_BUFFER) {
			/* Usually on iOS devices, where the browser doesn't
            like uploads to the same buffer in a single frame. */
			if (this._packedGeometryPoolSize <= this._flushId) {
				this._packedGeometryPoolSize++;
				packedGeometries[this._flushId] = new this.geometryClass();
			}

			packedGeometries[this._flushId]._buffer.update(attributeBuffer.rawBinaryData, 0);
			packedGeometries[this._flushId]._indexBuffer.update(indexBuffer, 0);

			this.renderer.geometry.bind(packedGeometries[this._flushId]);
			this.renderer.geometry.updateBuffers();
			this._flushId++;
		} else {
			// lets use the faster option, always use buffer number 0
			packedGeometries[this._flushId]._buffer.update(attributeBuffer.rawBinaryData, 0);
			packedGeometries[this._flushId]._indexBuffer.update(indexBuffer, 0);

			this.renderer.geometry.updateBuffers();
		}

		this._processDraw(drawCalls, groupCount);
		// reset elements for the next flush
		this._bufferSize = 0;
		this._vertexCount = 0;
		this._indexCount = 0;
	}

	_processDraw(drawCalls, groupCount) {
		const gl = this.renderer.gl;
		const textureSystem = this.renderer.texture;
		const stateSystem = this.renderer.state;
		const shaderSystem = this.renderer.shader;
		const shader = this._shader;
		const uSamplersSize = this._shader.uniforms.uSamplersSize;

		// Upload textures and do the draw calls
		for (let i = 0; i < groupCount; i++) {
			const group = drawCalls[i];
			const groupTextureCount = group.textureCount;

			for (let j = 0; j < groupTextureCount; j++) {
				const base = group.textures[j];

				uSamplersSize[j] = 1 / base.width;
				textureSystem.bind(base, j);
				group.textures[j] = null;
			}

			shaderSystem.syncUniformGroup(shader.uniformGroup);
			stateSystem.setBlendMode(group.blend);
			gl.drawElements(group.type, group.size, gl.UNSIGNED_SHORT, group.start * 2);
		}
	}
}
