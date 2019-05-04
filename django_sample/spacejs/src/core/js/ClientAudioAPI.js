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

import Html5RecordingStream from "./Html5RecordingStream";
import Html5PlaybackStream from "./Html5PlaybackStream";

function commonFindRecordingStreamClass(opts) {
    var creator = null;
    var candidate1 = Html5RecordingStream;
    var candidate2 = opts.creator;
    if (opts.preferCreator) {
        candidate1 = opts.creator;
        candidate2 = Html5RecordingStream;
    }

    if (candidate1 && candidate1.isSupported()) {
        creator = candidate1;
    } else if (candidate2 && candidate2.isSupported()) {
        creator = candidate2;
    } else {
        if (opts.creator) {
            creator = opts.creator;
        } else {
            creator = Html5RecordingStream;
        }
    }
    return creator;
}

function createRecordingStream(opts) {
    var creator = commonFindRecordingStreamClass(opts);
    var stream = creator.createStream(opts);
    return stream;
}

function commonFindPlaybackStreamClass(opts) {
    var creator = null;
    var candidate1 = Html5PlaybackStream;
    var candidate2 = opts.creator;
    if (opts.preferCreator) {
        candidate1 = opts.creator;
        candidate2 = Html5PlaybackStream;
    }

    if (candidate1 && candidate1.isSupported()) {
        creator = candidate1;
    } else if (candidate2 && candidate2.isSupported()) {
        creator = candidate2;
    } else {
        if (opts.creator) {
            creator = opts.creator;
        } else {
            creator = Html5PlaybackStream;
        }
    }
    return creator;
}

function createPlaybackStream(opts) {
    var creator = commonFindPlaybackStreamClass(opts);
    var stream = creator.createStream(opts);
    return stream;
}

function commonSupportDefaultAudio() {
    return (
        Html5RecordingStream.isSupported() && Html5PlaybackStream.isSupported()
    );
}

function commonStopPlayback(playbackStream, stopCallback) {
    playbackStream.stop();
    stopCallback(playbackStream);
}

var ClientAudioAPI = {
    initPlaybackAudioContext: function() {
        Html5PlaybackStream.initPlaybackAudioContext();
    },

    findRecordingStreamClass: function(opts) {
        return commonFindRecordingStreamClass(opts);
    },

    findPlaybackStreamClass: function(opts) {
        return commonFindPlaybackStreamClass(opts);
    },

    startRecording: function(
        opts,
        initCallback,
        successCallback,
        errorCallback
    ) {
        if (!opts) {
            opts = {};
        }

        var recordingStream = createRecordingStream(opts);
        initCallback(recordingStream);

        recordingStream.start(
            function() {
                successCallback(recordingStream);
            },
            function(err) {
                errorCallback(recordingStream, err);
            }
        );
    },

    stopRecording: function(recordingStream, successCallback, errorCallback) {
        recordingStream.stop(
            function(blob) {
                recordingStream.close();
                successCallback(blob);
            },
            function(err) {
                recordingStream.close();
                errorCallback(err);
            }
        );
    },

    abortRecording: function(recordingStream) {
        recordingStream.abort();
    },

    startPlayback: function(
        blob,
        extent,
        opts,
        initCallback,
        successCallback,
        errorCallback,
        stopCallback
    ) {
        if (!opts) {
            opts = {};
        }

        var playbackStream = createPlaybackStream(opts);
        initCallback(playbackStream);

        playbackStream.start(
            blob,
            extent,
            function() {
                successCallback(playbackStream);
            },
            function(err) {
                errorCallback(playbackStream, err);
            },
            function() {
                commonStopPlayback(playbackStream, stopCallback);
            }
        );
    },

    stopPlayback: function(playbackStream, stopCallback) {
        commonStopPlayback(playbackStream, stopCallback);
    },

    togglePlayback: function(playbackStream, pauseResumeCallback) {
        if (
            !playbackStream.pause ||
            !playbackStream.resume ||
            !playbackStream.isPause
        ) {
            return false;
        } else {
            if (playbackStream.isPause()) {
                playbackStream.resume(function() {
                    pauseResumeCallback(playbackStream, true);
                });
            } else {
                playbackStream.pause(function() {
                    pauseResumeCallback(playbackStream, false);
                });
            }
            return true;
        }
    },

    getAudioDuration: function(blob, opts, successCallback, errorCallback) {
        if (!opts) {
            opts = {};
        }

        let playbackStream = createPlaybackStream(opts);

        playbackStream.getDuration(blob, successCallback, errorCallback);
    },

    supportDefaultAudio: function() {
        return commonSupportDefaultAudio();
    }
};

export default ClientAudioAPI;
