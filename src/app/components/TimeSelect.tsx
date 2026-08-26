interface TimeSelectProps {
  value: string; // "HH:mm" or "" (if allowEmpty=true)
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  className?: string;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

function snapToSlot(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(':');
  const h = parts[0] ?? '00';
  const min = parseInt(parts[1] ?? '0', 10);
  const m = min < 15 ? '00' : '30';
  return `${h}:${m}`;
}

export function TimeSelect({ value, onChange, allowEmpty, className }: TimeSelectProps) {
  const snapped = value ? snapToSlot(value) : '';

  const cls = `px-2 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-center ${className ?? ''}`;

  return (
    <select
      value={snapped}
      onChange={e => onChange(e.target.value)}
      className={cls}
    >
      {allowEmpty && <option value="">--</option>}
      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}
