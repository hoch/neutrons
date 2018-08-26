registerProcessor("calibration", class extends AudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.frame = Number.MAX_VALUE;
        this.sound = null;
        this.startTime = NaN;
        this.countFrames = 0;
        this.peakDetected = false;

        this.port.onmessage = event => {
            const data = event.data;
            switch (data.action) {
                case "set-sound": {
                    this.sound = data.value;
                    break;
                }
                case "play-sound": {
                    if (null !== this.sound) {
                        this.frame = 0;
                        this.startTime = currentTime;
                        this.countFrames = 0;
                        this.peakDetected = false;
                    }
                    break;
                }
            }
        };
    }

    process(inputs, outputs, ignore) {
        if (null === this.sound) {
            return true;
        }
        const RENDER_QUANTUM = 128;
        const process = Math.min(this.sound.length - this.frame, RENDER_QUANTUM);
        if (0 < process) {
            const output = outputs[0];
            const outputChannel = output[0];
            for (let i = 0; i < process; i++) {
                outputChannel[i] = this.sound[this.frame++];
            }
        }
        if (this.peakDetected) {
            return true;
        }
        const input = inputs[0];
        const inputChannel = input[0];
        for (let i = 0; i < RENDER_QUANTUM; i++) {
            if (Math.abs(inputChannel[i]) > 0.1) {
                this.port.postMessage({action: "detect-peak", value: this.countFrames / sampleRate * 1000});
                this.peakDetected = true;
                break;
            }
            this.countFrames++;
        }
        return true;
    }
});