import { useLayoutEffect, useRef } from 'react';
import { Label, Slider } from '@heroui/react';

/** A calculator slider (Deposit board): muted label left, value 600 right; border track, green fill, white 24 px thumb; bounds below. */
export function CalcSlider(p: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
}) {
  const text = p.format(p.value);
  // react-aria writes aria-valuetext from its number formatter («12»); a term, an amount or a cut needs its units.
  // Neither Slider nor Thumb takes a value-text prop, so it is set on the thumb's input after every render.
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    input.current?.setAttribute('aria-valuetext', text);
  });
  return (
    <Slider
      className="w-full gap-0.5"
      minValue={p.min}
      maxValue={p.max}
      step={p.step}
      value={p.value}
      onChange={(v) => p.onChange(Array.isArray(v) ? v[0] : v)}
    >
      <Label className="self-baseline text-secondary font-normal [color:var(--muted)]">{p.label}</Label>
      <Slider.Output className="self-baseline whitespace-nowrap text-body font-semibold">{text}</Slider.Output>
      <Slider.Track className="my-2.5 h-1 rounded-full bg-border data-[fill-start=true]:border-s-success">
        <Slider.Fill className="bg-success" />
        <Slider.Thumb inputRef={input} className="size-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)] after:hidden" />
      </Slider.Track>
      {(p.minLabel || p.maxLabel) && (
        <div aria-hidden="true" className="col-span-2 flex justify-between text-caption text-muted tabular-nums">
          <span>{p.minLabel}</span>
          <span>{p.maxLabel}</span>
        </div>
      )}
    </Slider>
  );
}
