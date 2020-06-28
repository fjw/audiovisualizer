
import {AudioVisualizer} from "../audiovisualizer.js";

document.querySelector("#go").addEventListener("click", () => {

    document.querySelector(".buttons").style.display = "none";

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

});