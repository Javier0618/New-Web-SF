/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.{html,js}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "#E50914", // red-600
          dark: "#B20710", // red-700
          light: "#FF1F2A", // red-500
        },
        // Secondary Colors
        secondary: {
          DEFAULT: "#F5F5F1", // warm off-white
          dark: "#E5E5E1", // slightly darker warm off-white
        },
        // Accent Colors
        accent: {
          DEFAULT: "#FFD700", // gold
          dark: "#E6C200", // darker gold
          light: "#FFED4E", // lighter gold
        },
        // Background Colors
        background: {
          DEFAULT: "#141414", // charcoal
          light: "#1A1A1A", // slightly lighter charcoal
        },
        // Surface Colors
        surface: {
          DEFAULT: "#1F1F1F", // dark-gray
          light: "#2A2A2A", // lighter surface
          hover: "#252525", // surface hover state
        },
        // Text Colors
        text: {
          primary: "#FFFFFF", // white
          secondary: "#B3B3B3", // gray-400
          tertiary: "#808080", // gray-500
          disabled: "#666666", // gray-600
        },
        // Status Colors
        success: {
          DEFAULT: "#46D369", // green-500
          dark: "#3AB759", // green-600
          light: "#5EE07F", // green-400
        },
        warning: {
          DEFAULT: "#FF9500", // orange-500
          dark: "#E68600", // orange-600
          light: "#FFB340", // orange-400
        },
        error: {
          DEFAULT: "#FF453A", // red-500
          dark: "#E63C32", // red-600
          light: "#FF6B62", // red-400
        },
        // Border Colors
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.1)", // subtle white border
          light: "rgba(255, 255, 255, 0.05)", // very subtle border
          medium: "rgba(255, 255, 255, 0.15)", // medium border
        },
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.25)',
        'medium': '0 6px 30px rgba(0, 0, 0, 0.3)',
        'strong': '0 8px 40px rgba(0, 0, 0, 0.4)',
        'hover': '0 12px 50px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      transitionDuration: {
        'fast': '200ms',
        'base': '300ms',
        'slow': '400ms',
        'slower': '600ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        'slide-up': 'slideUp 400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0.0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      aspectRatio: {
        'poster': '2/3',
        'backdrop': '16/9',
      },
      backdropBlur: {
        'xs': '2px',
        'light': '8px',
        'medium': '16px',
        'heavy': '24px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
  ],
}