// components/DatePicker.tsx
'use client';
import { useState } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  name?: string;
}

export function DatePicker({ value, onChange, name }: DatePickerProps) {
  const [date, setDate] = useState(value || new Date().toLocaleDateString('en-CA'));

  return (
    <input
      type="date"
      name={name}
      value={date}
      onChange={(e) => {
        setDate(e.target.value);
        onChange(e.target.value);
      }}
      className="w-full bg-transparent px-4 py-4 rounded-2xl border border-[#2C2C2E] text-white focus:border-[#0A84FF] outline-none transition-all appearance-none text-left relative"
      style={{ colorScheme: 'dark' }}
    />
  );
}