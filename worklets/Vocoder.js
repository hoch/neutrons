export class Vocoder extends AudioWorkletNode {
    constructor(context) {
        super(context, "vocoder", {
            numberOfInputs: 2,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
            channelInterpretation: "speakers"
        });
    }
}