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

import React from "react";
import PropTypes from "prop-types";

import SampleSpinnerView from "./SampleSpinnerView.react";
import SampleScoringResultView from "./SampleScoringResultView.react";
import MicrophoneView from "./MicrophoneView.react";
import { extractErrorMessages, createScoringError } from "./Errors";
import ClientAudioAPI from "./ClientAudioAPI";

const REQUEST_NOT_STARTED = "NOT_STARTED";
const REQUEST_PENDING = "PENDING";
const REQUEST_COMPLETE = "COMPLETE";
const REQUEST_ERROR = "ERROR";

class SampleViewController extends React.Component {
    static propTypes = {
        maximumDuration: PropTypes.number,
        recorderWorkerPath: PropTypes.string,
        scoreTextSpeechPath: PropTypes.string
    };

    static defaultProps = {
        maximumDuration: 30,
        recorderWorkerPath: null,
        scoreTextSpeechPath: null
    };

    constructor(props) {
        super(props);
        this.state = {
            scoreText: "",
            errorMessage: "",
            fileInputName: "",
            audioBlob: null,
            sRecording: {
                requestStatus: REQUEST_NOT_STARTED,
                data: null
            },
            sPlaybackMap: {},
            sScoring: {
                requestStatus: REQUEST_NOT_STARTED,
                data: null
            }
        };
        this.fileInput = React.createRef();
    }

    render() {
        let spinnerView = null;
        if (this.state.sScoring.requestStatus === REQUEST_PENDING) {
            spinnerView = <SampleSpinnerView />;
        }

        let resultView = null;
        if (this.state.sScoring.requestStatus === REQUEST_COMPLETE) {
            let {
                overall_metrics,
                overall_score,
                detailed
            } = this.state.sScoring.data;
            resultView = (
                <SampleScoringResultView
                    notifyPlayClick={this.handlePlayClick.bind(this)}
                    audioBlob={this.state.audioBlob}
                    sPlaybackMap={this.state.sPlaybackMap}
                    {...{ overall_metrics, overall_score, detailed }}
                />
            );
        }

        return (
            <main>
                <h2>SpeechAce Sample Application</h2>
                <form
                    className="form flex"
                    onSubmit={this.handleSubmit.bind(this)}>
                    <div className="form-control textarea">
                        <div className="form-control textarea">
                            <textarea
                                value={this.state.value}
                                name="text"
                                className="textarea-custom"
                                cols="30"
                                rows="5"
                                placeholder="Type in a sentence or a short paragraph"
                                onChange={this.handleScoreTextChange.bind(this)}
                            />
                            <p className="tooltip">{this.state.errorMessage}</p>
                        </div>
                    </div>
                    <div className="form-control recorder">
                        <div>
                            <MicrophoneView
                                size={120}
                                tabIndex={0}
                                recordingStream={this.state.sRecording.data}
                                notifyClick={this.handleMicClick.bind(this)}
                            />
                        </div>

                        <p className="text-speech">Or</p>

                        <div className="label-container">
                            <label
                                htmlFor=""
                                className="form-control-file-upload">
                                <button className="btn">
                                    <i className="far fa-arrow-alt-circle-up" />
                                    <span>Choose file</span>
                                </button>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    ref={this.fileInput}
                                    onChange={this.handleFileInputChange.bind(
                                        this
                                    )}
                                />
                            </label>
                            <div className="file-name-container">
                                <p className="file-name">
                                    {this.state.fileInputName}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="form-explanation">
                        Record or upload an audio file{" "}
                        <span className="audio-duration-alert">
                            (no longer than {this.props.maximumDuration} sec)
                        </span>{" "}
                        containing the sentence or paragraph
                    </div>
                    <button className="btn submit-btn" type="submit">
                        Check score
                    </button>
                </form>

                {spinnerView}

                {resultView}
            </main>
        );
    }

    handleScoreTextChange(event) {
        this.setState({ scoreText: event.target.value });
    }

    handleFileInputChange() {
        let audioBlob = this.fileInput.current.files[0];
        if (audioBlob) {
            ClientAudioAPI.getAudioDuration(
                audioBlob,
                null,
                function(duration) {
                    if (duration <= this.props.maximumDuration) {
                        let fileInputName = audioBlob.name;
                        this.setState({ audioBlob, fileInputName });
                        this.autoSubmit();
                    } else {
                        this.setState({
                            errorMessage:
                                "The file is too long. Please upload a file no longer than " +
                                this.props.maximumDuration +
                                " seconds"
                        });
                    }
                }.bind(this),
                function(err) {
                    this.setState({
                        errorMessage: "Unable to process audio data. " + err
                    });
                }.bind(this)
            );
        }
    }

    handleMicClick() {
        if (this.canStartRecording()) {
            this.startRecording();
        } else if (this.canStopRecording()) {
            this.stopRecording();
        }
    }

    handlePlayClick(audioBlob, key, extent) {
        if (audioBlob === this.state.audioBlob) {
            let sPlayback = this.state.sPlaybackMap[key];
            let playbackStream = null;
            if (sPlayback) {
                playbackStream = sPlayback.data;
            }
            if (!playbackStream) {
                if (audioBlob) {
                    this.startPlayback(audioBlob, key, extent);
                }
            } else if (playbackStream.opened) {
                this.stopPlayback(key, playbackStream);
            }
        }
    }

    handleSubmit(event) {
        event.preventDefault();
        const errorMessage = this.validate();
        this.setState({ errorMessage });
        if (!errorMessage) {
            this.score();
        }
    }

