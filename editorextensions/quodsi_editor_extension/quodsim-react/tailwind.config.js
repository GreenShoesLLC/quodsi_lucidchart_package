module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    // Studio panels imported into quodsim-react -- Tailwind needs to see
    // their source so utility classes used by them are not purged.
    "../../../../quodsi_studio/src/platforms/shared/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mirrors quodsi_studio/tailwind.config.ts so brand-color utility
        // classes used by imported panels render identically.
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        'surface-hover': 'rgb(var(--surface-hover) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-strong': 'rgb(var(--muted-strong) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        'danger-soft-fg': 'rgb(var(--danger-soft-fg) / <alpha-value>)',
        'warning-soft': 'rgb(var(--warning-soft) / <alpha-value>)',
        'warning-soft-fg': 'rgb(var(--warning-soft-fg) / <alpha-value>)',
        'info-soft': 'rgb(var(--info-soft) / <alpha-value>)',
        'info-soft-fg': 'rgb(var(--info-soft-fg) / <alpha-value>)',
        'success-soft': 'rgb(var(--success-soft) / <alpha-value>)',
        'success-soft-fg': 'rgb(var(--success-soft-fg) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
