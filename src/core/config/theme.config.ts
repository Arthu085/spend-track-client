import { theme, type ThemeConfig } from 'antd';

export type ThemeMode = 'light' | 'dark';

interface MonochromePalette {
  background: string;
  foreground: string;
  foregroundHover: string;
  description: string;
  subtleBg: string;
  subtleBgHover: string;
  subtleBorder: string;
  subtleBorderHover: string;
}

const palettes: Record<ThemeMode, MonochromePalette> = {
  light: {
    background: '#ffffff',
    foreground: '#000000',
    foregroundHover: '#404040',
    description: '#666666',
    subtleBg: '#f5f5f5',
    subtleBgHover: '#e8e8e8',
    subtleBorder: '#d9d9d9',
    subtleBorderHover: '#bfbfbf',
  },
  dark: {
    background: '#000000',
    foreground: '#ffffff',
    foregroundHover: '#bfbfbf',
    description: '#a6a6a6',
    subtleBg: '#303030',
    subtleBgHover: '#3a3a3a',
    subtleBorder: '#424242',
    subtleBorderHover: '#595959',
  },
};

const createMonochromeToken = ({
  background,
  foreground,
  foregroundHover,
  description,
  subtleBg,
  subtleBgHover,
  subtleBorder,
  subtleBorderHover,
}: MonochromePalette): ThemeConfig['token'] => ({
  colorPrimary: foreground,
  colorPrimaryHover: foregroundHover,
  colorPrimaryActive: foreground,
  colorPrimaryBg: subtleBg,
  colorPrimaryBgHover: subtleBgHover,
  colorPrimaryBorder: subtleBorder,
  colorPrimaryBorderHover: subtleBorderHover,
  colorPrimaryText: foreground,
  colorPrimaryTextHover: foregroundHover,
  colorPrimaryTextActive: foreground,
  colorInfo: foreground,
  colorInfoBg: subtleBg,
  colorInfoBorder: subtleBorder,
  colorLink: foreground,
  colorLinkHover: foregroundHover,
  colorLinkActive: foreground,
  colorBgBase: background,
  colorTextBase: foreground,
  colorTextTertiary: description,
  borderRadius: 6,
});

const darkOnPrimary = palettes.dark.background;

export const themeConfigs: Record<ThemeMode, ThemeConfig> = {
  light: {
    token: createMonochromeToken(palettes.light),
    components: {
      Form: { colorError: '#b42318' },
    },
  },
  dark: {
    algorithm: theme.darkAlgorithm,
    token: createMonochromeToken(palettes.dark),
    components: {
      Form: { colorError: '#ff9c99' },
      Button: { primaryColor: darkOnPrimary },
      Checkbox: { colorWhite: darkOnPrimary },
      Radio: {
        colorWhite: darkOnPrimary,
        buttonSolidCheckedColor: darkOnPrimary,
      },
      Switch: { handleBg: darkOnPrimary },
      DatePicker: { colorTextLightSolid: darkOnPrimary },
      Steps: { colorTextLightSolid: darkOnPrimary },
    },
  },
};

export const applyDocumentTheme = (mode: ThemeMode) => {
  const { style } = document.documentElement;
  style.colorScheme = mode;
  style.backgroundColor = palettes[mode].background;
};
