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

function degreeToRadian(degree) {
    return (degree / 180.0) * Math.PI;
}

function computeCirclePoint(degree, radius, origin) {
    var normalOrigin = [origin[0], -origin[1]];
    var u = [
        radius * Math.cos(degreeToRadian(degree)),
        radius * Math.sin(degreeToRadian(degree))
    ];
    u[0] = u[0] + normalOrigin[0];
    u[1] = (u[1] + normalOrigin[1]) * -1;
    return u;
}

//
// Dependencies
//

import React from "react";
import PropTypes from "prop-types";

//
// Component Definition
//

class MicrophoneView extends React.Component {
    static propTypes = {
        size: PropTypes.number,
        color: PropTypes.string,
        fillColor: PropTypes.string,
        volumeFillColor: PropTypes.string,
        alpha: PropTypes.number,
        recordingStream: PropTypes.object,
        notifyClick: PropTypes.func,
        verticalAlign: PropTypes.string,
        overflow: PropTypes.bool,
        tabIndex: PropTypes.number,
        pending: PropTypes.bool,
        startLabel: PropTypes.string,
        stopLabel: PropTypes.string
    };

    static defaultProps = {
        size: 300,
        color: "#1ccff6",
        fillColor: "#fff",
        focusColor: "#008a02",
        volumeFillColor: "#bbb",
        alpha: 1,
        recordingStream: null,
        notifyClick: null,
        verticalAlign: "none",
        overflow: false,
        tabIndex: null,
        pending: false,
        startLabel: "Start recording audio",
        stopLabel: "Stop recording audio"
    };

    constructor(props) {
        super(props);
        this.state = {
            hover: false,
            focus: false,
            animateFrame: null,
            animateContext: null
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.animateContext === null) {
            if (nextProps.recordingStream !== null) {
                this.setState({
                    animateContext: window.requestAnimationFrame(
                        this._animate.bind(this)
                    )
                });
            }
        } else {
            if (nextProps.recordingStream === null) {
                window.cancelAnimationFrame(this.state.animateContext);
                this.setState({ animateContext: null });
            }
        }
    }

    componentDidMount() {
        if (this.state.animateContext === null) {
            if (this.props.recordingStream !== null) {
                this.setState({
                    animateContext: window.requestAnimationFrame(
                        this._animate.bind(this)
                    )
                });
            }
        }
    }

    componentWillUnmount() {
        if (this.state.animateContext !== null) {
            window.cancelAnimationFrame(this.state.animateContext);
            this.setState({ animateContext: null });
        }
    }

    render() {
        var size = this.props.size;
        var min = size / 2;
        var max = size;

        var containerSize;
        var inner;

        var volumeView = null;
        var useOverflow = this.props.overflow;
        if (this.props.recordingStream && this.props.recordingStream.opened) {
            containerSize = size;
            var actual = min + this._power() * (max - min);
            if (min + 2 > actual) {
                actual += 2;
            }
            var outer = (size - actual) / 2;
            var outerSize = actual;
            var outerCx = outer + outerSize / 2;
            var outerCy = outer + outerSize / 2;
            var volumeViewStyle = {
                fill: this.props.volumeFillColor
            };

            var translation = -(containerSize / 4);
            if (useOverflow) {
                outerCx += translation;
                outerCy += translation;
            }

            volumeView = (
                <circle
                    style={volumeViewStyle}
                    cx={outerCx}
                    cy={outerCy}
                    r={outerSize / 2}
                />
            );

            inner = (size - min) / 2;
            if (useOverflow) {
                inner += translation;
            }
        } else {
            if (useOverflow) {
                containerSize = size / 2;
                inner = 0;
                useOverflow = false;
            } else {
                containerSize = size;
                inner = (size - min) / 2;
            }
        }

        var innerMicView = this._renderMicView(inner, inner, min, min);

        var containerStyle = {
            width: containerSize,
            height: containerSize,
            position: "relative",
            cursor: "pointer",
            MozUserSelect: "none",
            WebkitUserSelect: "none",
            msUserSelect: "none",
            userSelect: "none",
            verticalAlign: this.props.verticalAlign
        };

        if (useOverflow) {
            containerStyle.width = containerSize / 2;
            containerStyle.height = containerSize / 2;
            containerStyle.overflow = "visible";
        }

        return (
            <svg style={containerStyle}>
                {volumeView}
                {innerMicView}
            </svg>
        );
    }

    _renderMicView(x, y, width, height) {
        var strokeWidthValue = 2.0;
        if (strokeWidthValue * 5 > width) {
            strokeWidthValue = 1.0;
            if (strokeWidthValue * 3 > width) {
                strokeWidthValue = 0;
            }
        }

        var circleStyle = null;
        var rectStyle = null;
        var pathStyle = null;
        var lineStyle = null;

        var rect = undefined;
        var path = undefined;
        var line = undefined;

        var circleCx = width / 2;
        var circleCy = width / 2;
        var ariaLabel = this.props.startLabel;
        var ariaPressed = false;
        if (this.props.recordingStream === null && !this.props.pending) {
            if (!this.state.hover && !this.state.focus) {
                circleStyle = {
                    fill: this.props.fillColor,
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.color
                };

                rectStyle = {
                    fill: this.props.color
                };

                pathStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.color
                };

                lineStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.color
                };
            } else {
                var activeColor = this.state.hover
                    ? this.props.color
                    : this.props.focusColor;

                circleStyle = {
                    fill: activeColor,
                    strokeWidth: strokeWidthValue,
                    stroke: activeColor
                };

                rectStyle = {
                    fill: this.props.fillColor
                };

                pathStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.fillColor
                };

                lineStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.fillColor
                };
            }
        } else {
            if (this.props.pending || !this.props.recordingStream.opened) {
                circleStyle = {
                    fill: "#FFF",
                    strokeWidth: strokeWidthValue,
                    stroke: !this.props.pending ? "#000" : "rgba(0, 0, 0, 0)"
                };

                rectStyle = {
                    fill: "#000"
                };

                pathStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: "#000"
                };

                lineStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: "#000"
                };
            } else {
                circleStyle = {
                    fill: this.props.color,
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.color
                };

                rectStyle = {
                    fill: this.props.fillColor
                };

                pathStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.fillColor
                };

                lineStyle = {
                    fill: "none",
                    strokeWidth: strokeWidthValue,
                    stroke: this.props.fillColor
                };

                var squareRadius = width * 0.15;
                var squareSize = Math.sqrt(Math.pow(2 * squareRadius, 2) / 2);
                var squarePt = computeCirclePoint(135, squareRadius, [
                    circleCx,
                    circleCy
                ]);

                rect = (
                    <rect
                        style={rectStyle}
                        x={squarePt[0]}
                        y={squarePt[1]}
                        width={squareSize}
                        height={squareSize}
                    />
                );
                path = null;
                line = null;

                ariaLabel = this.props.stopLabel;
                ariaPressed = true;
            }
        }

        var circleR = circleCx - strokeWidthValue;

        var rectRx = width / 16;
        var rectRy = rectRx;
        var rectX = circleCx - rectRx;
        var rectY = width / 3;
        var rectWidth = rectRx * 2;
        var rectHeight = rectWidth * 2;

        var pathR = Math.max((rectRx * 4) / 3, rectRx + strokeWidthValue * 2);
        var pathCx = circleCx;
        var pathCy = rectY + rectHeight - rectRy;
        var pathP1 = computeCirclePoint(0, pathR, [pathCx, pathCy]);
        var pathP2 = computeCirclePoint(180, pathR, [pathCx, pathCy]);
        var pathStr =
            "M" +
            pathP1[0] +
            "," +
            pathP1[1] +
            " A" +
            pathR +
            "," +
            pathR +
            " 1 1 1 " +
            pathP2[0] +
            "," +
            pathP2[1];

        var lineX1 = circleCx;
        var lineY1 = pathCy + pathR;
        var lineX2 = lineX1;
        var lineY2 = lineY1 + pathR - rectRx;

        if (rect === undefined) {
            rect = (
                <rect
                    style={rectStyle}
                    x={rectX}
                    y={rectY}
                    width={rectWidth}
                    height={rectHeight}
                    rx={rectRx}
                    ry={rectRy}
                />
            );
        }
        if (path === undefined) {
            path = <path style={pathStyle} d={pathStr} />;
        }
        if (line === undefined) {
            line = (
                <line
                    style={lineStyle}
                    x1={lineX1}
                    y1={lineY1}
                    x2={lineX2}
                    y2={lineY2}
                />
            );
        }

        var extraProps = {};
        if (this.props.tabIndex !== null && this.props.tabIndex !== undefined) {
            extraProps.tabIndex = this.props.tabIndex;
            extraProps.onKeyPress = this._handleKeyPress.bind(this);
            extraProps.onFocus = this._handleFocus.bind(this);
            extraProps.onBlur = this._handleBlur.bind(this);
        }
        var style = {
            outline: 0
        };

        return (
            <svg
                x={x}
                y={y}
                width={width}
                height={height}
                style={style}
                role="button"
                aria-label={ariaLabel}
                aria-pressed={ariaPressed}
                onClick={this._handleClick.bind(this)}
                onMouseEnter={this._handleMouseEnter.bind(this)}
                onMouseLeave={this._handleMouseLeave.bind(this)}
                {...extraProps}>
                <circle
                    style={circleStyle}
                    cx={circleCx}
                    cy={circleCy}
                    r={circleR}
                />
                {rect}
                {path}
                {line}
            </svg>
        );
    }

    _power() {
        if (this.props.recordingStream === null) {
            return 0;
        } else {
            return this.props.recordingStream.power();
        }
    }

    _handleClick() {
        if (this.props.notifyClick !== null && !this.props.pending) {
            this.props.notifyClick();
        }
    }

    _handleKeyPress(eventObj) {
        if (eventObj.key === "Enter" || eventObj.key === " ") {
            this._handleClick();
        }
    }

    _handleMouseEnter() {
        this.setState({ hover: true });
    }

    _handleMouseLeave() {
        this.setState({ hover: false });
    }

    _handleFocus() {
        this.setState({ focus: true });
    }

    _handleBlur() {
        this.setState({ focus: false });
    }

    _animate(timestamp) {
        this.setState({ animateFrame: timestamp });
        if (this.props.recordingStream) {
            this.setState({
                animateContext: window.requestAnimationFrame(
                    this._animate.bind(this)
                )
            });
        }
    }
}

export default MicrophoneView;
