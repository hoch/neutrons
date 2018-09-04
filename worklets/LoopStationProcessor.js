import {AbstractAudioWorkletProcessor} from "./AbstractAudioWorkletProcessor.js";

registerProcessor("loop-station", class extends AbstractAudioWorkletProcessor {
    constructor(options) {
        super(options);

        this.maxRecordingLength = (sampleRate * 30 / 128) | 0;
        this.recordBuffer = [
            new Float32Array(this.maxRecordingLength * 128),
            new Float32Array(this.maxRecordingLength * 128)
        ];
        this.tracks = [];
        this.recording = false;
        this.recordNextCycle = false;
        this.recordLength = 0;
        this.playIndex = 0;
        this.recordIndex = 0;
        this.recordShift = NaN;

        this.bindParameter("record-shift", ms => this.recordShift = Math.floor(ms / 128000.0 * sampleRate));
    }

    processMessage(data) {
        switch (data.action) {
            case "start-recording": {
                this.startRecording();
                return;
            }
            case "stop-recording": {
                this.stopRecording();
                return;
            }
        }
        return super.processMessage(data);
    }

    startRecording() {
        if (this.recording || this.recordNextCycle) {
            return;
        }
        if (this.hasRecordedTracks()) {
            this.recordNextCycle = true;
        } else {
            this.onTimelineCreating();
            this.recordLength = 0;
            this.recording = true;
        }
    }

    stopRecording() {
        if (!this.recording) {
            return;
        }
        if (!this.hasRecordedTracks()) {
            this.onTimelineCreated();
        }
    }

    process(inputs, outputs, ignore) {
        const input = inputs[0];
        const output = outputs[0];
        if (this.recording) {
            const inp0 = input[0];
            const inp1 = input[1];
            const recordBuffer0 = this.recordBuffer[0];
            const recordBuffer1 = this.recordBuffer[1];
            const index = (this.hasRecordedTracks()
                ? this.recordIndex
                : this.recordLength) * 128;
            for (let i = 0; i < 128; i++) {
                recordBuffer0[index + i] = inp0[i];
                recordBuffer1[index + i] = inp1[i];
            }
            if (this.hasRecordedTracks()) {
                if (++this.recordIndex === this.recordLength) {
                    this.appendTrack();
                }
            } else {
                if (++this.recordLength === this.maxRecordingLength) {
                    this.stopRecording();
                }
            }
        }
        if (this.hasRecordedTracks()) {
            const index = (this.playIndex++ % this.recordLength) * 128;
            if (!this.recording || true) {
                const out0 = output[0];
                const out1 = output[1];
                for (let j = 0; j < this.tracks.length; j++) {
                    const track = this.tracks[j];
                    const track0 = track[0];
                    const track1 = track[1];
                    for (let i = 0; i < 128; i++) {
                        out0[i] += track0[index + i];
                        out1[i] += track1[index + i];
                    }
                }
            }
            if (this.recordNextCycle) {
                if ((this.playIndex - this.recordShift) % this.recordLength === 0) {
                    this.recordNextCycle = false;
                    this.recordIndex = 0;
                    this.recording = true;
                    this.onTrackRecording();
                }
            }
        }
        return true;
    }

    onTimelineCreating() {
        this.port.postMessage({action: "onTimelineCreating"});
    }

    onTimelineCreated() {
        this.port.postMessage({action: "onTimelineCreated", seconds: (this.recordLength * 128) / sampleRate});
        this.appendTrack();
    }

    onTrackRecording() {
        this.port.postMessage({action: "onTrackRecording"});
    }

    appendTrack() {
        const track = [
            this.recordBuffer[0].slice(0, this.recordLength * 128),
            this.recordBuffer[1].slice(0, this.recordLength * 128)
        ];
        this.tracks.push(track);
        this.recording = false;
        this.port.postMessage({action: "onTrackAppended", track: track});
    }

    hasRecordedTracks() {
        return 0 < this.tracks.length;
    }
});