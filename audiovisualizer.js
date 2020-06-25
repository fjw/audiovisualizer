"use strict";

const defaultOptions = {
    background: "rgb(0, 0, 128)",

    lineWidth: 6,
    strokeStyle: "rgb(0,  88, 255)",

    rowsPerSec: 40
};

class AudioVisualizer {

    _v = []; // list of visualizations

    constructor(options) {

        // --- AudioContext ---
        var actx = new (window.AudioContext || window.webkitAudioContext)();
        getStreamSource(actx, options.src).then(source => {

            console.log(source);

            var analyser = actx.createAnalyser();
            source.connect(analyser);
            /*
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
             */
            analyser.smoothingTimeConstant = 0.8; //todo cfg
            analyser.fftSize = 4096; //todo cfg
            var bufferLength = analyser.frequencyBinCount;
            var dataArray = new Uint8Array(bufferLength);

            var thereIsASpectrum = false;

            options.v.forEach(o => {

//todo: check required options
                var vv = {}
                vv.options = o;

                if(!o.container) {
                    console.error("no container set.")
                    return;
                }

                if(o.type === "spectrum") {
                    thereIsASpectrum = true;
                    vv.lag = 0;
                }

                var cnvandctx = createCanvasInContainer(o.container);
                vv.cnv = cnvandctx.cnv;
                vv.ctx = cnvandctx.ctx;
                vv.ctx.fillStyle = o.background || defaultOptions.background;
                vv.ctx.fillRect(0,0, vv.cnv.width, vv.cnv.height);

                vv.colormap = prepareColorMap(o.colormap);

                this._v.push(vv);
            });

            var nlCnv, nlCtx, nlImageData;
            if(thereIsASpectrum) {
                // Initialize SpectrumOnlyStuff
                nlCnv = document.createElement("canvas");
                nlCnv.width = bufferLength;
                nlCnv.height = 1;
                nlCtx = nlCnv.getContext("2d");
                nlImageData = new ImageData(new Uint8ClampedArray(new ArrayBuffer(bufferLength * 4)), bufferLength, 1);
            }

            // timing
            var last = Date.now();

            // ------- loop --------
            var draw = () => {

                // timing
                var current = Date.now(),
                    elapsed = current - last;
                last = current;

                this._v.forEach(v => {

                    if(v.options.type === "spectrum") {

                        var rowsPerSec = v.options.rowsPerSec || defaultOptions.rowsPerSec;
                        v.lag += rowsPerSec * (elapsed / 1000);

                        if (v.lag > 1) {
                            var rowsToRender = Math.floor(v.lag);
                            v.lag -= rowsToRender;

                            analyser.getByteFrequencyData(dataArray);
                            updateSpectrum(v, bufferLength, dataArray, elapsed, nlImageData, nlCnv, nlCtx, rowsToRender);
                        }


                    } else if(v.options.type === "waveform") {

                        analyser.getByteTimeDomainData(dataArray);
                        updateWaveform(v, bufferLength, dataArray);

                    }

                });

                requestAnimationFrame(draw);

            };
            // -------

            draw();
        });

    }

}

