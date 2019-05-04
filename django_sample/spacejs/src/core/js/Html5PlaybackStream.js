/* Copyright (C) 2019  SpeechAce LLC

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published
   by the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict";

require("babel-polyfill"); // To use Promise

var bowser = require("bowser");

import { NoAudioError } from "./Errors";

var g_playbackAudioContext = null;
var g_nextStreamNumber = 1;

function getCachedAudioContext() {
    return g_playbackAudioContext;
}

function setCachedAudioContext(context) {
    if (context.state === "suspended") {
        setTimeout(function() {
            context.resume();
        }, 0);
    }

    g_playbackAudioContext = context;
}

function warmupForSafari() {
    if (bowser.safari) {
        if (g_playbackAudioContext !== null) {
            // Create empty buffer
            var buffer = g_playbackAudioContext.createBuffer(1, 1, 22050);
            var source = g_playbackAudioContext.createBufferSource();
            source.buffer = buffer;
            // Connect to output (speakers)
            source.connect(g_playbackAudioContext.destination);
            // Play sound
            if (source.start) {
                source.start(0);
            } else if (source.play) {
                source.play(0);
            } else if (source.noteOn) {
                source.noteOn(0);
            }
        }
    }
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
                warmupForSafari();
                fulfill(getCachedAudioContext());
            }
        }
    });
}

function createPlaybackStream(options) {
    var streamNumber = g_nextStreamNumber;
    g_nextStreamNumber += 1;

    return {
        opened: false,
        id: streamNumber,
        soundSource: null,
        volumeNode: null,
        startTime: options.startTime || null,
        duration: options.duration || null,
        realStartTime: null,

        progress: function() {
            var retVal = 0;

            if (
                this.soundSource !== null &&
                this.startTime !== null &&
                this.duration !== null
            ) {
                if (this.duration <= 0) {
                    retVal = 1.0;
                } else {
                    var elapseTime =
                        this.soundSource.context.currentTime - this.startTime;
                    retVal = elapseTime / this.duration;
                    if (retVal > 1.0) {
                        retVal = 1.0;
                    } else if (retVal < 0) {
                        retVal = 0;
                    }
                }
            }

            return retVal;
        },

        position: function() {
            var retVal = 0;
            if (this.realStartTime !== null) {
                if (this.soundSource !== null && this.startTime !== null) {
                    retVal =
                        this.realStartTime +
                        (this.soundSource.context.currentTime - this.startTime);
                    if (retVal < 0) {
                        retVal = 0;
                    }
                } else {
                    retVal = this.realStartTime;
                }
            }
            return retVal;
        },

        start: function(
            blob,
            extent,
            successCallback,
            failureCallback,
            endCallback
        ) {
            var playbackStream = this;
            Promise.all([createAudioContext(), readAudioDataFromBlob(blob)])
                .then(args => {
                    var context = args[0];
                    var audioData = args[1];
                    return createAudioDataSource(context, audioData);
                })
                .then(soundSource => {
                    initPlaybackStream(
                        playbackStream,
                        soundSource,
                        extent,
                        endCallback
                    );
                    successCallback();
                })
                .catch(err => {
                    failureCallback(err);
                });
        },

        stop: function() {
            if (this.isPause()) {
                this.resume(function() {});
            }
            stopPlaybackStream(this);
        },

        pause: function(successCallback) {
            if (
                this.soundSource &&
                this.soundSource.context &&
                this.soundSource.context.state === "running"
            ) {
                this.soundSource.context.suspend().then(successCallback);
            }
        },

        resume: function(successCallback) {
            if (
                this.soundSource &&
                this.soundSource.context &&
                this.soundSource.context.state === "suspended"
            ) {
                this.soundSource.context.resume().then(successCallback);
            }
        },

        isPause: function() {
            if (
                this.soundSource &&
                this.soundSource.context &&
                this.soundSource.context.state === "suspended"
            ) {
                return true;
            } else {
                return false;
            }
        },

        getDuration: function(blob, successCallback, failureCallback) {
            Promise.all([createAudioContext(), readAudioDataFromBlob(blob)])
                .then(args => {
                    let context = args[0];
                    let audioData = args[1];
                    return createAudioDataSource(context, audioData);
                })
                .then(soundSource => {
                    successCallback(soundSource.buffer.duration);
                })
                .catch(err => {
                    failureCallback(err);
                });
        }
    };
}

function initPlaybackStream(playbackStream, soundSource, extent, onended) {
    var volumeNode = soundSource.context.createGain();
    volumeNode.gain.value = 1;

    soundSource.connect(volumeNode);

    volumeNode.connect(soundSource.context.destination);

    playbackStream.opened = true;
    playbackStream.soundSource = soundSource;
    playbackStream.volumeNode = volumeNode;
    playbackStream.startTime = soundSource.context.currentTime;
    soundSource.onended = onended;
    if (extent === null) {
        playbackStream.realStartTime = 0;
        playbackStream.duration = soundSource.buffer.duration;
        soundSource.start(playbackStream.startTime);
    } else {
        var end = extent[1];
        if (extent[1] === null) {
            end = Math.ceil(soundSource.buffer.duration * 100);
        }
        playbackStream.realStartTime = extent[0] / 100.0;
        playbackStream.duration = (end - extent[0]) / 100.0;
        soundSource.start(
            playbackStream.startTime,
            extent[0] / 100.0,
            playbackStream.duration
        );
    }
}

function stopPlaybackStream(playbackStream) {
    if (playbackStream.opened) {
        // set it to false first, in case this is called from user interface and the onended callback will
        // be called when we call stop() below.
        playbackStream.opened = false;

        playbackStream.soundSource.onended = null;
        playbackStream.soundSource.stop(0);
        playbackStream.soundSource.disconnect();
        playbackStream.soundSource = null;

        playbackStream.volumeNode.disconnect();
        playbackStream.volumeNode = null;

        playbackStream.startTime = null;
        playbackStream.duration = null;
        playbackStream.realStartTime = null;
    }
}

function readAudioDataFromBlob(blob) {
    return new Promise(function(fulfill, reject) {
        var fileReader = new FileReader();
        fileReader.onload = function(e) {
            var audioData = e.target.result;
            fulfill(audioData);
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(blob);
    });
}

function createAudioDataSource(context, audioData) {
    return new Promise(function(fulfill, reject) {
        var soundSource = context.createBufferSource();
        context.decodeAudioData(
            audioData,
            function(soundBuffer) {
                soundSource.buffer = soundBuffer;
                fulfill(soundSource);
            },
            reject
        );
    });
}

var Html5PlaybackStream = {
    isSupported: function() {
        if (!window.AudioContext) {
            window.AudioContext = window.webkitAudioContext;
        }
        if (typeof AudioContext === "undefined") {
            return false;
        }

        return true;
    },

    createStream: function(options) {
        return createPlaybackStream(options);
    },

    initPlaybackAudioContext: function() {
        createAudioContext();
    }
};

export default Html5PlaybackStream;
