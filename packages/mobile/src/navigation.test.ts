import { describe, expect, it } from 'vitest';
import { isViewActive, primaryNavItems, viewTitle } from './navigation';

describe('mobile navigation', () => {
  it('exposes five primary destinations in task order', () => {
    expect(primaryNavItems.map(item => item.key)).toEqual([
      'terminal', 'ai', 'explorer', 'ssh', 'profile',
    ]);
  });

  it('keeps secondary destinations inside profile', () => {
    expect(isViewActive('profile', 'sessions')).toBe(true);
    expect(isViewActive('profile', 'history')).toBe(true);
    expect(isViewActive('profile', 'settings')).toBe(true);
    expect(isViewActive('terminal', 'sessions')).toBe(false);
  });

  it('labels every destination', () => {
    expect(viewTitle('profile')).toBe('我的');
    expect(viewTitle('explorer')).toBe('文件');
    expect(viewTitle('sessions')).toBe('会话');
  });
});
