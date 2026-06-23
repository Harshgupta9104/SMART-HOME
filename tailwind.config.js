/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'App.tsx',
    'src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic colors - use via className
        primary: 'var(--color-primary, #3B82F6)',
        'primary-soft': 'var(--color-primary-soft, rgba(59, 130, 246, 0.1))',
        secondary: 'var(--color-secondary, #6B7280)',
        success: 'var(--color-success, #10B981)',
        warning: 'var(--color-warning, #F59E0B)',
        danger: 'var(--color-danger, #EF4444)',
        
        'bg-primary': 'var(--color-bg-primary, #F4F7FB)',
        'bg-secondary': 'var(--color-bg-secondary, #FFFFFF)',
        'bg-surface': 'var(--color-bg-surface, #FFFFFF)',
        'bg-card': 'var(--color-bg-card, rgba(255, 255, 255, 0.9))',
        
        'text-primary': 'var(--color-text-primary, #111827)',
        'text-secondary': 'var(--color-text-secondary, #6B7280)',
        'text-muted': 'var(--color-text-muted, #9CA3AF)',
        
        'border-color': 'var(--color-border, rgba(0, 0, 0, 0.08))',
      },
      spacing: {
        'safe-top': 'var(--safe-area-inset-top)',
        'safe-bottom': 'var(--safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
