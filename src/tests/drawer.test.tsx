import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExhibitionDrawer } from '../components/overlay/ExhibitionDrawer';

describe('浏览器 inert 失焦后的抽屉恢复', () => {
  it('打开时焦点已被浏览器移走，关闭仍回到原触发点', () => {
    const trigger = document.createElement('button');
    trigger.textContent = '史料原则';
    document.body.append(trigger);
    trigger.focus();
    const returnFocusRef = { current: trigger };
    // jsdom does not blur a descendant when its parent becomes inert.
    trigger.blur();
    const { unmount } = render(
      <ExhibitionDrawer
        title="资料来源与史料原则"
        onClose={vi.fn()}
        returnFocusRef={returnFocusRef}
      >
        正文
      </ExhibitionDrawer>,
    );
    expect(screen.getByRole('heading')).toHaveFocus();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