    autoSubmit() {
        const errorMessage = this.validate();
        if (!errorMessage) {
            this.score();
        }
    }

    validate() {
        if (
            !this.fixupScoreText(this.state.scoreText) &&
            !this.state.audioBlob
        ) {
            return "Please record or upload an audio file containing and add the needed text";
        } else if (!this.fixupScoreText(this.state.scoreText)) {
            return "Please add text";
        } else if (!this.state.audioBlob) {
            return "Please record or upload an audio file containing the sentence or paragraph";
        } else {
            return "";
        }
    }

    score() {
        let formData = new FormData();
        formData.append("text", this.fixupScoreText(this.state.scoreText));
        formData.append("audio_data", this.state.audioBlob);
        let sScoring = {
            requestStatus: REQUEST_PENDING,
            data: null
        };
        this.setState({ sScoring });
        $.ajax({
            type: "POST",
            url: this.props.scoreTextSpeechPath,
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                let sScoring = {
                    requestStatus: REQUEST_COMPLETE,
                    data: data
                };
                this.setState({ sScoring });
            }.bind(this),
            error: function(xhr, status, error) {
                let sScoring = {
                    requestStatus: REQUEST_ERROR,
                    data: null,
                    error: createScoringError(xhr)
                };
                let errorMessage = this.formatExtractedErrorMessages(
                    sScoring.error
                );
                this.setState({ sScoring, errorMessage });
            }.bind(this)
        });
    }

    canStartRecording() {
        return !this.state.sRecording.data;
    }

    canStopRecording() {
        return !this.canStartRecording() && this.state.sRecording.data.opened;
    }

    startRecording() {
        ClientAudioAPI.startRecording(
            { workerPath: this.props.recorderWorkerPath },
            function(recordingStream) {
                let sRecording = {
                    requestStatus: REQUEST_PENDING,
                    data: recordingStream
                };
                let errorMessage = "";
                this.setState({ sRecording, errorMessage });
            }.bind(this),
            function(recordingStream) {
                let sRecording = {
                    requestStatus: REQUEST_COMPLETE,
                    data: recordingStream
                };
                this.setState({ sRecording });
            }.bind(this),
            function(recordingStream, error) {
                let sRecording = {
                    requestStatus: REQUEST_ERROR,
                    data: null,
                    error
                };
                let errorMessage = this.formatExtractedErrorMessages(error);
                this.setState({ sRecording, errorMessage });
            }.bind(this)
        );
    }

    stopRecording() {
        if (this.state.sRecording.data) {
            ClientAudioAPI.stopRecording(
                this.state.sRecording.data,
                function(audioBlob) {
                    let sRecording = {
                        requestStatus: REQUEST_NOT_STARTED,
                        data: null
                    };
                    let fileInputName = "";
                    this.setState({ sRecording, audioBlob, fileInputName });
                    this.autoSubmit();
                }.bind(this),
                function(error) {
                    let errorMessage = this.formatExtractedErrorMessages(error);
                    this.setState({ errorMessage });
                }.bind(this)
            );
        }
    }

    startPlayback(audioBlob, key, extent) {
        ClientAudioAPI.startPlayback(
            audioBlob,
            extent,
            null,
            function(playbackStream) {
                let sPlayback = {
                    requestStatus: REQUEST_PENDING,
                    data: playbackStream
                };
                this.setSPlaybackMap(key, sPlayback);
                let errorMessage = "";
                this.setState({ errorMessage });
            }.bind(this),
            function(playbackStream) {
                let sPlayback = {
                    requestStatus: REQUEST_COMPLETE,
                    data: playbackStream
                };
                this.setSPlaybackMap(key, sPlayback);
            }.bind(this),
            function(playbackStream, error) {
                let sPlayback = {
                    requestStatus: REQUEST_ERROR,
                    data: playbackStream
                };
                this.setSPlaybackMap(key, sPlayback);
                let errorMessage = this.formatExtractedErrorMessages(error);
                this.setState({ errorMessage });
            }.bind(this),
            function(playbackStream) {
                let sPlayback = {
                    requestStatus: REQUEST_NOT_STARTED,
                    data: playbackStream
                };
                this.setSPlaybackMap(key, sPlayback);
            }.bind(this)
        );
    }

    stopPlayback(key, playbackStream) {
        ClientAudioAPI.stopPlayback(
            playbackStream,
            function(playbackStream) {
                let sPlayback = {
                    requestStatus: REQUEST_NOT_STARTED,
                    data: playbackStream
                };
                this.setSPlaybackMap(key, sPlayback);
            }.bind(this)
        );
    }

    setSPlaybackMap(key, newItem) {
        let currentMap = this.state.sPlaybackMap;
        let newMap = currentMap;
        if (
            newItem.requestStatus === REQUEST_NOT_STARTED ||
            newItem.requestStatus === REQUEST_ERROR
        ) {
            let currentItem = currentMap[key];
            if (currentItem && currentItem.data === newItem.data) {
                newMap = { ...currentMap };
                delete newMap[key];
            }
        } else {
            newMap = {
                ...currentMap,
                [key]: newItem
            };
        }
        if (newMap !== currentMap) {
            this.setState({ sPlaybackMap: newMap });
        }
    }

    formatExtractedErrorMessages(error) {
        let errorMessagesObj = extractErrorMessages(error);
        return (
            errorMessagesObj.shortText + ": " + errorMessagesObj.detailedText
        );
    }

    fixupScoreText(value) {
        if (value) {
            value = value.replace(/[\r\n]+/g, " ");
            value = value.trim();
        }
        return value;
    }
}

export default SampleViewController;
