import './style.css'
import fragmentShader from './shaders/fragment.glsl'
import GlslCanvas from 'glslCanvas'

import defaultTexture from '../static/images/placeholder.png'

const shaderContainer = document.querySelector('div.shader')
const img = shaderContainer.querySelector('img')
const canvas = document.createElement('canvas')
canvas.getContext('webgl', {preserveDrawingBuffer: true})  //needed to capture images
const sandbox = new GlslCanvas(canvas)
shaderContainer.append(canvas)

const defaultParams = {
	blocks: 36,
	texture: defaultTexture,
}

sandbox.resize = () => {
	const dpi = Math.min(window.devicePixelRatio, 2)
	canvas.width = img.width * dpi
	canvas.height = img.height * dpi
	canvas.style.width = img.width + 'px'
	canvas.style.height = img.height + 'px'
}

function debounce(func, wait, immediate) {
	var timeout

	return function executedFunction() {
		var context = this
		var args = arguments

		var later = function () {
			timeout = null
			if (!immediate) func.apply(context, args)
		}

		var callNow = immediate && !timeout

		clearTimeout(timeout)

		timeout = setTimeout(later, wait)

		if (callNow) func.apply(context, args)
	}
}

const getTextureResolution = dataURL =>
	new Promise(resolve => {
		img.onload = () => {
			resolve({
				x: img.width,
				y: img.height,
			})
		}
		img.src = dataURL
	})
const updateTextureUniform = async url => {
	const textureResolution = await getTextureResolution(url)
	sandbox.setUniform('u_texture', url)
	sandbox.setUniform('u_textureResolution', [
		textureResolution.x,
		textureResolution.y,
	])
	img.src = url
	sandbox.resize()
    setBlocks(document.querySelector('#blocksInputValue').value)
}

const setBlocks = value => {
    if(!value) return
    const blocks = {
        x: Number(value),
        y: Number(value),
    }
    //force block to be squared
    const rect = canvas.getBoundingClientRect()
    const canvasRatio = rect.width/rect.height
    canvasRatio > 1.0 ? blocks.x *= canvasRatio : blocks.y /= canvasRatio
    sandbox.setUniform('u_blocks', blocks.x, blocks.y)
    document.querySelector('#blocksInputRange').value = value
    document.querySelector('#blocksInputValue').value = value
}

const createTexture = ({width, height}) => {
    const buffer = new Uint8ClampedArray(width * height * 4); // have enough bytes

    //fill buffer
    for(var y = 0; y < height; y++) {
        for(var x = 0; x < width; x++) {
            var pos = (y * width + x) * 4; // position in buffer based on x and y
            buffer[pos  ] = 255            // some R value [0, 255]
            buffer[pos+1] = 0              // some G value
            buffer[pos+2] = 0              // some B value
            buffer[pos+3] = 255            // set alpha channel
        }
    }

    //create texture data
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    const iData = ctx.createImageData(width, height) // create imageData object
    iData.data.set(buffer) // set our buffer as source
    ctx.putImageData(iData, 0, 0) // update canvas with new data
    const dataUri = canvas.toDataURL() // produces a PNG file
    
    return dataUri
}

const initCanvas = async () => {
	sandbox.load(fragmentShader)
    setBlocks(defaultParams.blocks)
	await updateTextureUniform(defaultParams.texture)
	// sandbox.setUniform('u_texture_modifications', createTexture({width: 1, height: 1}))
	shaderContainer.classList.add('loaded')
}

initCanvas()

window.addEventListener('resize', function () {
	sandbox.resize()
})

/**
 * Blocks inputs
 */
document
	.querySelector('#blocksInputRange')
	.addEventListener('change', e => setBlocks(e.target.value))

document.querySelector('#blocksInputValue').addEventListener('change', e => setBlocks(e.target.value > 50 ? 50 : e.target.value))

document
	.querySelector('#blocksInputRange')
	.addEventListener(
		'mousedown',
		e =>
			(document.querySelector('#blocksInputValue').value =
				e.target.value),
	)

/**
 * Texture input
 */
document.querySelector('#imageInput').addEventListener('change', async e => {
	await updateTextureUniform(URL.createObjectURL(e.target.files[0]))
})


/**
 * Download image
 */
const downloadBtn = document.querySelector('.downloadImage')
downloadBtn.addEventListener('click', ()=>{
    const link = document.createElement('a')
    const customImagePath = document.querySelector('#imageInput').value
    const getFileExtension = () => {
        switch (customImagePath.split('.').pop()) {
            case 'jpeg':
            case 'jpg':
            case 'png':
                return customImagePath.split('.').pop()
            default:
                return 'png'
        }
    }
    link.download = customImagePath ? `${customImagePath.split("\\").pop().replace(/(\.[^\.]*)$/, '')}_pixelated.${getFileExtension()}` : 'pixelated_image.png'
    link.href = canvas.toDataURL(`image/${getFileExtension()}`)
    link.click()
    link.remove()
})



//set point
const setPoint = (e) =>{
    const rect = e.target.getBoundingClientRect()
    const blocks = sandbox.uniforms.u_blocks.value[0]
    let x = (e.clientX - rect.left)  //x position within the canvas
    let y =  (rect.height + rect.top - e.clientY)  //y position within the canvas and reversed to match other uniforms
    const blockSize = {
        x: rect.width  / blocks[0],
        y: rect.height  / blocks[1],
    }
    const selectedBlock = {
        x: Math.min(Math.floor(x/blockSize.x), blocks[0]-1),
        y: Math.min(Math.floor(y/blockSize.y), blocks[1]-1)
    }
    console.clear()
    console.log({...selectedBlock})
    sandbox.setUniform('u_customBlock', selectedBlock.x, selectedBlock.y)
}

canvas.addEventListener("mousemove", (e)=>{
    if(e.buttons !== 1) return
    setPoint(e)
});

canvas.addEventListener("mousedown", (e)=>setPoint(e));