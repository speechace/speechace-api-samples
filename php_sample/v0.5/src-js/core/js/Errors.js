/* The MIT License
  Copyright 2019 SpeecAce LLC
  Permission is hereby granted, free of charge, to any person obtaining a copy 
  of this software and associated documentation files (the "Software"), to 
  deal in the Software without restriction, including without limitation the 
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  sell copies of the Software, and to permit persons to whom the Software is 
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included 
  in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  IN THE SOFTWARE
*/
"use strict";

export function ScoringError(result, input_detail_message) {
    this.name = "ScoringError";
    this.result = result;
    this.message = "Unable to score the speech";
    if (input_detail_message) {
        this.custom_detail_message = input_detail_message;
    } else {
        this.custom_detail_message = "Please try again.";
    }
    this.stack = new Error().stack;
}
ScoringError.prototype = Object.create(Error.prototype);
ScoringError.prototype.constructor = ScoringError;

export function NoAudioError() {
    this.name = "NoAudioError";
    this.message = "Your browser doesn't have full audio support.";
    this.custom_detail_message =
        "Please use the latest version Google Chrome or Mozilla Firefox instead.";
    this.stack = new Error().stack;
}
NoAudioError.prototype = Object.create(Error.prototype);
NoAudioError.prototype.constructor = NoAudioError;

export function NoRecordingError(input_detail_message) {
    this.name = "NoRecordingError";
    this.message = "Your browser doesn't support audio recording.";
    if (input_detail_message) {
        this.custom_detail_message = input_detail_message;
    } else {
        this.custom_detail_message =
            "Please use the latest version Google Chrome or Mozilla Firefox instead.";
    }

    this.stack = new Error().stack;
}
NoRecordingError.prototype = Object.create(Error.prototype);
NoRecordingError.prototype.constructor = NoRecordingError;

export function MicrophoneDeniedError(input_detail_message) {
    this.name = "MicrophoneDeniedError";
    this.message = "Unable to use your microphone";
    if (input_detail_message) {
        this.custom_detail_message = input_detail_message;
    } else {
        this.custom_detail_message =
            "We need to use your microphone to score your pronunciation.";
    }
    this.stack = new Error().stack;
}
MicrophoneDeniedError.prototype = Object.create(Error.prototype);
MicrophoneDeniedError.prototype.constructor = MicrophoneDeniedError;

export function NoRecorderWorkerPathError() {
    this.name = "NoRecorderWorkerPathError";
    this.message = "The recorder workerPath is not specified.";
    this.custom_detail_message = "Please contact your developer. It is a bug.";
    this.stack = new Error().stack;
}
NoRecorderWorkerPathError.prototype = Object.create(Error.prototype);
NoRecorderWorkerPathError.prototype.constructor = NoRecorderWorkerPathError;

export function extractErrorMessages(error) {
    let retVal = {
        shortText: "Oops! Something went wrong.",
        detailedText: "Please try again."
    };

    if (error && error.hasOwnProperty("custom_detail_message")) {
        retVal.shortText = error.message;
        retVal.detailedText = error.custom_detail_message;
    }

    return retVal;
}

export function createScoringError(xhr) {
    let input_detail_message = null;
    if (xhr.status) {
        let response = null;
        try {
            response = JSON.parse(xhr.responseText);
        } catch (e) {
            // Ignore error
        }
        if (response !== null && response.hasOwnProperty("errors")) {
            try {
                input_detail_message = response.errors[0];
            } catch (e) {
                // Ignore error
            }
        }
    }
    return new ScoringError(xhr, input_detail_message);
}
