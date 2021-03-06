import React from 'react';
import { timeFormat } from 'd3-time-format'
import { Connector, Update } from '../connector';

export interface TextSinkProperties {
    sources: string[],
    connector: Connector,
}

export interface TextSinkLine {
    id: string,
    timestamp: Date,
    data: string,
}

export interface TextSinkState {
    lineData: TextSinkLine[],
    lastLines: TextSinkLine[],
}

class TextSink extends React.Component<TextSinkProperties, TextSinkState> {
    constructor(props: TextSinkProperties) {
        super(props)

        this.state = {
            lineData: [],
            lastLines: [],
        };

        let me = this;
        let wsUpdater = function (id: string, data: Update) {
            let incomming = '';
            for (let i = 0; i < data.Packet.ItmData.payload.length; i++) {
                let byte = data.Packet.ItmData.payload[i];
                incomming += String.fromCharCode(byte);
            }

            const split = incomming.split('\n');

            me.setState(state => {
                // Store current state data.
                let lineData = state.lineData;
                let lastLines = state.lastLines;

                // Find the last line corresponding to the trace.
                const lastLineIndex = lastLines.findIndex(line => line.id === id);
                const lastLine = lastLines[lastLineIndex];

                // If we have a previous line, we add the split data to it.
                if (lastLine) {
                    lastLine.data += split[0];
                } else {
                    // If we have no previous line, create a new one.
                    const newLine = {
                        id,
                        timestamp: new Date(),
                        data: split[0],
                    };
                    lastLines.push(newLine);
                }

                // If we have a second split element, that means we encountered a newline.
                // So we need to push the last line to the linedata.
                // Then we recycle the previous last line and add a new timestamp + data.
                if (split.length === 2) {
                    lineData.push({ ...lastLine });
                    lastLine.timestamp = new Date();
                    lastLine.data = split[1];
                }

                return {
                    lineData,
                    lastLines,
                }
            });
        };
        props.sources.forEach(source => props.connector.registerMessageHandler(source, (id, update) => wsUpdater(id, update)));
    }

    formatTime(arg: any): string {
        return timeFormat('%Y %b %d')(arg)
    }

    render() {
        return (<div className="text-sink">{this.state.lineData.map((line, i) => [
            <span className="line" key={i}>
                <strong>{line.id}> </strong>
                <span>{line.data}</span>
            </span>,
            <br key={i + '-br'} />
        ])}</div>)
    }
}

export default TextSink;