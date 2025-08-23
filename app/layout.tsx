import './globals.css';
import type { ReactNode } from 'react';
import AppShell from './shell';

// Root layout must remain a Server Component for optimal streaming & to avoid hydration issues.
export default function RootLayout({ children }: { children: ReactNode; }) {
	return (
		<html lang="en" className="min-h-full">
			<body className="bg-black text-gray-200 antialiased selection:bg-neuro-accent/40">
				<AppShell>{children}</AppShell>
			</body>
		</html>
	);
}

