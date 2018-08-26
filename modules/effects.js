import {barsToSeconds} from "./neutrons.js";

export const echo = (context, input, output, delayTime, feedback, wetLevel) => {
    const delay = context.createDelay();
    delay.delayTime.value = delayTime;
    const feedbackGain = context.createGain();
    feedbackGain.gain.value = feedback;
    const wetGain = context.createGain();
    wetGain.gain.value = wetLevel;
    input.connect(delay).connect(feedbackGain).connect(delay);
    feedbackGain.connect(wetGain).connect(output);
    return {
        delayTime: delay.delayTime,
        feedback: feedbackGain.gain,
        gain: wetGain.gain
    };
};

export const pulsarDelay = (context, input, output, bpm) => {
    const preSplitter = context.createChannelSplitter(2);
    const preDelayL = context.createDelay();
    const preDelayR = context.createDelay();
    preDelayL.delayTime.value = barsToSeconds(1.0 / 16.0, bpm);
    preDelayR.delayTime.value = barsToSeconds(2.0 / 16.0, bpm);
    input.connect(preSplitter);
    preSplitter.connect(preDelayL, 0, 0);
    preSplitter.connect(preDelayR, 1, 0);
    const feedbackMerger = context.createChannelMerger(2);
    preDelayL.connect(feedbackMerger, 0, 1);
    preDelayR.connect(feedbackMerger, 0, 0);
    const feedbackLowpass = context.createBiquadFilter();
    feedbackLowpass.type = "lowpass";
    feedbackLowpass.frequency.value = 8000.0;
    const feedbackHighpass = context.createBiquadFilter();
    feedbackHighpass.type = "highpass";
    feedbackHighpass.frequency.value = 600.0;
    const feedbackDelay = context.createDelay();
    feedbackDelay.delayTime.value = barsToSeconds(1.0 / 16.0, bpm);
    const feedbackGain = context.createGain();
    feedbackGain.gain.value = 0.75;
    const feedbackSplitter = context.createChannelSplitter(2);
    feedbackMerger
        .connect(feedbackLowpass)
        .connect(feedbackHighpass)
        .connect(feedbackGain)
        .connect(feedbackDelay)
        .connect(feedbackSplitter);
    feedbackSplitter.connect(feedbackMerger, 0, 1);
    feedbackSplitter.connect(feedbackMerger, 1, 0);
    feedbackGain.connect(output);
};