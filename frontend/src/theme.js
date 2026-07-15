// Raw hex values for contexts that need real color strings (recharts stroke/fill/gradient props).
// Chrome/layout styling should use Tailwind classes (see src/index.css @theme block) instead.
export const theme = {
  primary: '#0D9488', primaryDark: '#0F766E', primaryLight: '#F0FDFA',
  bgBase: '#FAF9F6', surface: '#FFFFFF', textMain: '#292524',
  textMuted: '#78716C', border: '#E7E5E4', danger: '#E11D48',
  dangerLight: '#FFF1F2', success: '#16A34A', successLight: '#F0FDF4',
  warning: '#D97706', warningLight: '#FEF3C7'
};
