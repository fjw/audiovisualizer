
import {AudioVisualizer} from "../audiovisualizer.js";

/*
    Generates visualizations using configuration examples.
 */

var av;

const muteButton = document.querySelector("#mute");
const unmuteButton = document.querySelector("#unmute");
const nextButton = document.querySelector("#next");
const goButton = document.querySelector("#go");

var i = 0;
var sources = [
    "./frequencies.mp3",
    "./alternating.mp3",
    "./music.mp3"
];

goButton.addEventListener("click", () => {

    var av = new AudioVisualizer({ // no src, uses the microphone
        src: sources[i],
        muted: false,
        stopped: true,
        analyser: {
            fftSize: 4096
        },
        v: [
            {
                type: "waveform",
                container: ".wave1",
                lineWidth: 1,
                background: "goldenrod",
                strokeStyle: "black"
            },
            {
                type: "waveform",
                container: ".wave2",
                lineWidth: 10,
                background: "rgb(80,0,80)",
                strokeStyle: "#E11EB2"
            },
            {
                type: "waveform",
                container: ".wave3",
                lineWidth: 3,
                background: "#000",
                strokeStyle: "#ccc"
            },
            {
                type: "spectrum",
                container: ".spectrum1",
                background: "#000",
                rowsPerSec: 150,
                colortheme: [ "rgb(0,0,0)", "rgb(255,255,255)"]
            },
            {
                type: "spectrum",
                container: ".spectrum2",
                background: "#f00",
                rowsPerSec: 90,
                colortheme: [ "#f00", "#ff0", "#0f0"]
            },
            {
                type: "spectrum",
                container: ".spectrum3",
                background: "#ccc",
                rowsPerSec: 30,
                colortheme: [ "#ccc", "#000", "#ffaa10", "#f00", "#00f", "#0ff"]
            }
        ]
    });


    goButton.style.display = "none";
    muteButton.style.display = "block";
    nextButton.style.display = "block";

    muteButton.addEventListener("click", () => {
        av.mute();
        muteButton.style.display = "none";
        unmuteButton.style.display = "block";
    });

    unmuteButton.addEventListener("click", () => {
        av.unmute();
        muteButton.style.display = "block";
        unmuteButton.style.display = "none";
    });

    nextButton.addEventListener("click", () => {
        i++;
        if(i > sources.length - 1) {
            i = 0;
        }
        av.setSource(sources[i]);
    });

});

