
import {AudioVisualizer} from "../audiovisualizer.js";

var av = new AudioVisualizer({
    //src: "sinus800hz-10db.mp3",
    v: [
        {
            type: "spectrum",
            container: "#myspectrum"
        },

        {
            type: "waveform",
            container: "#mywaveform"
        }
    ]
});