import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_DEFINITIONS,
  findShortcutAction,
  formatShortcut,
  matchesShortcut,
  normalizeShortcutMap,
  normalizeShortcutSchemes,
  shortcutConflict,
  shortcutFromEvent,
  shortcutReservedReason,
  shortcutsEqual,
  type ShortcutKeyEvent,
} from './shortcuts';

const keyEvent = (overrides: Partial<ShortcutKeyEvent>): ShortcutKeyEvent => ({
  key: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
});

describe('shortcut key handling', () => {
  it('defines a default for every configurable action', () => {
    expect(SHORTCUT_DEFINITIONS.length).toBeGreaterThanOrEqual(7);
    for (const definition of SHORTCUT_DEFINITIONS) {
      expect(DEFAULT_SHORTCUTS[definition.action]).toBeTruthy();
    }
  });

  it('normalizes the platform primary modifier to the same portable shortcut', () => {
    expect(shortcutFromEvent(keyEvent({ key: 't', ctrlKey: true }), 'other')).toBe('Ctrl+T');
    expect(shortcutFromEvent(keyEvent({ key: 't', metaKey: true }), 'mac')).toBe('Ctrl+T');
    expect(shortcutFromEvent(keyEvent({ key: 'A', ctrlKey: true, shiftKey: true }), 'other')).toBe(
      'Ctrl+Shift+A'
    );
  });

  it('keeps Control combinations for the shell on macOS', () => {
    expect(shortcutFromEvent(keyEvent({ key: 'w', ctrlKey: true }), 'mac')).toBeNull();
    expect(shortcutFromEvent(keyEvent({ key: 't', metaKey: true }), 'other')).toBeNull();
    expect(matchesShortcut(keyEvent({ key: 'T', ctrlKey: true }), 'Ctrl+T', 'mac')).toBe(false);
    expect(matchesShortcut(keyEvent({ key: 'T', ctrlKey: true }), 'Ctrl+T', 'other')).toBe(true);
  });

  it('requires an accelerator modifier', () => {
    expect(shortcutFromEvent(keyEvent({ key: 't' }))).toBeNull();
    expect(shortcutFromEvent(keyEvent({ key: 'Shift', shiftKey: true }))).toBeNull();
    expect(shortcutFromEvent(keyEvent({ key: 't', altKey: true }))).toBe('Alt+T');
  });

  it('matches combinations with the platform primary modifier', () => {
    expect(matchesShortcut(keyEvent({ key: 'T', metaKey: true }), 'Ctrl+T', 'mac')).toBe(true);
    expect(
      matchesShortcut(keyEvent({ key: 'T', ctrlKey: true, shiftKey: true }), 'Ctrl+T', 'other')
    ).toBe(false);
    expect(matchesShortcut(keyEvent({ key: 'T', ctrlKey: true }), 'Ctrl+T', 'other')).toBe(true);
  });

  it('finds the configured action for a key event', () => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, toggleSplit: 'Ctrl+Alt+S' };
    expect(
      findShortcutAction(keyEvent({ key: 's', ctrlKey: true, altKey: true }), shortcuts, 'other')
    ).toBe('toggleSplit');
    expect(
      findShortcutAction(keyEvent({ key: 'n', ctrlKey: true }), shortcuts, 'other')
    ).toBeNull();
    expect(findShortcutAction(keyEvent({ key: 't', metaKey: true }), shortcuts, 'mac')).toBe(
      'newTerminal'
    );
    expect(findShortcutAction(keyEvent({ key: 't', ctrlKey: true }), shortcuts, 'mac')).toBeNull();
  });

  it('formats shortcuts for macOS and other platforms', () => {
    expect(formatShortcut('Ctrl+Shift+A', false)).toBe('Ctrl+Shift+A');
    expect(formatShortcut('Ctrl+Shift+A', true)).toBe('⌘⇧A');
  });

  it('detects conflicts with another action', () => {
    expect(shortcutConflict(DEFAULT_SHORTCUTS, 'toggleSplit', 'Ctrl+T')).toBe('newTerminal');
    expect(shortcutConflict(DEFAULT_SHORTCUTS, 'newTerminal', 'Ctrl+T')).toBeNull();
  });

  it('reserves number combinations for tab switching', () => {
    expect(shortcutReservedReason('Ctrl+3')).toContain('标签');
    expect(shortcutReservedReason('Ctrl+M')).toBeNull();
  });

  it('reserves macOS menu and editing accelerators but leaves Cmd+W usable', () => {
    expect(shortcutReservedReason('Ctrl+Q', true)).toContain('系统');
    expect(shortcutReservedReason('Ctrl+M', true)).toContain('系统');
    expect(shortcutReservedReason('Ctrl+C', true)).toContain('系统');
    expect(shortcutReservedReason('Ctrl+Shift+Z', true)).toContain('系统');
    expect(shortcutReservedReason('Ctrl+W', true)).toBeNull();
    expect(shortcutReservedReason('Ctrl+Shift+W', true)).toContain('系统');
    expect(shortcutReservedReason('Ctrl+,', true)).toContain('系统');
    expect(shortcutReservedReason('Ctrl+Q', false)).toBeNull();
  });
});

describe('shortcut persistence helpers', () => {
  it('fills missing or invalid shortcuts with defaults', () => {
    const normalized = normalizeShortcutMap({
      newTerminal: 'Ctrl+M',
      closeTerminal: 'W',
      toggleSplit: 42,
    });
    expect(normalized.newTerminal).toBe('Ctrl+M');
    expect(normalized.closeTerminal).toBe(DEFAULT_SHORTCUTS.closeTerminal);
    expect(normalized.toggleSplit).toBe(DEFAULT_SHORTCUTS.toggleSplit);
  });

  it('normalizes saved schemes and limits their count', () => {
    const schemes = normalizeShortcutSchemes(
      Array.from({ length: 20 }, (_, index) => ({
        id: `scheme-${index}`,
        name: `方案 ${index}`,
        shortcuts: { newTerminal: 'Ctrl+M' },
        createdAt: index,
      }))
    );

    expect(schemes).toHaveLength(12);
    expect(schemes[0].shortcuts.newTerminal).toBe('Ctrl+M');
    expect(schemes[0].shortcuts.closeTerminal).toBe(DEFAULT_SHORTCUTS.closeTerminal);
  });

  it('compares shortcut maps independent of property order', () => {
    const reordered = Object.fromEntries(
      Object.entries(DEFAULT_SHORTCUTS).reverse()
    ) as typeof DEFAULT_SHORTCUTS;
    expect(shortcutsEqual(DEFAULT_SHORTCUTS, reordered)).toBe(true);
  });
});
