export const metadata = {
  title: 'Mi Panel | ME-SIM',
  description: 'Gestión de eSIMs, consumo y pedidos de ME-SIM.',
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

export default function DashboardLayout({ children }) {
  return children;
}
