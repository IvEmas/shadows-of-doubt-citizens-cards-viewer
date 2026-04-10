'use client';

import { useEffect, useRef, useState } from 'react';

import { VisibilitySettings } from '@/lib/types';

type Props = {
  value: VisibilitySettings;
  onChange: (value: VisibilitySettings) => void;
};

const LABELS: { key: keyof VisibilitySettings; label: string }[] = [
  { key: 'showHome', label: 'Home' },
  { key: 'showWork', label: 'Work' },
  { key: 'showRelations', label: 'Relations' },
  { key: 'showSecurity', label: 'Security' },
  { key: 'showExtra', label: 'Extra' },
];

export function FieldToggles({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const enabledCount = LABELS.filter((item) => value[item.key]).length;

  return (
    <div className="dropdownWrap" ref={rootRef}>
      <button className={`compactControl dropdownTrigger ${open ? 'isOpen' : ''}`} type="button" onClick={() => setOpen((current) => !current)}>
        <span>Visible blocks</span>
        <strong>{enabledCount}</strong>
      </button>

      {open ? (
        <div className="dropdownPanel">
          {LABELS.map((item) => {
            const checked = value[item.key];

            return (
              <label key={item.key} className="dropdownOption">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      [item.key]: e.target.checked,
                    })
                  }
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
