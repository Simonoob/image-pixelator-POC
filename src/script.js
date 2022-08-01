import './style.css'
import fragmentShader from './shaders/fragment.glsl'
import GlslCanvas from 'glslCanvas'

import defaultTexture from '../static/images/placeholder.png'

const shaderContainer = document.querySelector('div.shader')
const img = shaderContainer.querySelector('img')
const canvas = document.createElement('canvas')
canvas.getContext('webgl', {preserveDrawingBuffer: true})  //needed to capture images
const sandbox = new GlslCanvas(canvas)
window.GlslCanvas = sandbox
shaderContainer.append(canvas)

const defaultParams = {
	blocks: 23,
	texture: defaultTexture,
}

const modifiedPixels = {}


const updateCustomTextureUniform = ({
    x,
    y,
    r,
    g,
    b,
    a
}) => {

    const dataArray = window.customTextureData

    const blocks = {
        x: sandbox.uniforms.u_blocks.value[0][0],
        y: sandbox.uniforms.u_blocks.value[0][1]
    }
    
    const selectedBlockIndex = dataArray.length - (blocks.x * 4 * y) - (blocks.x - x) * 4

    dataArray[selectedBlockIndex] = r
    dataArray[selectedBlockIndex+1] = g
    dataArray[selectedBlockIndex+2] = b
    dataArray[selectedBlockIndex+3] = a

    loadCustomTexture(dataArray)
}


const loadCustomTexture = (data) => {
    const blocks = {
        x: sandbox.uniforms.u_blocks.value[0][0],
        y: sandbox.uniforms.u_blocks.value[0][1]
    }
    const gl = sandbox.gl
    const options = {}
    options.level = 0;
    options.width = blocks.x;
    options.height = blocks.y;
    options.format = gl.RGBA;
    options.type = gl.UNSIGNED_BYTE;
    options.filtering = 'nearest'

    window.customTextureData = data

    sandbox.uniformTexture('u_texture_modifications', {data: data, width: options.width, height: options.height}, options)
}

/*
 * Pass in an array of rgba
 */
function textureFromFloats() {
    // RGBA/UNSIGNED_BYTE pixels
    const blocks = {
        x: sandbox.uniforms.u_blocks.value[0][0],
        y: sandbox.uniforms.u_blocks.value[0][1]
    }
    var data = new Uint8Array(blocks.x * blocks.y * 4);
    for (let pixel = 0; pixel <= Math.ceil(blocks.x * blocks.y * 4); pixel+=4) {
        const getRandomColorValue = () => Math.random() * 100
        data[pixel] = getRandomColorValue()
        data[pixel+1] = getRandomColorValue()
        data[pixel+2] = getRandomColorValue()
        data[pixel+3] = getRandomColorValue()
    }

    loadCustomTexture(data)


    updateCustomTextureUniform({
            x: 1,
            y: 1,
            r: 255,
            g: 0,
            b: 0,
            a: 255,
    })
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

    textureFromFloats()
}

const initCanvas = async () => {
	sandbox.load(fragmentShader)
    setBlocks(defaultParams.blocks)
	await updateTextureUniform(defaultParams.texture)
	shaderContainer.classList.add('loaded')
    console.log(sandbox)
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
	.addEventListener('change', e => {
        setBlocks(e.target.value)
    })

document.querySelector('#blocksInputValue').addEventListener('change', e => setBlocks(e.target.value > 100 ? 100 : e.target.value))

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
        x: rect.width  / Math.ceil(blocks[0]),
        y: rect.height  / Math.ceil(blocks[1]),
    }
    const selectedBlock = {
        x: Math.min(Math.floor(x/blockSize.x), Math.ceil(blocks[0]-1)),
        y: Math.min(Math.floor(y/blockSize.y), Math.ceil(blocks[1]-1))
    }


    sandbox.setUniform('u_customBlock', selectedBlock.x, selectedBlock.y)


    updateCustomTextureUniform({
            x: selectedBlock.x,
            y: selectedBlock.y,
        color:{
            r: 255,
            g: 0,
            b: 0,
            a: 255,
        }
    })

}

canvas.addEventListener("mousemove", (e)=>{
    if(e.buttons !== 1) return
    setPoint(e)
});

canvas.addEventListener("mousedown", (e)=>setPoint(e));