"use strict";

const defaultOptions = {
    background: "rgb(0, 0, 128)",

    lineWidth: 4,
    strokeStyle: "rgb(0,  128, 255)",

    rowsPerSec: 40,
    colortheme: [ "#000080", "#00f", "#0080ff", "#0ff", "#80ff80", "#ff0", "#ff8000", "#f00", "#800000"],

    muted: true
};

export class AudioVisualizer {

    _v = []; // list of visualizations
    _actx = null;
    _analyser = null;
    _source = null;
    muted = null;

    constructor(options) {

        // --- AudioContext ---
        var actx = new (window.AudioContext || window.webkitAudioContext)();
        getStreamSource(actx, options.src).then(source => {

            var analyser = actx.createAnalyser();
            source.connect(analyser);

            if(options.muted === false || defaultOptions.muted === false) {
                source.connect(actx.destination);
                this.muted = false;
            } else {
                this.muted = true;
            }

            if(options.analyser) {
                for (const [key, value] of Object.entries(options.analyser)) {
                    analyser[key] = value;
                }
            }

            var bufferLength = analyser.frequencyBinCount;
            var dataArray = new Uint8Array(bufferLength);

            var thereIsASpectrum = false;

            options.v.forEach(o => {

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
                            updateSpectrum(v, bufferLength, dataArray, nlImageData, nlCnv, nlCtx, rowsToRender);
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

            this._source = source;
            this._actx = actx;
            this._analyser = analyser;
        }).catch(error => {
            console.error(error.name);
        });

    }

    setSource(newsource) {
        this._source.disconnect(this._analyser);
        if(!this.muted) {
            this._source.disconnect(this._actx.destination);
        }
        getStreamSource(this._actx, newsource).then(source => {

            this._source = source;
            source.connect(this._analyser);
            if(!this.muted) {
                source.connect(this._actx.destination);
            }

        }).catch(error => {
            console.error(error);
        });;
    }

    mute() {
        if(!this.muted) {
            this.muted = true;
            this._source.disconnect(this._actx.destination);
        }
    }

    unmute() {
        if(this.muted) {
            this.muted = false;
            this._source.connect(this._actx.destination);
        }
    }

}


/**
 * Transforms a CSS color like "rgb(1, 2, 3)" or "#f00" into color value array ala [1, 2, 3]
 *
 * @param {string} color  CSS color
 * @returns {[number]}  rgb array [r,g,b]
 */
function cssColorToArray(color) {

    if(color.match(/rgb/)) { // rgb( 1, 2, 3)
        var c = color.match(/\d+/g);
        if(c.length !== 3) {
            console.error("only hex and rgb(r,g,b) colors are allowed");
        }
        return c; //c.map(i => parseInt(i)); todo
    } else if(color.match(/#/)) { // #fff or #ffffff
        color = color.trim().replace('#', '');
        if(color.length === 3) {
            color = color.charAt(0) + color.charAt(0) +
                    color.charAt(1) + color.charAt(1) +
                    color.charAt(2) + color.charAt(2);
        }
        return [
            parseInt(color.substring(0,2) ,16),
            parseInt(color.substring(2,4) ,16),
            parseInt(color.substring(4,6) ,16)
        ];
    }
}


/**
 * Gets color values between two colors. [r,g,b]
 *
 * @param {[number]} color1  first color
 * @param {[number]} color2  second color (excluded in the result)
 * @param {number} amount  amount of color values needed
 * @returns {[[number]]}  array of colors
 */
function colorsInBetween(color1, color2, amount) {

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


/**
 * Prepares the colormap for rendering. So we have an array 0-255 for all possible values.
 *
 * @param {[string]} colortheme  array of css colors
 * @returns {[[number]]}  array of [r,g,b] colors with 256 elements
 */
function prepareColorMap(colortheme) {

    var ct = colortheme.map(cssColorToArray);
    var distancecount = colortheme.length - 1;

    // we need an array with 256 entries
    const colorAmountPerStep = Math.floor(255 / distancecount);
    var oneMoreForHowMany = 255 - colorAmountPerStep * distancecount;

    var colormap = [];
    for(var i = 0; i < distancecount; i++) {

        let amount = colorAmountPerStep;
        if(oneMoreForHowMany > 0) {
            amount++;
            oneMoreForHowMany--;
        }
        colormap = colormap.concat(colorsInBetween(ct[i], ct[i+1], amount));
    }

    colormap.push(colortheme[colortheme.length - 1]); // add last color

    return colormap;
}


/**
 * Draws the spectrum (waterfall graph).
 *
 * @param {{}} v                            storage + options of this graph
 * @param {number} bufferLength             length of data points
 * @param {Uint8Array} dataArray            data points
 * @param {ImageData} nlImageData           the image data of the new line
 * @param {HTMLCanvasElement} nlCnv         the offscreen canvas for the new line
 * @param {CanvasRenderingContext2D} nlCtx  the context for the new line
 * @param {number} rowsToRender             the amount of new lines to render
 */
function updateSpectrum(v, bufferLength, dataArray, nlImageData, nlCnv, nlCtx, rowsToRender) {

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


/**
 * Draws the waveform.
 *
 * @param {{}} v                            storage + options of this graph
 * @param {number} bufferLength             length of data points
 * @param {Uint8Array} dataArray            data points
 */
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

/**
 * Creates a canvas and fits it into the container. If the container resizes, the fittet canvas is resized, too.
 * (..without loosing image information)
 *
 * @param {string} containerquery  the css query for the container
 * @returns {{ctx: CanvasRenderingContext2D, cnv: HTMLCanvasElement}}  the context and the canvas
 */
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


/**
 * Gets the an audio source for analysing.
 *
 * @param {AudioContext} actx  the audio context
 * @param {undefined|string} src  the url of the source or undefined for microphone
 * @returns {Promise<MediaStreamAudioSourceNode|MediaElementAudioSourceNode>}
 */
function getStreamSource(actx, src) {
    return new Promise((resolve, reject) => {

        if(!src) {
            // microphone

            navigator.mediaDevices.getUserMedia({audio: true} ).then( stream => {
                resolve(actx.createMediaStreamSource(stream));
            }).catch(error => {
                reject(error);
            });

        } else {
            // audiourl

            const audio = new Audio(src);
            audio.loop = true;
            audio.crossOrigin = 'anonymous';
            audio.play().then(a => { //todo: geht das ohne play?
                resolve(actx.createMediaElementSource(audio));
            }).catch(error => {
                reject(error);
            });

        }

    });
}