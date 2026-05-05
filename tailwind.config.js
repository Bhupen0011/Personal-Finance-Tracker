/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#122033',
        muted: '#6D7A90',
        panel: '#F8FAFC',
        line: '#E3E9F1',
        positive: '#1F9D63',
        positiveSoft: '#DBF5E8',
        negative: '#D64545',
        negativeSoft: '#FDE8E8',
        accent: '#0F8F8C',
        accentSoft: '#DEF7F6',
        brand: '#2F6FED',
        brandSoft: '#E3EBFF',
      },
      boxShadow: {
        panel: '0 10px 22px rgba(15, 23, 42, 0.06)',
        soft: '0 14px 30px rgba(15, 23, 42, 0.08)',
        hero: '0 32px 70px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl2: '1.75rem',
        xl3: '2rem',
      },
      backgroundImage: {
        app: 'linear-gradient(180deg, #FBFDFF 0%, #F5F8FC 100%)',
        sidebar: 'linear-gradient(180deg, #F8FBFF 0%, #F1F6FB 100%)',
        hero: 'linear-gradient(135deg, #2F6FED 0%, #0F8F8C 100%)',
        balance: 'linear-gradient(160deg, #123E60 0%, #0F8F8C 100%)',
        authPanel: 'linear-gradient(165deg, #103A5C 0%, #16616F 62%, #15A28B 100%)',
        authPanelLight: 'linear-gradient(180deg, #EEF7FF 0%, #F6FBFE 55%, #EEF7F5 100%)',
      },
    },
  },
  plugins: [],
};
