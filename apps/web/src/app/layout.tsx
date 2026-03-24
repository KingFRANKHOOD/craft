import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'CRAFT – DeFi on Stellar',
    description: 'Deploy production-ready DeFi applications on Stellar in minutes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
