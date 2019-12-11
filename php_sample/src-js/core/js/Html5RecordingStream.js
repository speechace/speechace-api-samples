"use strict";

require("babel-polyfill"); // To use Promise

import Recorder from "./recorder";

import {
    NoAudioError,
    NoRecordingError,
    MicrophoneDeniedError,
    NoRecorderWorkerPathError
} from "./Errors";

var g_recordingAudioContext = null;
var g_nextStreamNumber = 1;

function getCachedAudioContext() {
    return g_recordingAudioContext;
}

function setCachedAudioContext(context) {
    if (context.state === "suspended") {
        setTimeout(function() {
            context.resume();
        }, 0);
    }

    g_recordingAudioContext = context;
}

function createAudioContext() {
    return new Promise(function(fulfill, reject) {
        if (getCachedAudioContext() !== null) {
            fulfill(getCachedAudioContext());
        } else {
            if (!window.AudioContext) {
                window.AudioContext = window.webkitAudioContext;
            }
            if (typeof AudioContext === "undefined") {
                reject(new NoAudioError());
            } else {
                setCachedAudioContext(new AudioContext());
                fulfill(getCachedAudioContext());
            }
        }
    });
}

function getAudioMediaStream() {
    return new Promise(function(fulfill, reject) {
        if (!navigator.getUserMedia) {
            navigator.getUserMedia =
                navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        }
        if (navigator.getUserMedia) {
            navigator.getUserMedia(
                { audio: true },
                function(media) {
                    fulfill(media);
                },
                function(err) {
                    reject(new MicrophoneDeniedError(err.message));
                }
            );
        } else if (
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia
        ) {
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then(fulfill)
                .catch(reject);
        } else {
            reject(new NoRecordingError());
        }
    });
}

function initRecordingStream(recordingStream, inputSource, opts) {
    var inputPoint = inputSource.context.createGain();

    inputSource.connect(inputPoint);

    var analyzerNode = inputSource.context.createAnalyser();
    analyzerNode.fftSize = 1024;
    analyzerNode.minDecibels = -256;
    analyzerNode.maxDecibels = -10;
    inputPoint.connect(analyzerNode);

    var configOpts = { workerPath: opts.workerPath };

    var recorder = new Recorder(inputPoint, configOpts);
    recorder.record();

    recordingStream.opened = true;
    recordingStream.inputSource = inputSource;
    recordingStream.inputPoint = inputPoint;
    recordingStream.recorder = recorder;
    recordingStream.analyzerNode = analyzerNode;
}

function closeRecordingStream(recordingStream) {
    if (recordingStream.opened) {
        recordingStream.recorder.close();
        recordingStream.inputPoint.disconnect();
        recordingStream.inputSource.disconnect(recordingStream.inputPoint);
        recordingStream.analyzerNode = null;
        recordingStream.recording = null;
        recordingStream.inputPoint = null;
        recordingStream.inputSource = null;
        recordingStream.opened = false;
    }
}

