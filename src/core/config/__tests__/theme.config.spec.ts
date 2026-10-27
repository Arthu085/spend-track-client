import { theme } from 'antd';
import { describe, expect, it } from 'vitest';
import { applyDocumentTheme, themeConfigs } from '../theme.config';

const lightToken = theme.getDesignToken(themeConfigs.light);
const darkToken = theme.getDesignToken(themeConfigs.dark);

const luminance = (color: string, background: string): number => {
  const rgb = color.startsWith('#')
    ? color
        .slice(1)
        .match(/.{2}/g)
        ?.map((channel) => parseInt(channel, 16))
    : color.match(/[\d.]+/g)?.map(Number);
  const backdrop = background
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => parseInt(channel, 16));

  if (!rgb || !backdrop) {
    throw new Error(`Unsupported contrast colors: ${color}, ${background}`);
  }

  return rgb.slice(0, 3).reduce((sum, channel, index) => {
    const opacity = rgb[3] ?? 1;
    const value =
      (channel * opacity + (backdrop[index] ?? 0) * (1 - opacity)) / 255;
    const linear =
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

    return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0);
  }, 0);
};

describe.each([
  ['light', lightToken],
  ['dark', darkToken],
] as const)('%s text contrast', (mode, token) => {
  it.each([
    ['colorTextSecondary', token.colorTextSecondary],
    ['colorTextTertiary', token.colorTextTertiary],
    ['colorTextDescription', token.colorTextDescription],
    ['colorTextLabel', token.colorTextLabel],
    ['Form.colorError', themeConfigs[mode].components?.Form?.colorError],
  ] as const)('keeps %s readable on neutral surfaces', (textToken, color) => {
    if (typeof color !== 'string') {
      throw new Error(`Missing text color: ${textToken}`);
    }

    for (const background of [
      token.colorBgBase,
      token.colorBgLayout,
      token.colorBgContainer,
      token.colorBgElevated,
      token.colorPrimaryBg,
      token.colorPrimaryBgHover,
    ]) {
      const foregroundLuminance = luminance(color, background);
      const backgroundLuminance = luminance(background, background);
      const contrast =
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

      expect(contrast, `${textToken} on ${background}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
});

describe('themeConfigs.light', () => {
  it('uses black for primary actions and links on white', () => {
    expect(lightToken.colorPrimary).toBe('#000000');
    expect(lightToken.colorLink).toBe('#000000');
    expect(lightToken.colorBgContainer).toBe('#ffffff');
    expect(lightToken.colorError).toBe('#ff4d4f');
  });

  // Ant Design derives these from the primary color; derived from black they would be dark grays
  // that hide black text on selected menu items and options.
  it('keeps primary backgrounds and borders light', () => {
    expect(lightToken.colorPrimaryBg).toBe('#f5f5f5');
    expect(lightToken.colorPrimaryBorder).toBe('#d9d9d9');
  });
});

describe('themeConfigs.dark', () => {
  // The dark algorithm softens the white seed, so primary fills and links are a light gray.
  it('uses near-white for primary actions and links on dark surfaces', () => {
    expect(darkToken.colorPrimary).toBe('#dcdcdc');
    expect(darkToken.colorLink).toBe('#dcdcdc');
    expect(darkToken.colorBgContainer).toBe('#141414');
    expect(darkToken.colorError).toBe('#dc4446');
  });

  // Derived from white these would be light grays that hide white text on selected items.
  it('keeps primary backgrounds and borders dark', () => {
    expect(darkToken.colorPrimaryBg).toBe('#303030');
    expect(darkToken.colorPrimaryBorder).toBe('#424242');
  });

  // Ant Design draws white content on primary fills; on a near-white primary it must be black.
  it('draws black content on white primary fills', () => {
    expect(themeConfigs.dark.components).toMatchObject({
      Button: { primaryColor: '#000000' },
      Checkbox: { colorWhite: '#000000' },
      Radio: { colorWhite: '#000000', buttonSolidCheckedColor: '#000000' },
      Switch: { handleBg: '#000000' },
    });
  });
});

describe('applyDocumentTheme', () => {
  it.each([
    ['light', 'rgb(255, 255, 255)'],
    ['dark', 'rgb(0, 0, 0)'],
  ] as const)(
    'sets the %s color scheme and page background',
    (mode, background) => {
      applyDocumentTheme(mode);

      const { style } = document.documentElement;
      expect(style.colorScheme).toBe(mode);
      expect(style.backgroundColor).toBe(background);
    },
  );
});
