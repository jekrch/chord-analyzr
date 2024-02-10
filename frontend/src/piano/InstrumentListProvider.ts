import React, { Component } from 'react';

// Define a type for the component's props
type InstrumentListProviderProps = {
  hostname: string;
  soundfont: 'MusyngKite' | 'FluidR3_GM';
  render: (instrumentList: string[] | null) => JSX.Element;
};

// Define a type for the component's state
type InstrumentListProviderState = {
  instrumentList: string[] | null;
};

class InstrumentListProvider extends Component<InstrumentListProviderProps, InstrumentListProviderState> {
  // Set default props using static defaultProps
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
