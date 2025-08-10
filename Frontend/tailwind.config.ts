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
				// Tailwind Compatibility
				border: 'hsl(var(--border))',
				ring: 'hsl(var(--ring))',
				
				// Shadcn UI required variables
				primary: 'hsl(var(--brand-primary))',
				'primary-foreground': 'hsl(var(--brand-primary-foreground))',
				secondary: 'hsl(var(--button-secondary))',
				'secondary-foreground': 'hsl(var(--text-primary))',
				destructive: 'hsl(var(--danger))',
				'destructive-foreground': 'hsl(var(--danger-foreground))',
				muted: 'hsl(var(--surface))',
				'muted-foreground': 'hsl(var(--text-muted))',
				accent: 'hsl(var(--surface-elevated))',
				'accent-foreground': 'hsl(var(--text-primary))',
				popover: 'hsl(var(--surface-elevated))',
				'popover-foreground': 'hsl(var(--text-primary))',
				card: 'hsl(var(--surface))',
				'card-foreground': 'hsl(var(--text-primary))',
				
				// Core semantic colors
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				surface: 'hsl(var(--surface))',
				'surface-elevated': 'hsl(var(--surface-elevated))',
				
				// Text colors
				text: {
					primary: 'hsl(var(--text-primary))',
					secondary: 'hsl(var(--text-secondary))',
					muted: 'hsl(var(--text-muted))'
				},
				
				// Brand colors
				brand: {
					primary: 'hsl(var(--brand-primary))',
					'primary-hover': 'hsl(var(--brand-primary-hover))',
					'primary-foreground': 'hsl(var(--brand-primary-foreground))'
				},
				
				// Sidebar
				sidebar: {
					bg: 'hsl(var(--sidebar-bg))',
					border: 'hsl(var(--sidebar-border))',
					'item-hover': 'hsl(var(--sidebar-item-hover))',
					'item-active': 'hsl(var(--sidebar-item-active))'
				},
				
				// Chat interface
				chat: {
					bg: 'hsl(var(--chat-bg))',
					'message-user': 'hsl(var(--message-user-bg))',
					'message-ai': 'hsl(var(--message-ai-bg))'
				},
				
				// Input elements
				input: 'hsl(var(--border))',
				'input-bg': 'hsl(var(--input-bg))',
				'input-border': 'hsl(var(--input-border))',
				'input-focus': 'hsl(var(--input-focus))',
				
				// Interactive elements
				button: {
					secondary: 'hsl(var(--button-secondary))',
					'secondary-hover': 'hsl(var(--button-secondary-hover))'
				},
				
				// Status colors
				danger: 'hsl(var(--danger))',
				'danger-foreground': 'hsl(var(--danger-foreground))'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-welcome': 'var(--gradient-welcome)',
				'gradient-orb-1': 'var(--gradient-orb-1)',
				'gradient-orb-2': 'var(--gradient-orb-2)'
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'xl': 'var(--shadow-xl)',
				'elevated': 'var(--shadow-elevated)'
			},
			borderRadius: {
				'sm': 'var(--radius-sm)',
				'md': 'var(--radius-md)',
				'lg': 'var(--radius-lg)',
				'xl': 'var(--radius-xl)',
				DEFAULT: 'var(--radius)'
			},
			transitionDuration: {
				'fast': '150ms',
				'normal': '300ms',
				'slow': '500ms',
				'sidebar': '400ms'
			},
			transitionTimingFunction: {
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'sidebar': 'cubic-bezier(0.4, 0, 0.6, 1)'
			},
			keyframes: {
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-20px)' }
				},
				fadeInUp: {
					from: { opacity: '0', transform: 'translateY(30px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				slideIn: {
					from: { transform: 'translateX(-100%)' },
					to: { transform: 'translateX(0)' }
				},
				slideOut: {
					from: { transform: 'translateX(0)' },
					to: { transform: 'translateX(-100%)' }
				},
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			animation: {
				'float': 'float 6s ease-in-out infinite',
				'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
				'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards',
				'slide-out': 'slideOut 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
