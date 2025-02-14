/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        fontFamily: {
            sans: ['Inter var', 'sans-serif'],
        },
        extend: {
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
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
                }
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: 'none',
                        color: 'hsl(var(--foreground))',
                        p: {
                            marginBottom: '0.5rem',
                        },
                        h1: {
                            color: 'hsl(var(--foreground))',
                            marginBottom: '1rem',
                        },
                        h2: {
                            color: 'hsl(var(--foreground))',
                            marginBottom: '0.75rem',
                        },
                        h3: {
                            color: 'hsl(var(--foreground))',
                            marginBottom: '0.75rem',
                        },
                        a: {
                            color: 'hsl(var(--primary))',
                            '&:hover': {
                                color: 'hsl(var(--primary))',
                            },
                        },
                        blockquote: {
                            borderLeftColor: 'hsl(var(--border))',
                            color: 'hsl(var(--muted-foreground))',
                        },
                        hr: {
                            borderColor: 'hsl(var(--border))',
                            marginTop: '1rem',
                            marginBottom: '1rem',
                        },
                        table: {
                            borderCollapse: 'collapse',
                            width: '100%',
                            thead: {
                                borderBottomColor: 'hsl(var(--border))',
                            },
                            tr: {
                                borderBottomColor: 'hsl(var(--border))',
                            },
                            th: {
                                color: 'hsl(var(--foreground))',
                                padding: '0.75rem',
                                backgroundColor: 'hsl(var(--muted))',
                            },
                            td: {
                                padding: '0.75rem',
                                borderColor: 'hsl(var(--border))',
                            },
                        },
                        code: {
                            color: 'hsl(var(--foreground))',
                            backgroundColor: 'hsl(var(--muted))',
                            borderRadius: '0.25rem',
                            padding: '0.25rem',
                        },
                        pre: {
                            backgroundColor: 'hsl(var(--muted))',
                            color: 'hsl(var(--foreground))',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                        },
                        strong: {
                            color: 'hsl(var(--foreground))',
                        },
                        img: {
                            borderRadius: '0.5rem',
                        },
                    },
                },
            },
        }
    },
    plugins: [
        require("tailwindcss-animate"),
        require('@tailwindcss/typography'),
    ],
};