interface TimeSelectProps {
  value: string; // "HH:mm" or "" (if allowEmpty=true)
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '30'];

function snapMinute(rawMin: number): string {
  return rawMin < 15 ? '00' : '30';
}

export function TimeSelect({ value, onChange, allowEmpty }: TimeSelectProps) {
  let hour = '';
  let minute = '';

  if (value) {
    const parts = value.split(':');
    hour = parts[0] ?? '00';
    minute = snapMinute(parseInt(parts[1] ?? '0', 10));
  }

  const cls = 'w-20 px-2 py-2.5 bg-white rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-center';

  const handleHourChange = (newHour: string) => {
    if (!newHour && allowEmpty) { onChange(''); return; }
    onChange(`${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    if (!newMinute && allowEmpty) { onChange(''); return; }
    onChange(`${hour || '00'}:${newMinute}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select value={hour} onChange={(e) => handleHourChange(e.target.value)} className={cls}>
        {allowEmpty && <option value="">--</option>}
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-500 font-bold text-lg">:</span>
      <select value={minute} onChange={(e) => handleMinuteChange(e.target.value)} className={cls}>
        {allowEmpty && <option value="">--</option>}
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}
