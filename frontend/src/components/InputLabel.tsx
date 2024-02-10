import classNames from 'classnames';
import React from 'react';

interface InputLabelProps {
    value: string;
    className?: string;
  }

const InputLabel: React.FC<InputLabelProps> = (props: InputLabelProps) => {
    return (
        <label className={classNames("mr-[1em] flex-1 text-right text-sm font-medium text-slate-400", props.className)}>
            {props.value}
        </label>
    );
  };
  
  export default InputLabel;