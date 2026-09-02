import { DefaultTheme } from 'styled-components';

export const theme: DefaultTheme = {
  colors: {
    primary: '#2ea44f',
    secondary: '#0366d6',
    background: '#ffffff',
    backgroundAlt: '#f6f8fa',
    text: '#24292e',
    textSecondary: '#586069',
    border: '#e1e4e8',
    error: '#cb2431',
    success: '#28a745',
    warning: '#ffd33d',
    info: '#0366d6',
  },
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  shadows: {
    small: '0 1px 0 rgba(27,31,35,0.04)',
    medium: '0 3px 6px rgba(0,0,0,0.1)',
    large: '0 8px 24px rgba(0,0,0,0.1)',
  },
  animations: {
    transition: 'all 0.2s ease-in-out',
    hover: 'transform 0.2s ease-in-out',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontSize: {
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '20px',
      xxlarge: '24px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 600,
    },
  },
  borderRadius: {
    small: '3px',
    medium: '6px',
    large: '12px',
  },
}; 