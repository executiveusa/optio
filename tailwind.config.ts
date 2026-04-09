
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				metamorf: {
					'void': '#0a0e1a',
					'void-warm': '#0e1222',
					'surface': '#141a2e',
					'surface-raised': '#1a2038',
					'morpho': '#2b8fd9',
					'morpho-light': '#5ec4e8',
					'morpho-deep': '#1a5fa0',
					'morpho-dim': '#163464',
					'gold': '#c4963c',
					'gold-light': '#d4a542',
					'gold-deep': '#8b5e1e',
					'gold-glow': '#e8d080',
					'lotus': '#9b4dca',
					'lotus-soft': '#b07dd4',
					'lotus-deep': '#6b2d9a',
					'text-primary': '#edf0f5',
					'text-secondary': '#a0a8b8',
					'text-tertiary': '#606878',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				playfair: ['Playfair Display', 'serif'],
				poppins: ['Poppins', 'sans-serif'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'butterfly-float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-8px)' }
				},
				'butterfly-glow': {
					'0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(43, 143, 217, 0.4))' },
					'50%': { filter: 'drop-shadow(0 0 20px rgba(43, 143, 217, 0.7))' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'cocoon-pulse': {
					'0%, 100%': { opacity: '0.3', transform: 'translate(-50%, -50%) scale(1)' },
					'50%': { opacity: '0.7', transform: 'translate(-50%, -50%) scale(1.15)' }
				},
				'wing-unfold': {
					'0%': { opacity: '0', transform: 'scale(0.5)', filter: 'blur(6px) brightness(2)' },
					'40%': { opacity: '1', filter: 'blur(0) brightness(1.3)' },
					'100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0) brightness(1)' }
				},
				'gold-shimmer': {
					'0%': { backgroundPosition: '200% center' },
					'100%': { backgroundPosition: '-200% center' }
				},
				'morpho-pulse': {
					'0%, 100%': { boxShadow: '0 0 12px rgba(43,143,217,0.15)' },
					'50%': { boxShadow: '0 0 24px rgba(43,143,217,0.3)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'butterfly-float': 'butterfly-float 4s ease-in-out infinite',
				'butterfly-glow': 'butterfly-glow 4s ease-in-out infinite',
				'fade-in': 'fade-in 0.6s ease-out forwards',
				'cocoon-pulse': 'cocoon-pulse 2s ease-in-out infinite',
				'wing-unfold': 'wing-unfold 1.8s ease forwards',
				'gold-shimmer': 'gold-shimmer 3s ease-in-out infinite',
				'morpho-pulse': 'morpho-pulse 3s ease-in-out infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
