"use strict";

import React from "react";
import ReactDOM from "react-dom";

import SampleViewController from "./SampleViewController.react";

require("./django_csrf");

//
// DOM Ready
//

$(function() {
    let viewController = (
        <SampleViewController
            recorderWorkerPath={window.sample_recorder_worker_url}
            scoreTextSpeechPath={window.sample_score_text_speech_url}
        />
    );
    let appNode = document.getElementById("react-app");
    ReactDOM.render(viewController, appNode);
});
