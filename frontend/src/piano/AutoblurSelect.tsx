import React, { ChangeEvent, Component, RefObject } from 'react';

interface AutoblurSelectProps {
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  className: string;
  value: any;
  children: React.ReactNode;
}

export class AutoblurSelect extends Component<AutoblurSelectProps> {
  selectRef: RefObject<HTMLSelectElement>;

  constructor(props: AutoblurSelectProps) {
    super(props);
    this.selectRef = React.createRef<HTMLSelectElement>();
  }

  onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    this.props.onChange(event);
    this.selectRef.current?.blur();
  };

  render() {
    const { children, ...otherProps } = this.props;
    return (
      <select {...otherProps} onChange={this.onChange} ref={this.selectRef}>
        {children}
      </select>
    );
  }
}

export default AutoblurSelect;
