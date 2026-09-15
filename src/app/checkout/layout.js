export const metadata = {
  title: 'Pasarela de Pago Seguro | ME-SIM',
  description: 'Finalizar compra segura en ME-SIM.',
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

export default function CheckoutLayout({ children }) {
  return children;
}
