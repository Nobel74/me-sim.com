import AdminLayoutClient from './AdminLayoutClient';

export const metadata = {
  title: 'Panel de Administración | ME-SIM',
  description: 'Área privada y panel de control interno de ME-SIM.',
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

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
