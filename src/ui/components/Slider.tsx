interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  /** Optional plain-language explanation shown in a hover/tap tooltip. */
  info?: string;
  onChange: (v: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  info,
  onChange,
}: SliderProps) {
  return (
    <div className="control">
      <div className="control-label">
        <span>
          {label}
          {info && <InfoIcon text={info} label={label} />}
        </span>
        <span className="control-value">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function InfoIcon({ text, label }: { text: string; label: string }) {
  return (
    <span className="info-wrap">
      <button
        type="button"
        className="info-icon"
        aria-label={`What is ${label}?`}
        onClick={(e) => e.preventDefault()}
      >
        i
      </button>
      <span className="info-tip" role="tooltip">
        {text}
      </span>
    </span>
  );
}
