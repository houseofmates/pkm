import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./apps/web/**/*.{js,ts,jsx,tsx}",
        "./packages/core/src/**/*.{js,ts,jsx,tsx}",
        "./packages/core/components/**/*.{js,ts,jsx,tsx}",
        "./packages/core/pages/**/*.{js,ts,jsx,tsx}",
        "./packages/core/features/**/*.{js,ts,jsx,tsx}",
        "./packages/core/hooks/**/*.{js,ts,jsx,tsx}",
        "./packages/core/components/**/*.{js,ts,jsx,tsx}",
        "./packages/core/contexts/**/*.{js,ts,jsx,tsx}",
        "./packages/core/lib/**/*.{js,ts,jsx,tsx}",
        "./packages/core/types/**/*.{js,ts,jsx,tsx}",
        // exclude test files (they trigger PostCSS errors when being read)
        "!./src/**/*.test.{js,ts,jsx,tsx}",
        "!./packages/core/src/**/*.test.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                varela: ['Varela Round', 'sans-serif'],
            },
            boxShadow: {
                'sharp': '0 10px 30px rgba(0, 0, 0, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                'sharp-lg': '0 20px 40px rgba(0, 0, 0, 0.6), 0 8px 12px -4px rgba(0, 0, 0, 0.4)',
                'glass': '0 8px 25px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            },
        },
    },
    plugins: [tailwindcssAnimate],
}
