import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionRow, Amount, CalcResult, CalcSlider, KeyValue, duration, rub, ratePct } from '../src/ui';

afterEach(() => cleanup());

describe('building blocks', () => {
  it('formats roubles, terms and rates the bank way', () => {
    expect(rub(45000).replace(/\s/g, ' ')).toBe('45 000 ₽');
    expect(ratePct(0.145)).toBe('14,5% годовых');
    expect([8, 12, 24, 60, 18, 38].map(duration)).toEqual(['8 мес.', '1 год', '2 года', '5 лет', '1 год 6 мес.', '3 года 2 мес.']);
    expect([132, 168, 252].map(duration)).toEqual(['11 лет', '14 лет', '21 год']);
  });
  it('puts one primary action first', () => {
    const a = vi.fn();
    const b = vi.fn();
    render(<ActionRow primary={{ label: 'Подтвердить', onPress: a }} secondary={[{ label: 'Отмена', onPress: b }]} />);
    const buttons = screen.getAllByRole('button').map((x) => x.textContent);
    expect(buttons).toEqual(['Подтвердить', 'Отмена']);
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(a).toHaveBeenCalledTimes(1);
  });
  it('marks figures that are being recalculated', () => {
    const { rerender } = render(<CalcResult isCurrent={false}><Amount value={1000} /></CalcResult>);
    expect(screen.getByText('Пересчитываем…')).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    rerender(<CalcResult isCurrent><Amount value={1000} /></CalcResult>);
    // The line keeps its height (the button below must not jump) but is hidden from everyone.
    const reserved = screen.getByText('Пересчитываем…');
    expect(reserved.getAttribute('aria-hidden')).toBe('true');
    expect(reserved.className).toContain('invisible');
  });
  it('gives a slider its value with units for screen readers', () => {
    const slider = (value: number) => <CalcSlider label="Срок" value={value} min={3} max={36} step={1} format={duration} onChange={() => {}} />;
    const { rerender } = render(slider(12));
    expect(screen.getByRole('slider', { name: 'Срок' }).getAttribute('aria-valuetext')).toBe('1 год');
    rerender(slider(24));
    expect(screen.getByRole('slider', { name: 'Срок' }).getAttribute('aria-valuetext')).toBe('2 года');
    cleanup();
    render(<CalcSlider label="Сумма" value={45000} min={1000} max={500000} step={1000} format={rub} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'Сумма' }).getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('45 000 ₽');
  });
  it('renders label–value rows', () => {
    render(<KeyValue rows={[{ label: 'Ставка', value: '15% годовых' }]} />);
    expect(screen.getByText('Ставка')).toBeTruthy();
    expect(screen.getByText('15% годовых')).toBeTruthy();
  });
});
