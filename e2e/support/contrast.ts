import type { Page } from '@playwright/test';

/** Audit rendered text, including placeholders, against its painted CSS surfaces. */
export async function auditTextContrast(page: Page, root = 'body') {
  return page.locator(root).evaluate((container) => {
    type Color = [number, number, number, number];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const parse = (value: string): Color => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (front: Color, back: Color): Color => [
      front[0] * front[3] + back[0] * (1 - front[3]),
      front[1] * front[3] + back[1] * (1 - front[3]),
      front[2] * front[3] + back[2] * (1 - front[3]),
      1,
    ];
    const luminance = (color: Color) => {
      const linear = color.slice(0, 3).map((part) => {
        const channel = part / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const ratio = (front: Color, back: Color) => {
      const a = luminance(over(front, back));
      const b = luminance(back);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const surfaces = new Map<Element, Color[]>();
    const backgrounds = (element: Element): Color[] => {
      const cached = surfaces.get(element);
      if (cached) return cached;
      const style = getComputedStyle(element);
      const parents: Color[] = element.parentElement
        ? backgrounds(element.parentElement)
        : [[255, 255, 255, 1]];
      let colors = parents.map((parent) => over(parse(style.backgroundColor), parent));
      // Check each CSS gradient stop rather than assuming a transparent background.
      if (style.backgroundImage.includes('gradient(')) {
        let depth = 0;
        let layer = '';
        const layers: string[] = [];
        for (const char of style.backgroundImage) {
          if (char === '(') depth++;
          if (char === ')') depth--;
          if (char === ',' && depth === 0) {
            layers.push(layer);
            layer = '';
          } else layer += char;
        }
        layers.push(layer);
        for (const image of layers.reverse()) {
          const stops = image.match(/rgba?\([^)]+\)|color\(srgb[^)]+\)/g) ?? [];
          if (stops.length)
            colors = stops.flatMap((stop) => colors.map((back) => over(parse(stop), back)));
        }
      }
      colors = colors.slice(0, 16);
      surfaces.set(element, colors);
      return colors;
    };
    const results: {
      selector: string;
      text: string;
      ratio: number;
      color: string;
      background: number[];
      opacity: number;
    }[] = [];
    const seen = new Set<string>();
    for (const element of [container, ...container.querySelectorAll('*')]) {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
      if (element.closest('[aria-hidden="true"], .sr-only, script, style, option')) continue;
      const style = getComputedStyle(element);
      if (
        style.visibility !== 'visible' ||
        style.display === 'none' ||
        !element.getClientRects().length
      )
        continue;
      let opacity = 1;
      let hidden = false;
      for (let parent: Element | null = element; parent; parent = parent.parentElement) {
        const parentStyle = getComputedStyle(parent);
        opacity *= Number(parentStyle.opacity);
        if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') hidden = true;
      }
      if (hidden || opacity === 0) continue;
      let text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
        .join(' ')
        .trim();
      let color = style.color;
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        if (element.type === 'hidden' || element.type === 'checkbox' || element.type === 'radio')
          continue;
        text = element.value || element.getAttribute('placeholder') || '';
        if (!element.value && element.getAttribute('placeholder')) {
          const placeholder = getComputedStyle(element, '::placeholder');
          color = placeholder.color;
          opacity *= Number(placeholder.opacity);
        }
      } else if (element instanceof HTMLSelectElement) {
        text = element.selectedOptions[0]?.textContent?.trim() ?? '';
      } else if (
        element.tagName.toLowerCase() === 'text' ||
        element.tagName.toLowerCase() === 'tspan'
      ) {
        color = style.fill;
      }
      if (!text) continue;
      const foreground = parse(color);
      foreground[3] *= opacity;
      const checks = backgrounds(element).map((back) => ({ back, ratio: ratio(foreground, back) }));
      const worst = checks.reduce((a, b) => (a.ratio < b.ratio ? a : b));
      const selector =
        element.tagName.toLowerCase() +
        (element.getAttribute('class')
          ? '.' + element.getAttribute('class')!.trim().split(/\s+/).join('.')
          : '') +
        (element.parentElement?.className && typeof element.parentElement.className === 'string'
          ? ' in .' + element.parentElement.className.trim().split(/\s+/).join('.')
          : '');
      const key = selector + text;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        selector,
        text: text.slice(0, 90),
        ratio: +worst.ratio.toFixed(2),
        color,
        background: worst.back.slice(0, 3).map(Math.round),
        opacity: foreground[3],
      });
    }
    return results;
  });
}
