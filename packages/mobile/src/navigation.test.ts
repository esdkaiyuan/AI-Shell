import { describe, expect, it } from 'vitest';
import {
  isPanelOpen,
  isPanelRoot,
  panelActions,
  panelContentMode,
  panelDestinations,
  panelGroups,
  panelTitle,
  type PanelTintRole,
} from './navigation';

describe('trailing-sheet navigation', () => {
  it('keeps every destination reachable from the sheet root', () => {
    expect(panelDestinations).toEqual([
      'ai', 'explorer', 'ssh', 'sessions', 'history', 'settings', 'profile',
    ]);
    expect(panelGroups.map(group => group.title)).toEqual([
      '智能辅助', '工作区', '终端操作', '偏好',
    ]);
    expect(panelGroups.flatMap(group => group.items).length).toBe(
      panelDestinations.length + panelActions.length
    );
  });

  it('separates destinations from in-place terminal actions', () => {
    expect(panelActions).toEqual([
      'newLocalTerminal', 'toggleSplit', 'toggleSearch',
      'copyOutput', 'paste', 'clearPane',
    ]);
    const destinationKeys = panelGroups.flatMap(group =>
      group.items.filter(item => item.kind === 'destination').map(item => item.key)
    );
    expect(destinationKeys).toEqual(panelDestinations);
    for (const key of destinationKeys) {
      expect(panelActions).not.toContain(key);
    }
  });

  it('gives every row a title, subtitle, icon and a semantic tint role', () => {
    const roles = new Set<PanelTintRole>([
      'accent',
      'success',
      'warning',
      'danger',
      'neutral',
    ]);
    for (const item of panelGroups.flatMap(group => group.items)) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.subtitle.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
      // The tint is a role, not a literal colour: the concrete value is
      // resolved from the live theme so both appearances stay correct.
      expect(roles.has(item.tint)).toBe(true);
    }
  });

  it('treats terminal as the dismissed sheet', () => {
    expect(isPanelOpen('terminal')).toBe(false);
    expect(isPanelOpen('menu')).toBe(true);
    expect(isPanelOpen('ai')).toBe(true);
    expect(isPanelOpen('settings')).toBe(true);
  });

  it('only the menu root hides the back button', () => {
    expect(isPanelRoot('menu')).toBe(true);
    expect(isPanelRoot('ai')).toBe(false);
    expect(isPanelRoot('terminal')).toBe(false);
  });

  it('labels every section including the sheet root', () => {
    expect(panelTitle('menu')).toBe('功能');
    expect(panelTitle('ai')).toBe('AI 助手');
    expect(panelTitle('explorer')).toBe('文件');
    expect(panelTitle('sessions')).toBe('会话');
    expect(panelTitle('terminal')).toBe('终端');
  });

  it('only the AI workspace owns a flex-height composer', () => {
    expect(panelContentMode('ai')).toBe('flex');
    for (const section of ['menu', 'explorer', 'ssh', 'sessions', 'history', 'settings', 'profile'] as const) {
      expect(panelContentMode(section)).toBe('scroll');
    }
  });
});
