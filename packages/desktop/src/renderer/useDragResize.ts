// useDragResize.ts
// 通用拖拽调宽/调高 Hook：按下把手 → 拖动 → 松手结束。
// 通过 onDelta 把拖动位移交给调用方换算成尺寸，由调用方 clamp 后写入设置。

import { useCallback, useRef } from 'react';

interface DragResizeOptions {
  /** 拖动方向：vertical = 水平拖动改变宽度；horizontal = 垂直拖动改变高度 */
  orientation: 'vertical' | 'horizontal';
  /** 拖动过程回调，delta 为相对起点的位移（px，正值向右/向下） */
  onDelta: (delta: number) => void;
  /** 拖动结束回调 */
  onEnd?: () => void;
}

export function useDragResize({ orientation, onDelta, onEnd }: DragResizeOptions) {
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const startPos = orientation === 'vertical' ? event.clientX : event.clientY;
      draggingRef.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!draggingRef.current) return;
        const currentPos = orientation === 'vertical' ? moveEvent.clientX : moveEvent.clientY;
        onDelta(currentPos - startPos);
      };

      const handleMouseUp = () => {
        draggingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        // 拖动结束后通知 xterm 重新适配尺寸
        window.dispatchEvent(new Event('resize'));
        onEnd?.();
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [orientation, onDelta, onEnd]
  );

  return { onMouseDown: handleMouseDown, isDragging: draggingRef.current };
}
