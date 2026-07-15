import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Concentrate — School Portal',
  description: 'A calm place for classes, assignments, and grades.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
