import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ComponentWithEl {
  $el: HTMLElement;
}

export type ElementOrComponent = HTMLElement | ComponentWithEl | null;

export function getElement(target: ElementOrComponent): HTMLElement | null {
  if (!target) {
    return null;
  }
  return '$el' in target ? target.$el : target;
}
