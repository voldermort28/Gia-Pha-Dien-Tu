'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { useState } from 'react';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        retry: 1,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                <AuthProvider>{children}</AuthProvider>
                <Toaster position="bottom-right" />
            </NextThemesProvider>
        </QueryClientProvider>
    );
}

