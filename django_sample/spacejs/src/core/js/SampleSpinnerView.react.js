"use strict";

import React from "react";

import "./SampleSpinnerView.react.css";

class SampleSpinnerView extends React.Component {
    render() {
        let styleObj = {
            width: "100%",
            height: "100%"
        };
        return (
            <div>
                <div className="spinner-wrapper">
                    <div className="lds-css ng-scope">
                        <div style={styleObj} className="lds-eclipse">
                            <div />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default SampleSpinnerView;
