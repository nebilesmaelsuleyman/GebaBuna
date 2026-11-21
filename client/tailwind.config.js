/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Espresso — ink, chrome, and trust surfaces
        coffee: {
          50: '#f7f3ec',
          100: '#efe6d8',
          200: '#e0d0b8',
          300: '#c9ae8c',
          400: '#a88460',
          500: '#8a6544',
          600: '#6e4c32',
          700: '#533826',
          800: '#3a261b',
          900: '#26170f',
          950: '#160d09',
        },
        // Highland canopy — verified, fair, paid
        forest: {
          50: '#f1f8f3',
          100: '#dcefe2',
          200: '#b7dec4',
          300: '#86c59c',
          400: '#4fa874',
          500: '#2f8a58',
          600: '#226e46',
          700: '#1c5839',
          800: '#18462f',
          900: '#123524',
          950: '#091c13',
        },
        // Auction gold — prices and ECX value
        gold: {
          50: '#fbf6ea',
          100: '#f6e9c8',
          200: '#edd398',
          300: '#e3b85c',
          400: '#d4a03a',
          500: '#c4891f',
          600: '#a36d16',
          700: '#7c5214',
          800: '#654218',
          900: '#543718',
        },
        // Ripe cherry — primary actions (Jimma red cherry)
        cherry: {
          50: '#fff1ef',
          100: '#ffe0db',
          200: '#ffc4bb',
          300: '#ff9a8c',
          400: '#f26a58',
          500: '#e04532',
          600: '#c42e1e',
          700: '#a32519',
          800: '#862219',
          900: '#6f221b',
        },
        cream: {
          50: '#fbf8f3',
          100: '#f4efe6',
          200: '#e8dfd0',
          300: '#d8cbb6',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,13,9,0.04), 0 12px 32px rgba(22,13,9,0.06)',
      },
    },
  },
  plugins: [],
};
