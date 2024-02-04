import React from 'react';

interface TextInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, placeholder, onChange }) => {
  return (
    <div className="flex items-center justify-end mb-4">
      <label htmlFor="keyInput" className="mr-[1em] flex-1 text-right text-sm font-medium text-slate-400">
        {label}
      </label>
      <input
        type="text"
        id="keyInput"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 block w-20 rounded-md border-slate-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-slate-800"
        placeholder={placeholder}
      />
    </div>
  );
};

export default TextInput;
