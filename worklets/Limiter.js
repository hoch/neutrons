export class Limiter extends AudioWorkletNode {
    constructor(context) {
        super(context, "limiter", {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
            channelInterpretation: "speakers"
        });
    }

    lookahead(seconds) {
        this.port.postMessage(seconds);
    }
}