import React from 'react';
import InputLabel from './InputLabel';

interface TextInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, placeholder, onChange }) => {
  return (
    <div className="flex items-center justify-end mb-4">
      <InputLabel
        value={label}
      />
      <input
        type="text"
        id="keyInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 block w-20 rounded-md bg-slate-100 border-slate-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-slate-800"
        placeholder={placeholder}
      />
    </div>
  );
};

export default TextInput;
