const countSliderValues = [500, 1000, 2000, 4000, 8000];
const sizeSliderValues = [4, 8, 16, 32];

if (document.body.clientWidth < 650) {
	document.getElementById("emojiSizeSlider").value = 1;
}

let allRanges = document.querySelectorAll(".rangeWrap");
allRanges.forEach(wrap => {
	let slider = wrap.querySelector(".slider");
	let bubble = wrap.querySelector(".bubble");
	slider.addEventListener("input", () => {
		updateBubble(slider, bubble, false);
	});
	updateBubble(slider, bubble);
});

window.addEventListener("resize", function() {
	allRanges.forEach(wrap => {
		let slider = wrap.querySelector(".slider");
		let bubble = wrap.querySelector(".bubble");
		updateBubble(slider, bubble, true);
		if (document.body.clientWidth < 650) {
			document.getElementById("emojiSizeSlider").value = 1;
		} else {
			document.getElementById("emojiSizeSlider").value = 2;
		}
	})
})

function updateBubble(slider, bubble, resize) {
	// change bubble location
	var val = countSliderValues[slider.value];
	let prop = (slider.value/slider.max);
	let x = prop * (slider.clientWidth-19) + 11;
	if (slider.id == "emojiSizeSlider") {
		val = sizeSliderValues[slider.value] + "px";
	}
	bubble.innerHTML = val;
	bubble.style.left = x + "px";

	// update background color
	let leftColor = "#ffc83d";
	let rightColor = "black";
	let gradient = `linear-gradient(to right, ${leftColor} 0%, ${leftColor} ${prop*100}%, ${rightColor} ${prop*100}%, ${rightColor} 100%)`;
	slider.style.background = gradient;

	// update display
	if (!resize) {
		displayImage();
	}
}

function displayImage()
{
	document.getElementById("downloadButton").disabled = true;
	let filesSelected = document.getElementById("imgInput").files;

	if (filesSelected.length > 0)
	{
		let fileToLoad = filesSelected[0];
		let fileReader = new FileReader();
		fileReader.readAsDataURL(fileToLoad);

		fileReader.onload = function(e) {
			let image = document.createElement("img");
			image.src = e.target.result;
			image.onload = function() {
				let dimensions = getImageSize(image);
				document.getElementById("imgDisplay").style.maxWidth = "none";
				document.getElementById("imgDisplay").style.width = dimensions[0] + "px";
				document.getElementById("imgDisplay").style.height = dimensions[1] + "px";
				document.getElementById("imgDisplay").innerHTML = "";
				document.getElementById("imgDisplay").appendChild(image);
				image.style.width = "100%";
				image.style.height = "100%";
			}
			document.getElementById("emojifyButton").disabled = false;
		}
	}
}

function getImageSize(image)
{
	let emojiCount = countSliderValues[document.getElementById("emojiCountSlider").value];
	let emojiSize = sizeSliderValues[document.getElementById("emojiSizeSlider").value];
	let imageWidth = image.width;
	let imageHeight = image.height;
	let factor = Math.sqrt((imageWidth*imageHeight) / (emojiCount));
	let w = Math.round(imageWidth/factor) * emojiSize;
	let h = Math.round(imageHeight/factor) * emojiSize;
	return [w, h];
}

async function loadRef(source)
{
	const lines = await fetch(source).then(response => response.text().then(text => text.split(/\r|\n/)));
	return lines;
}

async function getSlices(url, ref, idx, draw)
{
	let response = await fetch(url);
	response.blob().then(function(blob) {
		//var nums = [];
		for (var i = 0; i < idx.length; i++) {
			let t = i;
			let slice = blob.slice(idx[i]*2, idx[i]*2+2);
			let blobReader = new FileReader();
			blobReader.readAsArrayBuffer(slice);
			blobReader.onload = function(e) {
				let buffer = new Int8Array(blobReader.result);
				let n = buffer[0]*256 + buffer[1];
				if (buffer[1] < 0) {
					draw(ref[n+256], t);
				} else {
					draw(ref[n], t);
				}
			}
		}
	});
}

function emojify()
{
	// check that files are selected
	var filesSelected = document.getElementById("imgInput").files;
	if (filesSelected.length === 0) {
		return;
	}
	var imageFile = filesSelected[0];

	// create template canvas
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	// load image
	var fileReader = new FileReader();
	fileReader.readAsDataURL(imageFile);

	fileReader.onload = function(e) {
		var image = new Image();
		image.src = e.target.result;

		// resize image
		const pixelCount = countSliderValues[document.getElementById("emojiCountSlider").value];
		const scaleFactor = Math.sqrt((image.width * image.height) / pixelCount);
		canvas.width = Math.round(image.width / scaleFactor);
		canvas.height = Math.round(image.height / scaleFactor);
		context.drawImage(image, 0, 0, canvas.width, canvas.height);

		// get data from template canvas
		const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

		// create new canvas
		var c = document.createElement("canvas");
		var ctx = c.getContext("2d");
		const emojiSize = sizeSliderValues[document.getElementById("emojiSizeSlider").value];
		c.width = canvas.width * emojiSize;
		c.height = canvas.height * emojiSize;

		// black background color
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, c.width, c.height);

		// array of pixel indices
		let levels = 128;
		var idx = [];
		for (var i = 0; i < canvas.height; i++) {
			for (var j = 0; j < canvas.width; j++) {
				let k = i*canvas.width + j;
				let r = Math.floor(data[k*4]*levels/256);
				let g = Math.floor(data[k*4+1]*levels/256);
				let b = Math.floor(data[k*4+2]*levels/256);
				idx[k] = r*levels**2 + g*levels + b;
			}
		}

		// load reference and draw images
		const nrefSrc = "https://raw.githubusercontent.com/samwang2002/emojify/master/nref.txt";
		const crefSrc = "https://raw.githubusercontent.com/samwang2002/emojify/master/cref" + levels + ".bin";
		var loadedCount = 0;
		loadRef(nrefSrc)
		.then(ref => getSlices(crefSrc, ref, idx, function(filename, index) {
			// load emoji
			let emoji = new Image();
			emoji.src = "emojis/" + filename;
			emoji.onload = function() {
				// draw emoji
				let x = emojiSize * (index%canvas.width);
				let y = emojiSize * Math.floor(index/canvas.width);
				ctx.drawImage(emoji, x, y, emojiSize, emojiSize);
				loadedCount++;
				if (loadedCount == idx.length) {
					document.getElementById("downloadButton").disabled = false;
				}
			}
		}));

		// replace image with canvas
		document.getElementById("imgDisplay").innerHTML = "";
		document.getElementById("imgDisplay").appendChild(c);
	};
}

function downloadImage()
{
	let canvas = document.getElementById("imgDisplay").childNodes[0];
	let url = canvas.toDataURL("image/png");
	console.log(url);

	// create invisible download link
	let downloadLink = document.createElement("a");
	downloadLink.setAttribute("download", "image.png");
	downloadLink.setAttribute("href", url);
	downloadLink.click();
}