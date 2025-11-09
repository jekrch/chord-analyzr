import React, { Component } from 'react';

type InstrumentListProviderProps = {
  hostname: string;
  soundfont: 'MusyngKite' | 'FluidR3_GM';
  render: (instrumentList: string[] | null, isLoading: boolean) => void;
};

type InstrumentListProviderState = {
  instrumentList: string[] | null;
  isLoading: boolean;
  error: Error | null;
};

class InstrumentListProvider extends Component<InstrumentListProviderProps, InstrumentListProviderState> {

  static defaultProps: Partial<InstrumentListProviderProps> = {
    soundfont: 'MusyngKite',
  };

  state: InstrumentListProviderState = {
    instrumentList: null,
    isLoading: true,
    error: null,
  };

  componentDidMount() {
    this.loadInstrumentList();
  }

  loadInstrumentList = async () => {
    try {
      const response = await fetch(`${this.props.hostname}/${this.props.soundfont}/names.json`);

      if (!response.ok) {
        throw new Error(`Failed to load instruments: ${response.status}`);
      }

      const data: string[] = await response.json();

      this.setState({
        instrumentList: data,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error loading instrument list:', error);
      this.setState({
        isLoading: false,
        error: error as Error,
      });
    }
  };

  componentDidUpdate(prevProps: InstrumentListProviderProps, prevState: InstrumentListProviderState) {
    // Check if loading just finished and we have a new list
    if (
      prevState.isLoading &&
      !this.state.isLoading &&
      this.state.instrumentList &&
      this.state.instrumentList !== prevState.instrumentList
    ) {
      this.props.render(this.state.instrumentList, this.state.isLoading);
    }
  }

  render() {
    return null;
  }
}

export default InstrumentListProvider;