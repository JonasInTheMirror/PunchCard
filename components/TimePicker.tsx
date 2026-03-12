// components/TimePicker.tsx
'use client';
import { useState } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  name?: string;
}

export function TimePicker({ value, onChange, name }: TimePickerProps) {
  const [time, setTime] = useState(value || '09:00');

  return (
    <input
      type="time"
      name={name}
      value={time}
      onChange={(e) => {
        setTime(e.target.value);
        onChange(e.target.value);
      }}
      className="w-full bg-[#1C1C1E] p-4 rounded-2xl border border-[#2C2C2E] text-white focus:border-[#0A84FF] outline-none transition-all text-center text-xl"
      style={{ colorScheme: 'dark' }}
    />
  );
}