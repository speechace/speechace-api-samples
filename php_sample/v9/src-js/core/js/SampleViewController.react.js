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

import PropTypes from "prop-types";
import React from "react";
import ClientAudioAPI from "./ClientAudioAPI";
import { createScoringError, extractErrorMessages } from "./Errors";
import MicrophoneView from "./MicrophoneView.react";
import SampleScoringResultView from "./SampleScoringResultView.react";
import SampleSpinnerView from "./SampleSpinnerView.react";
import "./switcher.css";

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
        maximumDuration: 40,
        recorderWorkerPath: null,
        scoreTextSpeechPath: null
    };

    constructor(props) {
        super(props);
        this.state = {
            speechMode: false,
            isSpeechModeData: null,
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

    changeSpeechMode() {
        const sScoring = {
            requestStatus: REQUEST_NOT_STARTED,
            data: null
        };

        this.setState({
            speechMode: !this.state.speechMode,
            value: "",
            sScoring,
            errorMessage: null,
            isSpeechModeData: null,
            audioBlob: null,
            fileInputName: ""
        });
        this.fileInput.current.value = ''
    }

    renderSpeechModeBlock = () => {
        const styles = {
            wrapper: {
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderTop: "1px solid rgb(230, 230, 230)",
                padding: "20px",
                boxSizing: "border-box"
            },
            h2: { margin: 0 },
            pDiv: {
                width: "100%",
                margin: "20px 0 5px"
            },
            p: {
                color: "#818181",
                padding: "0 10px"
            },
            content: {
                fontSize: "18px",
                overflow: "auto",
                width: "100%",
                height: "100%",
                border: "1px solid #e6e6e6",
                padding: "10px",
                minHeight: "100px"
            }
        };

        const { isSpeechModeData, sScoring } = this.state;

        if (sScoring.requestStatus === REQUEST_PENDING) {
            return <span>Please, wait...</span>;
        } else {
            if (isSpeechModeData) {
                if (!!sScoring?.data?.detailed?.words) {
                    const answer = this.formatAnswer();

                    return (
                        <div style={styles.wrapper}>
                            <div>
                                <h2 style={styles.h2}>EVALUATION SUMMARY</h2>
                            </div>
                            <div style={styles.pDiv}>
                                <p style={styles.p}>Transcript</p>
                            </div>
                            <div style={styles.content}>{answer}</div>
                        </div>
                    );
                }

                return <span />;
            }
        }
    };

    formatAnswer() {
        try {
            const words = this.state.sScoring.data.detailed.words;
            let wordKey = 0;

            return words.map(word => {
                ++wordKey;

                let cssColor = "#da2150";
                if (word.quality_score >= 80) {
                    cssColor = "#7db52d";
                }
                if (word.quality_score >= 60 && word.quality_score < 80) {
                    cssColor = "#ffc614";
                }

                return (
                    <span key={wordKey} style={{ color: cssColor }}>
                        {word.word}{" "}
                    </span>
                );
            });
        } catch (error) {
            console.error(error);
            return <span>Ops... Something went wrong.</span>;
        }
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
                detailed,
                fidelity_class
            } = this.state.sScoring.data;
            resultView = (
                <SampleScoringResultView
                    speechMode={this.state.speechMode}
                    notifyPlayClick={this.handlePlayClick.bind(this)}
                    audioBlob={this.state.audioBlob}
                    sPlaybackMap={this.state.sPlaybackMap}
                    {...{
                        overall_metrics,
                        overall_score,
                        detailed,
                        fidelity_class
                    }}
                />
            );
        }

        return (
            <main>
                <h2>SpeechAce Sample Application</h2>
                <form
                    className="form flex"
                    onSubmit={this.handleSubmit.bind(this)}>
                    <div className="switch-box">
                        <p>
                            Speech mode{" "}
                            {this.state.speechMode ? (
                                <strong>On</strong>
                            ) : (
                                <strong>Off</strong>
                            )}
                        </p>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={this.state.speechMode}
                                onChange={() => {}}
                            />
                            <span
                                className="slider round"
                                onClick={this.changeSpeechMode.bind(this)}
                            />
                        </label>
                    </div>

                    {!this.state.speechMode && (
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
                    )}

                    <div
                        className="form-control recorder"
                        style={
                            this.state.speechMode
                                ? { margin: "10px 20px 10px 20px" }
                                : {}
                        }>
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

                    {this.state.speechMode && (
                        <div
                            style={{
                                display: "flex",
                                width: "100%",
                                justifyContent: "center",
                                marginBottom: "30px"
                            }}>
                            <span>
                                Record or upload up to{" "}
                                {this.props.maximumDuration} seconds of
                                audio/video
                            </span>
                        </div>
                    )}

                    {this.state.speechMode && (
                        <div
                            className="form-control textarea"
                            style={{ height: "auto" }}>
                            {this.renderSpeechModeBlock()}
                            {this.state.errorMessage && (
                                <p className="tooltip">
                                    {this.state.errorMessage}
                                </p>
                            )}
                        </div>
                    )}

                    {!this.state.speechMode && (
                        <React.Fragment>
                            <div className="form-explanation">
                                Record or upload an audio file{" "}
                                <span className="audio-duration-alert">
                                    (no longer than {this.props.maximumDuration}{" "}
                                    sec)
                                </span>{" "}
                                containing the sentence or paragraph
                            </div>
                            <button
                                className="btn submit-btn"
                                type="submit"
                                style={{
                                    display: "flex",
                                    alignItems: "center"
                                }}>
                                Check score
                            </button>
                        </React.Fragment>
                    )}
                </form>

                {spinnerView}

                {resultView}
            </main>
        );
    }

    handleScoreTextChange(event) {
        this.setState({
            scoreText: event.target.value,
            value: event.target.value
        });
    }

    handleFileInputChange() {
        let audioBlob = this.fileInput.current.files[0];
        if (audioBlob) {
            if (this.state.speechMode) {
                this.setState({
                    value: "",
                    scoreText: "",
                    errorMessage: ""
                });
            }
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
        } else if (
            !this.fixupScoreText(this.state.scoreText) &&
            !this.state.speechMode
        ) {
            return "Please add text";
        } else if (!this.state.audioBlob) {
            return "Please record or upload an audio file containing the sentence or paragraph";
        } else {
            return "";
        }
    }

    score() {
        let formData = new FormData();

        if (this.state.speechMode) {
            formData.append("speech", true);
        } else {
            formData.append("text", this.fixupScoreText(this.state.scoreText));
        }
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
                console.log("test");
                console.log(typeof data);
                console.log(data.substring(52));
                data = JSON.parse(data.substring(52));
                let sScoring = {
                    requestStatus: REQUEST_COMPLETE,
                    data: data
                };
                this.setState({ sScoring });

                if (this.state.speechMode) {
                    this.setState({ isSpeechModeData: true });
                }
            }.bind(this),
            error: function(xhr, status, error) {
                console.log("dammit");
                console.log(xhr);
                console.log(error);
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
        if (this.state.speechMode) {
            this.setState({
                value: "",
                scoreText: "",
                errorMessage: "",
                isSpeechModeData: null
            });
        } else {
            if (!this.state.scoreText) {
                return false;
            }
        }
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
