export const metadata = {
  title: 'Iniciar Sesión | ME-SIM',
  description: 'Accede a tu cuenta de ME-SIM.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default function LoginLayout({ children }) {
  return children;
}
