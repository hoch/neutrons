import {ParameterBuilder} from "../modules/parameter.js";
import {LinearInt, OneFloat} from "../modules/mapping.js";

export class LoopStation extends AudioWorkletNode {
    constructor(context) {
        super(context, "loop-station", {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
            channelInterpretation: "speakers"
        });

        this.events = {
            onTimelineCreating: () => {},
            onTimelineCreated: (seconds) => {},
            onTrackRecording: () => {},
            onTrackAppended: (track) => {}
        };

        this.port.onmessage = event => {
            const data = event.data;
            switch (data.action) {
                case "onTimelineCreating": {
                    this.events.onTimelineCreating();
                    break;
                }
                case "onTimelineCreated": {
                    this.events.onTimelineCreated(data.seconds);
                    break;
                }
                case "onTrackRecording": {
                    this.events.onTrackRecording();
                    break;
                }
                case "onTrackAppended": {
                    this.events.onTrackAppended(data.track);
                    break;
                }
            }
        };

        this.recordShift = ParameterBuilder.begin("Record Shift")
            .valueMapping(new LinearInt(-100.0, 100.0))
            .printMapping(OneFloat)
            .unit("ms")
            .value(70.0)
            .createShared(this.port, "record-shift");
    }

    startRecording() {
        console.log("startRecording");
        this.port.postMessage({action: "start-recording"});
    }

    stopRecording() {
        console.log("stopRecording");
        this.port.postMessage({action: "stop-recording"});
    }
}