function createRecordingStream(opts) {
    var streamNumber = g_nextStreamNumber;
    g_nextStreamNumber += 1;

    return {
        opened: false,
        id: streamNumber,
        inputSource: null,
        inputPoint: null,
        recorder: null,
        analyzerNode: null,
        analysisData: null,
        lastPower: 0,

        power: function() {
            var retVal = 0;

            if (this.analyzerNode) {
                if (this.analysisData === null) {
                    this.analysisData = new Float32Array(
                        this.analyzerNode.fftSize / 2
                    );
                }
                this.analyzerNode.getFloatFrequencyData(this.analysisData);
                var maxValue = this.analyzerNode.minDecibels;
                for (var i = 0; i < this.analysisData.length; ++i) {
                    var value = this.analysisData[i];
                    if (maxValue < value) {
                        maxValue = value;
                    }
                }
                retVal = this.lastPower * 0.1 + maxValue * 0.9;
                this.lastPower = maxValue;
                retVal = (retVal - -128) / (-20 - -128);
                if (retVal >= 1.0) {
                    retVal = 1.0;
                }
                if (retVal <= 0) {
                    retVal = 0;
                }
            }

            return retVal;
        },

        start: function(successCallback, failureCallback) {
            var stream = this;
            if (!opts || !opts.workerPath) {
                failureCallback(new NoRecorderWorkerPathError());
            } else {
                Promise.all([createAudioContext(), getAudioMediaStream()])
                    .then(args => {
                        var context = args[0];
                        var mediaStream = args[1];
                        var mediaStreamSource = context.createMediaStreamSource(
                            mediaStream
                        );
                        initRecordingStream(stream, mediaStreamSource, opts);
                        successCallback();
                    })
                    .catch(err => {
                        failureCallback(err);
                    });
            }
        },

        stop: function(successCallback, failureCallback) {
            var stream = this;
            stream.recorder.stop();
            stream.recorder.getBuffers(function(buffers) {
                var currentSampleRate = stream.inputSource.context.sampleRate;
                exportResampledWAV(buffers, currentSampleRate, 16000)
                    .then(blob => {
                        successCallback(blob);
                    })
                    .catch(err => {
                        failureCallback(err);
                    });
            });
        },

        abort: function() {
            this.recorder.stop();
            closeRecordingStream(this);
        },

        close: function() {
            this.recorder.stop();
            closeRecordingStream(this);
        }
    };
}

function floatTo16BitPCM(output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
}

function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function encodeWAVHelper(samples, mono, inputSamplingRate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, "RIFF");
    /* file length */
    view.setUint32(4, 32 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, "WAVE");
    /* format chunk identifier */
    writeString(view, 12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    var channelCount = mono ? 1 : 2;
    var bytesPerSample = 2;
    view.setUint16(22, channelCount, true);
    /* sample rate */
    view.setUint32(24, inputSamplingRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, inputSamplingRate * bytesPerSample * channelCount, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, bytesPerSample * channelCount, true);
    /* bits per sample */
    view.setUint16(34, bytesPerSample * 8, true);
    /* data chunk identifier */
    writeString(view, 36, "data");
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

function exportResampledWAV(buffers, currentSampleRate, newSamplingRate) {
    return new Promise(function(fulfill, reject) {
        if (!window.OfflineAudioContext) {
            var dataview = encodeWAVHelper(buffers[0], true, currentSampleRate);
            var blob = new Blob([dataview], { type: "audio/wav" });
            fulfill(blob);
        } else {
            var recLength = buffers[0].length;
            var offlineContext = new OfflineAudioContext(
                1,
                Math.ceil(recLength * (newSamplingRate / currentSampleRate)),
                newSamplingRate
            );

            var sourceBuffer = offlineContext.createBuffer(
                buffers.length,
                recLength,
                currentSampleRate
            );
            for (var j = 0; j < buffers.length; ++j) {
                sourceBuffer.getChannelData(j).set(buffers[j], 0);
            }

            var source = offlineContext.createBufferSource();
            source.buffer = sourceBuffer;
            source.connect(offlineContext.destination);
            source.start(0);
            offlineContext.oncomplete = function(e) {
                var destBuffer = e.renderedBuffer;
                var dataview = encodeWAVHelper(
                    destBuffer.getChannelData(0),
                    true,
                    destBuffer.sampleRate
                );
                var blob = new Blob([dataview], { type: "audio/wav" });
                fulfill(blob);
            };

            offlineContext.startRendering();
        }
    });
}

var Html5RecordingStream = {
    isSupported: function() {
        if (!window.AudioContext) {
            window.AudioContext = window.webkitAudioContext;
        }
        if (typeof AudioContext === "undefined") {
            return false;
        }
        if (!navigator.getUserMedia) {
            navigator.getUserMedia =
                navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        }
        if (
            !navigator.getUserMedia &&
            (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        ) {
            return false;
        }

        return true;
    },

    createStream: function(opts) {
        return createRecordingStream(opts);
    }
};

export default Html5RecordingStream;
