"use strict";

const defaultOptions = {
    background: "rgb(0, 0, 128)",

    lineWidth: 6,
    strokeStyle: "rgb(0,  128, 255)",

    rowsPerSec: 40,

    //colormap: ["rgb(0, 0, 128)", "rgb(0,88,255)", "rgb(255,0,0)"] todo
    colortheme: [[0, 0, 128], [0, 0, 255], [0,128,255], [0,255,255], [128, 255, 128],
               [255, 255, 0], [255, 128, 0], [255, 0, 0], [128, 0, 0]]

    //colormap: [ [0,0,0], [128,0,0] ]
};

export class AudioVisualizer {

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
                    vv.colormap = prepareColorMap(o.colortheme || defaultOptions.colortheme);
                }

                var cnvandctx = createCanvasInContainer(o.container);
                vv.cnv = cnvandctx.cnv;
                vv.ctx = cnvandctx.ctx;
                vv.ctx.fillStyle = o.background || defaultOptions.background;
                vv.ctx.fillRect(0,0, vv.cnv.width, vv.cnv.height);

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


function cssColorToArray(color) {
    //todo:
}

function colorsInBetween(color1, color2, amount) { //todo docs lastone not included

    const distancesRGB = [
        Math.abs(color2[0] - color1[0]),
        Math.abs(color2[1] - color1[1]),
        Math.abs(color2[2] - color1[2])
    ];

    const stepsRGB = [
        distancesRGB[0] / amount,
        distancesRGB[1] / amount,
        distancesRGB[2] / amount
    ];

    const directionRGB = [
        Math.sign(color2[0] - color1[0]),
        Math.sign(color2[1] - color1[1]),
        Math.sign(color2[2] - color1[2])
    ];

    var colorsInBetween = [];

    for(var i = 0; i < amount; i++) {
        colorsInBetween.push([
            Math.round(color1[0] + (i * stepsRGB[0] * directionRGB[0]) ),
            Math.round(color1[1] + (i * stepsRGB[1] * directionRGB[1]) ),
            Math.round(color1[2] + (i * stepsRGB[2] * directionRGB[2]) )
        ]);
    }

    return colorsInBetween;
}


function prepareColorMap(colortheme) {

    // we need an array with 256 entries
    const colorAmountPerStep = Math.floor(255 / (colortheme.length - 1));
    var oneMoreForHowMany = 255 - colorAmountPerStep * (colortheme.length - 1);

    var colormap = [];
    for(var i = 0; i < colortheme.length - 1; i++) {

        let amount = colorAmountPerStep;
        if(oneMoreForHowMany > 0) {
            amount++;
            oneMoreForHowMany--;
        }
        colormap = colormap.concat(colorsInBetween(colortheme[i], colortheme[i+1], amount));
    }

    colormap.push(colortheme[colortheme.length - 1]); // add last color

    return colormap;
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