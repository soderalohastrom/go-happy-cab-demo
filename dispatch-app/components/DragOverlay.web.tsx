import React from 'react';

interface DragOverlayProps {
  isDragging: boolean;
  absoluteX: number;
  absoluteY: number;
  wrapperOffsetY: number;
  type: 'child' | 'driver';
  name: string;
}

export function DragOverlay({ isDragging }: DragOverlayProps) {
  if (!isDragging) {
    return null;
  }
  // For now, return null on web to avoid overlay issues until a web-compatible drag implementation is added.
  return null;
}
