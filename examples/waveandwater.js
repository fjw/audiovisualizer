
import {AudioVisualizer} from "../audiovisualizer.js";

/*
    Generates visualizations using the standard configurations.
 */
new AudioVisualizer({ // no src, uses the microphone
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