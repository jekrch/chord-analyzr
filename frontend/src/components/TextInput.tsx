import React from 'react';
import InputLabel from './InputLabel';
import classNames from 'classnames';

interface TextInputProps {
  label: string;
  className?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, placeholder, onChange, className }) => {
  return (
    <div className={classNames("flex items-center justify-end", className)}>
      <InputLabel
        value={label}
      />
      <input
        type="text"
        id="keyInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 block w-20 rounded-md bg-[var(--mcb-text-primary)] border-[var(--mcb-text-tertiary)] shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-slate-800"
        placeholder={placeholder}
      />
    </div>
  );
};

export default TextInput;
