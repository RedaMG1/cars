import './globals.css'

export const metadata = {
  title: 'Garage des Annonces',
  description: "Vos annonces AutoScout24, avec photos et liens cliquables",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
