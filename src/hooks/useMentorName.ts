import { useState } from 'react';

const LS_KEY = 'onchet_mentor_name';

export function useMentorName() {
  const [name, setNameState] = useState<string>(
    () => localStorage.getItem(LS_KEY) ?? ''
  );

  const setName = (value: string) => {
    localStorage.setItem(LS_KEY, value);
    setNameState(value);
  };

  return [name, setName] as const;
}
