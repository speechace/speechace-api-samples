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

import PlaybackView from "./PlaybackView.react";

function SummaryMetricsView(props) {
    let optionalScoreText = null;
    if (props.overall_metrics) {
        let scoreList = [];
        if (typeof props.overall_metrics.ielts_score !== "undefined") {
            scoreList.push("IELTS score " + props.overall_metrics.ielts_score);
        }
        if (typeof props.overall_metrics.pte_score !== "undefined") {
            scoreList.push("PTE score " + props.overall_metrics.pte_score);
        }
        if (scoreList.length) {
            optionalScoreText = scoreList.join(" | ");
        }
    }
    return (
        <div className="summary-explanation score-metrics">
            Overall score (Average of all phonemes score) {props.overall_score}%{" "}
            <br />
            {optionalScoreText}
        </div>
    );
}

function SummaryExplanationView(props) {
    let infoList = [];
    infoList.push("Word count " + props.overall_metrics.word_count);
    infoList.push("Syllable count " + props.overall_metrics.syllable_count);
    infoList.push("Phone count " + props.overall_metrics.phone_count);
    if (props.overall_metrics.audio_length) {
        infoList.push("Audio length " + props.overall_metrics.audio_length);
    }
    if (props.overall_metrics.wcm) {
        infoList.push(
            "Words correct/min " + Math.trunc(props.overall_metrics.wcm)
        );
    }
    if (props.overall_metrics.pauses) {
        infoList.push("Pauses " + props.overall_metrics.pauses);
    }
    if (props.overall_metrics.pause_duration) {
        infoList.push("Pause duration " + props.overall_metrics.pause_duration);
    }
    if (props.overall_metrics.mlr) {
        infoList.push("MLR " + props.overall_metrics.mlr.toFixed(2));
    }
    if (props.fidelity_class) {
        infoList.push("Fidelity " + props.fidelity_class.split('_').join(' ').toLowerCase());
    }
    return <div className="summary-explanation">{infoList.join(" | ")}</div>;
}

class SampleScoringResultView extends React.Component {
    static propTypes = {
        overall_score: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number
        ]),
        overall_metrics: PropTypes.object,
        detailed: PropTypes.object,
        notifyPlayClick: PropTypes.func,
        audioBlob: PropTypes.object,
        sPlaybackMap: PropTypes.object
    };

    static defaultProps = {
        overall_score: 0,
        overall_metrics: null,
        detailed: null,
        notifyPlayClick: null,
        audioBlob: null,
        sPlaybackMap: null
    };

    render() {
        let { overall_score, overall_metrics, detailed, fidelity_class } = this.props;
            return (
                <div>
                    <h2>Summary</h2>
                    <div className="summary">
                        <div className="summary-player">
                            <div>{this.renderPlayback("main", null, 60)}</div>
                        </div>
                        <div>
                            <SummaryMetricsView
                                {...{ overall_score, overall_metrics }}
                            />
                            <SummaryExplanationView {...{ overall_metrics, fidelity_class }} />
                        </div>
                    </div>
                    <h2>Detailed score breakup</h2>
                    <div className="tables">
                        <div className="tables-blocks">
                            <table className="tables-blocks__word">
                                <tbody>
                                    <tr>
                                        <th />
                                        <th>Word</th>
                                        <th>Score</th>
                                    </tr>
                                    {detailed.words.map(
                                        function(word, index) {
                                            let playbackViewWrapper = null;
                                            if (word.quality_score) {
                                                playbackViewWrapper = (
                                                    <div className="word-play-back-button">
                                                        {this.renderPlayback(
                                                            "word-" + index,
                                                            word,
                                                            26
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <tr key={index}>
                                                    <td>{playbackViewWrapper}</td>
                                                    <td>{word.word}</td>
                                                    <td>{word.quality_score}%</td>
                                                </tr>
                                            );
                                        }.bind(this)
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="tables-blocks">
                            <table className="tables-blocks__syllable">
                                <tbody>
                                    <tr>
                                        <th>Syllable</th>
                                        <th>Score</th>
                                    </tr>
                                    {detailed.syllables.map(
                                        function(syllable, index) {
                                            return (
                                                <tr key={index}>
                                                    <td>{syllable.letters}</td>
                                                    <td>
                                                        {syllable.quality_score}%
                                                    </td>
                                                </tr>
                                            );
                                        }.bind(this)
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="tables-blocks">
                            <table className="tables-blocks__phoneme with-average">
                                <tbody>
                                    <tr>
                                        <th>Phoneme</th>
                                        <th>Score</th>
                                    </tr>
                                    {detailed.phonemes.map(
                                        function(phone, index) {
                                            return (
                                                <tr key={index}>
                                                    <td>{phone.phone}</td>
                                                    <td>
                                                        {(+phone.quality_score).toFixed(
                                                            2
                                                        )}
                                                        %
                                                    </td>
                                                </tr>
                                            );
                                        }.bind(this)
                                    )}
                                    <tr>
                                        <td>Average score</td>
                                        <td>{overall_score}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
    }

    renderPlayback(keyPrefix, keyInfo, size) {
        let retVal = null;
        if (this.props.audioBlob !== null) {
            let extent = null;
            let stream = null;
            if (
                keyInfo &&
                keyInfo.hasOwnProperty("start") &&
                keyInfo.hasOwnProperty("stop")
            ) {
                extent = [keyInfo["start"], keyInfo["stop"]];
            }
            let key = keyPrefix;
            if (extent !== null) {
                key = key + "-" + extent[0] + "-" + extent[1];
            }
            if (key in this.props.sPlaybackMap) {
                stream = this.props.sPlaybackMap[key].data;
            }
            retVal = (
                <PlaybackView
                    stream={stream}
                    notifyClick={this.handleClick.bind(
                        this,
                        this.props.audioBlob,
                        key,
                        extent
                    )}
                    size={size}
                    tabIndex={0}
                    role="button"
                    startLabel="Start playing audio"
                    stopLabel="Stop playing audio"
                />
            );
        }
        return retVal;
    }

    handleClick(audioBlob, key, extent) {
        if (this.props.notifyPlayClick !== null) {
            this.props.notifyPlayClick(audioBlob, key, extent);
            return false;
        }
        return true;
    }
}

export default SampleScoringResultView;
