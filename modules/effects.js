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
        wet: wetGain.gain
    };
};

export const flanger = (context, input, output) => {
    const delayNode = context.createDelay();
    delayNode.delayTime.value = 0.007;
    const feedbackGain = context.createGain();
    feedbackGain.gain.value = 0.9;
    const wetGain = context.createGain();
    wetGain.gain.value = 0.5;
    input.connect(delayNode).connect(feedbackGain).connect(delayNode);
    feedbackGain.connect(wetGain).connect(output);
    const depthNode = context.createGain();
    depthNode.gain.value = 0.001;
    const oscillatorNode = context.createOscillator();
    oscillatorNode.frequency.value = 0.1;
    oscillatorNode.connect(depthNode).connect(delayNode.delayTime);
    oscillatorNode.start();
    return {
        delayTime: delayNode.delayTime,
        feedback: feedbackGain.gain,
        lfoFrequency: oscillatorNode.frequency,
        lfoDepth: depthNode.gain,
        wet: wetGain.gain
    };
};

export const pulsarDelay = (context, input, output, delayTimeL, delayTimeR, delayTime, feedback, lpf, hpf) => {
    const preSplitter = context.createChannelSplitter(2);
    const preDelayL = context.createDelay();
    const preDelayR = context.createDelay();
    preDelayL.delayTime.value = delayTimeL;
    preDelayR.delayTime.value = delayTimeR;
    input.connect(preSplitter);
    preSplitter.connect(preDelayL, 0, 0);
    preSplitter.connect(preDelayR, 1, 0);
    const feedbackMerger = context.createChannelMerger(2);
    preDelayL.connect(feedbackMerger, 0, 1);
    preDelayR.connect(feedbackMerger, 0, 0);
    const feedbackLowpass = context.createBiquadFilter();
    feedbackLowpass.type = "lowpass";
    feedbackLowpass.frequency.value = lpf;
    feedbackLowpass.Q.value = -3.0;
    const feedbackHighpass = context.createBiquadFilter();
    feedbackHighpass.type = "highpass";
    feedbackHighpass.frequency.value = hpf;
    feedbackHighpass.Q.value = -3.0;
    const feedbackDelay = context.createDelay();
    feedbackDelay.delayTime.value = delayTime;
    const feedbackGain = context.createGain();
    feedbackGain.gain.value = feedback;
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
    // TODO return audio-params
};