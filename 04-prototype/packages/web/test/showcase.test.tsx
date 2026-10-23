import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { CATALOGS } from '@proto/catalog';
import { mountSurface } from '../src/showcase/mount';
import { Showcase } from '../src/showcase/Showcase';
import { showcaseCases } from '../src/showcase/fixtures';

afterEach(() => cleanup());

describe('catalog showcase', () => {
  it('has a normal case for every young-adult component, static-only included', () => {
    const covered = new Set(showcaseCases().filter((c) => c.variant === 'normal').map((c) => c.component));
    for (const def of CATALOGS['young-adult'].components) expect(covered, def.name).toContain(def.name);
  });
  it('renders every case without an error', () => {
    const errors = vi.spyOn(console, 'error');
    for (const c of showcaseCases()) {
      const { container, unmount } = render(<A2uiSurface surface={mountSurface(c.components, c.data)} />);
      if (c.variant === 'no-data') expect(container.textContent, `${c.component} ${c.variant}`).toBe('');
      else expect(container.textContent?.length, `${c.component} ${c.variant}`).toBeGreaterThan(0);
      unmount();
    }
    expect(errors).not.toHaveBeenCalled();
  });
  it('renders the page with its component groups and the HomeScreen group, without console errors', () => {
    const errors = vi.spyOn(console, 'error');
    render(<Showcase />);
    expect(screen.getByRole('heading', { level: 2, name: 'Каталог виджетов' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'DepositCalculator' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'HomeScreen' })).toBeTruthy();
    expect(errors).not.toHaveBeenCalled();
  });
});
