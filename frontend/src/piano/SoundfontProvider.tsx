import React, { Component } from 'react';
import Soundfont from 'soundfont-player';
import { SoundfontProviderProps } from './SoundfontProviderProps';

interface SoundfontProviderState {
  isLoading: boolean;
  instrument: any | null;
}

export class SoundfontProvider extends Component<SoundfontProviderProps, SoundfontProviderState> {
  state: SoundfontProviderState = {
    isLoading: true,
    instrument: null,
  };

  componentDidMount() {
    const { audioContext, instrumentName, hostname } = this.props;
    Soundfont.instrument(audioContext, instrumentName, { soundfont: 'MusyngKite', nameToUrl: (name: any, soundfont: any, format: any) => `${hostname}/${soundfont}/${name}-${format}.js` })
      .then(instrument => {
        this.setState({ instrument, isLoading: false });
      });
  }

  playNote = (midiNumber: any) => {
    this.state.instrument?.play(midiNumber);
  };

  stopNote = (midiNumber: any) => {
    this.state.instrument?.stop(midiNumber);
  };

  render() {
    return this.props.render({
      isLoading: this.state.isLoading,
      playNote: this.playNote,
      stopNote: this.stopNote,
    });
  }
}
