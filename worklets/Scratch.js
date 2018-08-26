export class Scratch extends AudioWorkletNode {
    constructor(context) {
        super(context, "Scratch", {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
            channelInterpretation: "speakers"
        });
    }

    sample(buffer, from, to) {
        const numberOfChannels = buffer.numberOfChannels;
        const channels = [];
        for (let i = 0; i < numberOfChannels; i++) {
            channels[i] = buffer.getChannelData(i);
        }
        this.port.postMessage({
            action: "set-sample",
            value: {
                buffer: {
                    channels: channels,
                    numberOfChannels: numberOfChannels,
                    sampleRate: buffer.sampleRate,
                    length: buffer.length
                }, from: from, to: to
            }
        });
    }

    bpm(value) {
        this.port.postMessage({action: "set-bpm", value: value});
    }

    playPattern(pattern, time) {
        this.port.postMessage({action: "play-pattern", value: {pattern: pattern.serialise(), time: time}});
    }
}