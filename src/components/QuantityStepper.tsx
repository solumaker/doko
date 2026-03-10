import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({ value, onChange, min = 1, max }: QuantityStepperProps) {
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => canDecrement && onChange(value - 1)}
        disabled={!canDecrement}
        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <span className="w-10 text-center text-lg font-bold text-slate-900 tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