function prepareColorMap(colormap) {
    return [[  0,   0, 128], [  0,   0, 131], [  0,   0, 135], [  0,   0, 139],
        [  0,   0, 143], [  0,   0, 147], [  0,   0, 151], [  0,   0, 155],
        [  0,   0, 159], [  0,   0, 163], [  0,   0, 167], [  0,   0, 171],
        [  0,   0, 175], [  0,   0, 179], [  0,   0, 183], [  0,   0, 187],
        [  0,   0, 191], [  0,   0, 195], [  0,   0, 199], [  0,   0, 203],
        [  0,   0, 207], [  0,   0, 211], [  0,   0, 215], [  0,   0, 219],
        [  0,   0, 223], [  0,   0, 227], [  0,   0, 231], [  0,   0, 235],
        [  0,   0, 239], [  0,   0, 243], [  0,   0, 247], [  0,   0, 251],
        [  0,   0, 255], [  0,   4, 255], [  0,   8, 255], [  0,  12, 255],
        [  0,  16, 255], [  0,  20, 255], [  0,  24, 255], [  0,  28, 255],
        [  0,  32, 255], [  0,  36, 255], [  0,  40, 255], [  0,  44, 255],
        [  0,  48, 255], [  0,  52, 255], [  0,  56, 255], [  0,  60, 255],
        [  0,  64, 255], [  0,  68, 255], [  0,  72, 255], [  0,  76, 255],
        [  0,  80, 255], [  0,  84, 255], [  0,  88, 255], [  0,  92, 255],
        [  0,  96, 255], [  0, 100, 255], [  0, 104, 255], [  0, 108, 255],
        [  0, 112, 255], [  0, 116, 255], [  0, 120, 255], [  0, 124, 255],
        [  0, 128, 255], [  0, 131, 255], [  0, 135, 255], [  0, 139, 255],
        [  0, 143, 255], [  0, 147, 255], [  0, 151, 255], [  0, 155, 255],
        [  0, 159, 255], [  0, 163, 255], [  0, 167, 255], [  0, 171, 255],
        [  0, 175, 255], [  0, 179, 255], [  0, 183, 255], [  0, 187, 255],
        [  0, 191, 255], [  0, 195, 255], [  0, 199, 255], [  0, 203, 255],
        [  0, 207, 255], [  0, 211, 255], [  0, 215, 255], [  0, 219, 255],
        [  0, 223, 255], [  0, 227, 255], [  0, 231, 255], [  0, 235, 255],
        [  0, 239, 255], [  0, 243, 255], [  0, 247, 255], [  0, 251, 255],
        [  0, 255, 255], [  4, 255, 251], [  8, 255, 247], [ 12, 255, 243],
        [ 16, 255, 239], [ 20, 255, 235], [ 24, 255, 231], [ 28, 255, 227],
        [ 32, 255, 223], [ 36, 255, 219], [ 40, 255, 215], [ 44, 255, 211],
        [ 48, 255, 207], [ 52, 255, 203], [ 56, 255, 199], [ 60, 255, 195],
        [ 64, 255, 191], [ 68, 255, 187], [ 72, 255, 183], [ 76, 255, 179],
        [ 80, 255, 175], [ 84, 255, 171], [ 88, 255, 167], [ 92, 255, 163],
        [ 96, 255, 159], [100, 255, 155], [104, 255, 151], [108, 255, 147],
        [112, 255, 143], [116, 255, 139], [120, 255, 135], [124, 255, 131],
        [128, 255, 128], [131, 255, 124], [135, 255, 120], [139, 255, 116],
        [143, 255, 112], [147, 255, 108], [151, 255, 104], [155, 255, 100],
        [159, 255,  96], [163, 255,  92], [167, 255,  88], [171, 255,  84],
        [175, 255,  80], [179, 255,  76], [183, 255,  72], [187, 255,  68],
        [191, 255,  64], [195, 255,  60], [199, 255,  56], [203, 255,  52],
        [207, 255,  48], [211, 255,  44], [215, 255,  40], [219, 255,  36],
        [223, 255,  32], [227, 255,  28], [231, 255,  24], [235, 255,  20],
        [239, 255,  16], [243, 255,  12], [247, 255,   8], [251, 255,   4],
        [255, 255,   0], [255, 251,   0], [255, 247,   0], [255, 243,   0],
        [255, 239,   0], [255, 235,   0], [255, 231,   0], [255, 227,   0],
        [255, 223,   0], [255, 219,   0], [255, 215,   0], [255, 211,   0],
        [255, 207,   0], [255, 203,   0], [255, 199,   0], [255, 195,   0],
        [255, 191,   0], [255, 187,   0], [255, 183,   0], [255, 179,   0],
        [255, 175,   0], [255, 171,   0], [255, 167,   0], [255, 163,   0],
        [255, 159,   0], [255, 155,   0], [255, 151,   0], [255, 147,   0],
        [255, 143,   0], [255, 139,   0], [255, 135,   0], [255, 131,   0],
        [255, 128,   0], [255, 124,   0], [255, 120,   0], [255, 116,   0],
        [255, 112,   0], [255, 108,   0], [255, 104,   0], [255, 100,   0],
        [255,  96,   0], [255,  92,   0], [255,  88,   0], [255,  84,   0],
        [255,  80,   0], [255,  76,   0], [255,  72,   0], [255,  68,   0],
        [255,  64,   0], [255,  60,   0], [255,  56,   0], [255,  52,   0],
        [255,  48,   0], [255,  44,   0], [255,  40,   0], [255,  36,   0],
        [255,  32,   0], [255,  28,   0], [255,  24,   0], [255,  20,   0],
        [255,  16,   0], [255,  12,   0], [255,   8,   0], [255,   4,   0],
        [255,   0,   0], [251,   0,   0], [247,   0,   0], [243,   0,   0],
        [239,   0,   0], [235,   0,   0], [231,   0,   0], [227,   0,   0],
        [223,   0,   0], [219,   0,   0], [215,   0,   0], [211,   0,   0],
        [207,   0,   0], [203,   0,   0], [199,   0,   0], [195,   0,   0],
        [191,   0,   0], [187,   0,   0], [183,   0,   0], [179,   0,   0],
        [175,   0,   0], [171,   0,   0], [167,   0,   0], [163,   0,   0],
        [159,   0,   0], [155,   0,   0], [151,   0,   0], [147,   0,   0],
        [143,   0,   0], [139,   0,   0], [135,   0,   0], [131,   0,   0],
        [  0,   0,   0]];
}

