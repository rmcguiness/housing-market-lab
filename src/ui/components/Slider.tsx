import { useRef, useState } from "react";

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

const TIP_WIDTH = 240;
const MARGIN = 8;

/**
 * Info icon whose tooltip is `position: fixed` and placed via measured screen
 * coordinates. The sidebar scrolls (`overflow-y: auto`), which clips any
 * `position: absolute` descendant to its box — `fixed` escapes that entirely, so
 * the tip can render above every other element regardless of which panel it's in.
 */
export function InfoIcon({ text, label }: { text: string; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(
      Math.max(MARGIN, r.left),
      window.innerWidth - TIP_WIDTH - MARGIN
    );
    setPos({ top: r.bottom + 6, left });
  };

  return (
    <span className="info-wrap">
      <button
        ref={ref}
        type="button"
        className="info-icon"
        aria-label={`What is ${label}?`}
        onClick={(e) => e.preventDefault()}
        onMouseEnter={place}
        onFocus={place}
        onMouseLeave={() => setPos(null)}
        onBlur={() => setPos(null)}
      >
        i
      </button>
      {pos && (
        <span
          className="info-tip"
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: TIP_WIDTH }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
