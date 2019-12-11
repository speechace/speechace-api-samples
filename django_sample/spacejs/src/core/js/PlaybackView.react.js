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

import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";

//
// Component Definition
//

class PlaybackView extends Component {
    static propTypes = {
        size: PropTypes.number,
        color: PropTypes.string,
        fillColor: PropTypes.string,
        focusColor: PropTypes.string,
        passiveFillColor: PropTypes.string,
        alpha: PropTypes.number,
        stream: PropTypes.object,
        notifyClick: PropTypes.func,
        containerClassName: PropTypes.string,
        usePause: PropTypes.bool,
        tabIndex: PropTypes.number,
        startLabel: PropTypes.string,
        stopLabel: PropTypes.string
    };

    static defaultProps = {
        size: 42,
        color: "#1ccff6",
        fillColor: "#fff",
        focusColor: "#008a02",
        passiveFillColor: "none",
        alpha: 1,
        stream: null,
        notifyClick: null,
        containerClassName: null,
        usePause: false,
        tabIndex: null,
        startLabel: "Play or Stop example audio",
        stopLabel: "Stop playing audio"
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
            if (nextProps.stream !== null) {
                this.setState({
                    animateContext: window.requestAnimationFrame(
                        this._animate.bind(this)
                    )
                });
            }
        } else {
            if (nextProps.stream === null) {
                window.cancelAnimationFrame(this.state.animateContext);
                this.setState({ animateContext: null });
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
        var containerStyle = {
            position: "relative",
            cursor: "pointer",
            verticalAlign: "middle",
            outline: 0
        };
        var viewBox = null;
        if (!this.props.containerClassName) {
            containerStyle.width = size;
            containerStyle.height = size;
        } else {
            viewBox = "0 0 " + size + " " + size;
        }

        var strokeWidth = 1;
        var symbolStrokeWidth = strokeWidth;
        if (size >= 60) {
            strokeWidth = 2;
            symbolStrokeWidth = 4;
        }
        var radius = size / 2 - strokeWidth;
        var centerX = size / 2;
        var centerY = size / 2;

        var circlePassiveStyle = {
            fill: this.props.passiveFillColor,
            stroke: this.props.color,
            strokeWidth: strokeWidth
        };

        var circleActiveStyle = {
            fill: this.props.color,
            stroke: this.props.color,
            strokeWidth: strokeWidth
        };

        var symbolPassiveStyle = {
            stroke: this.props.color,
            strokeWidth: symbolStrokeWidth,
            fill: this.props.color,
            strokeLinecap: "round",
            strokeLinejoin: "round"
        };

        var symbolActiveStyle = {
            stroke: this.props.fillColor,
            strokeWidth: symbolStrokeWidth,
            fill: this.props.fillColor,
            strokeLinecap: "round",
            strokeLinejoin: "round"
        };

        var circleStyle = circlePassiveStyle;
        var symbolStyle = symbolPassiveStyle;

        var symbol = null;
        var arc = null;
        var ariaLabel = null;
        var ariaPressed;
        if (this.props.stream) {
            var arcStokeWidth = 2;
            var arcRadius = size / 2 - arcStokeWidth - 1;
            if (arcRadius <= 0) {
                arcRadius = 1;
            }
            var arcP1 = computeCirclePoint(90, arcRadius, [centerX, centerY]);
            var progress = this.props.stream.progress() * 360;
            if (progress < 0) {
                progress = 1;
            }
            if (progress >= 360) {
                progress = 359.9999999;
            }
            var arcP2 = computeCirclePoint(90 - progress, arcRadius, [
                centerX,
                centerY
            ]);
            var largeArcFlag = progress > 180 ? 1 : 0;
            var arcPathStr =
                "M" +
                arcP1[0] +
                "," +
                arcP1[1] +
                " A" +
                arcRadius +
                "," +
                arcRadius +
                " 1 " +
                largeArcFlag +
                " 1 " +
                arcP2[0] +
                "," +
                arcP2[1];
            var arcStyle = {
                stroke: this.props.fillColor,
                strokeWidth: arcStokeWidth,
                fill: "none"
            };
            circleStyle = circleActiveStyle;
            symbolStyle = symbolActiveStyle;
            arc = <path style={arcStyle} d={arcPathStr} />;
            if (this.props.usePause && this.props.stream.isPause) {
                if (this.props.stream.isPause()) {
                    symbol = this._renderPlaySymbol(
                        size,
                        symbolStyle,
                        centerX,
                        centerY
                    );
                    ariaLabel = this.props.startLabel;
                    ariaPressed = false;
                } else {
                    symbol = this._renderPauseSymbol(
                        size,
                        symbolStyle,
                        centerX,
                        centerY
                    );
                    ariaPressed = true;
                }
            } else {
                symbol = this._renderStopSymbol(
                    size,
                    symbolStyle,
                    centerX,
                    centerY
                );
                ariaPressed = true;
            }
        } else {
            if (this.state.hover) {
                circleStyle = circleActiveStyle;
                symbolStyle = symbolActiveStyle;
            } else if (this.state.focus) {
                circleStyle = circleActiveStyle;
                circleStyle.fill = this.props.focusColor;
                circleStyle.stroke = this.props.focusColor;
                symbolStyle = symbolActiveStyle;
            }

            symbol = this._renderPlaySymbol(
                size,
                symbolStyle,
                centerX,
                centerY
            );
            ariaLabel = this.props.startLabel;
            ariaPressed = false;
        }

        let extraProps = {};
        if (this.props.tabIndex !== null) {
            extraProps.onKeyPress = this._handleKeyPress.bind(this);
            extraProps.onFocus = this._handleFocus.bind(this);
            extraProps.onBlur = this._handleBlur.bind(this);
        }

        return (
            <svg
                className={this.props.containerClassName}
                style={containerStyle}
                aria-label={ariaLabel}
                aria-pressed={ariaPressed}
                role="button"
                onClick={this._handleClick.bind(this)}
                onMouseEnter={this._handleMouseEnter.bind(this)}
                onMouseLeave={this._handleMouseLeave.bind(this)}
                viewBox={viewBox}
                tabIndex="0"
                {...extraProps}>
                <circle
                    style={circleStyle}
                    cx={centerX}
                    cy={centerY}
                    r={radius}
                />
                {arc}
                {symbol}
            </svg>
        );
    }

    _renderPlaySymbol(size, symbolStyle, centerX, centerY) {
        var triangleRadius = size * 0.15;
        var p1 = computeCirclePoint(0, triangleRadius, [centerX, centerY]);
        var p2 = computeCirclePoint(120, triangleRadius, [centerX, centerY]);
        var p3 = computeCirclePoint(240, triangleRadius, [centerX, centerY]);
        var pathStr =
            "M" +
            p1[0] +
            "," +
            p1[1] +
            " L" +
            p2[0] +
            "," +
            p2[1] +
            " L" +
            p3[0] +
            "," +
            p3[1] +
            " z";
        return <path style={symbolStyle} d={pathStr} />;
    }

    _renderStopSymbol(size, symbolStyle, centerX, centerY) {
        var squareRadius = size * 0.15;
        var squareSize = Math.sqrt(Math.pow(2 * squareRadius, 2) / 2);
        var squarePt = computeCirclePoint(135, squareRadius, [
            centerX,
            centerY
        ]);
        return (
            <rect
                style={symbolStyle}
                x={squarePt[0]}
                y={squarePt[1]}
                width={squareSize}
                height={squareSize}
            />
        );
    }

    _renderPauseSymbol(size, symbolStyle, centerX, centerY) {
        var squareRadius = size * 0.15;
        var squareSize = Math.sqrt(Math.pow(2 * squareRadius, 2) / 2);
        var squarePt = computeCirclePoint(135, squareRadius, [
            centerX,
            centerY
        ]);

        return (
            <Fragment>
                <rect
                    style={symbolStyle}
                    x={squarePt[0]}
                    y={squarePt[1]}
                    width={squareSize / 4.0}
                    height={squareSize}
                />
                <rect
                    style={symbolStyle}
                    x={squarePt[0] + (3.0 * squareSize) / 4.0}
                    y={squarePt[1]}
                    width={squareSize / 4.0}
                    height={squareSize}
                />
            </Fragment>
        );
    }

    _handleClick(eventObj) {
        if (this.props.notifyClick !== null) {
            if (!this.props.notifyClick()) {
                eventObj.stopPropagation();
            }
        }
    }

    _handleKeyPress(eventObj) {
        if (eventObj.key === "Enter" || eventObj.key === " ") {
            this._handleClick(eventObj);
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
        if (this.props.stream) {
            this.setState({
                animateContext: window.requestAnimationFrame(
                    this._animate.bind(this)
                )
            });
        }
    }
}

export default PlaybackView;
