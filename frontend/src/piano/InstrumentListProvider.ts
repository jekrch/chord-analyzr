import React, { Component } from 'react';

type InstrumentListProviderProps = {
  hostname: string;
  soundfont: 'MusyngKite' | 'FluidR3_GM';
  render: (instrumentList: string[] | null) => JSX.Element;
};

type InstrumentListProviderState = {
  instrumentList: string[] | null;
};

class InstrumentListProvider extends Component<InstrumentListProviderProps, InstrumentListProviderState> {

  static defaultProps: Partial<InstrumentListProviderProps> = {
    soundfont: 'MusyngKite',
  };

  state: InstrumentListProviderState = {
    instrumentList: null,
  };

  componentDidMount() {
    this.loadInstrumentList();
  }

  loadInstrumentList = () => {
    fetch(`${this.props.hostname}/${this.props.soundfont}/names.json`)
      .then((response) => response.json())
      .then((data: string[]) => {
        this.setState({
          instrumentList: data,
        });
      });
  };

  render() {
    return this.props.render(this.state.instrumentList);
  }
}

export default InstrumentListProvider;