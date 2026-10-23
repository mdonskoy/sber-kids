import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Label, Radio, RadioGroup, Slider } from '@heroui/react';

afterEach(() => cleanup());

describe('HeroUI in jsdom', () => {
  it('fires onPress on a click', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Отправить</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  const slider = (onChange: (v: number | number[]) => void) =>
    render(
      <Slider minValue={0} maxValue={10} step={1} defaultValue={5} onChange={onChange}>
        <Label>Срок</Label>
        <Slider.Output />
        <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
      </Slider>,
    );

  it('changes a slider by keyboard', async () => {
    const onChange = vi.fn();
    slider(onChange);
    const thumb = screen.getByRole('slider');
    await userEvent.setup().type(thumb, '{ArrowRight}');
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([6]);
  });

  it('changes a slider by a change event on the range input', () => {
    const onChange = vi.fn();
    slider(onChange);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    expect(onChange.mock.calls.map(([v]) => v)).toEqual([8]);
  });

  it('selects a radio option', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="Категория" value="a" onChange={onChange}>
        <Radio value="a"><Radio.Content><Radio.Control><Radio.Indicator /></Radio.Control>Доставка еды</Radio.Content></Radio>
        <Radio value="b"><Radio.Content><Radio.Control><Radio.Indicator /></Radio.Control>Такси</Radio.Content></Radio>
      </RadioGroup>,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Такси' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