function updateSpectrum(v, bufferLength, dataArray, elapsed, nlImageData, nlCnv, nlCtx, rowsToRender) {

    var w = v.cnv.width;
    var h = v.cnv.height;

    for (var i = 0, di = 0; i < bufferLength * 4; i += 4)
    {

        nlImageData.data[i] = v.colormap[dataArray[di]][0];
        nlImageData.data[i+1] = v.colormap[dataArray[di]][1];
        nlImageData.data[i+2] = v.colormap[dataArray[di]][2];
        nlImageData.data[i+3] = 255;
        di++;
    }

    nlCtx.putImageData(nlImageData, 0, 0);

    var imageData = v.ctx.getImageData(0, 0, w, h);

    v.ctx.putImageData(imageData, 0, rowsToRender);
    v.ctx.drawImage(nlCnv, 0, 0, w, rowsToRender);

}

function updateWaveform(v, bufferLength, dataArray) {

    var w = v.cnv.width;
    var h = v.cnv.height;

    v.ctx.fillStyle = v.options.background || defaultOptions.background;
    v.ctx.fillRect(0, 0, w, h);

    v.ctx.lineWidth = v.options.lineWidth || defaultOptions.lineWidth;
    v.ctx.strokeStyle = v.options.strokeStyle || defaultOptions.strokeStyle;
    v.ctx.beginPath();

    var sliceWidth = w / bufferLength;
    var x = 0;

    for(var i = 0; i < bufferLength; i++) {

        var n = dataArray[i] / 128.0;
        var y = n * h/2;

        if(i === 0) {
            v.ctx.moveTo(x, y);
        } else {
            v.ctx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    v.ctx.lineTo(w, h/2);
    v.ctx.stroke();

}

function createCanvasInContainer(containerquery) {

    const container = document.querySelector(containerquery);

    container.style.position = "relative";
    container.style.overflow = "hidden";

    const cnv = document.createElement("canvas");
    cnv.style.position = "absolute";
    cnv.style.top = "0";
    cnv.style.left = "0";
    cnv.style.width = "100%";
    cnv.style.height = "100%";

    cnv.width = container.clientWidth;
    cnv.height = container.clientHeight;
    const ctx = cnv.getContext("2d");

    container.append(cnv);

    // auf resize reagieren
    var resize_to;
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {

            clearTimeout(resize_to);
            resize_to = setTimeout( () => {
                var img = new Image();
                img.onload = () => {
                    var w = container.clientWidth;
                    var h = container.clientHeight;
                    cnv.width = w;
                    cnv.height = h;
                    ctx.drawImage(img, 0, 0, w, h);
                };
                img.src = cnv.toDataURL();
            }, 200);

        }
    });
    resizeObserver.observe(container);

    return { cnv, ctx };
}

function getStreamSource(actx, src) {
    return new Promise((resolve, reject) => {

        if(!src) {
            // microphone

            navigator.mediaDevices.getUserMedia({audio: true} ).then( stream => {
                resolve(actx.createMediaStreamSource(stream));
            });

        } else {
            // audiourl

            const audio = new Audio(src);
            audio.loop = true;
            audio.crossOrigin = 'anonymous';
            audio.play().then(a => { //todo: geht das ohne play?
                resolve(actx.createMediaElementSource(audio));
            });

        }

    });
}


//module.exports = new AudioVisualizer();

var av = new AudioVisualizer({
    //src: "sinus800hz-10db.mp3",
    v: [
        {
            type: "spectrum",
            container: "#myspectrum",
            background: "red"
        },
        {
            type: "waveform",
            container: "#mywaveform",
        }
    ]
});