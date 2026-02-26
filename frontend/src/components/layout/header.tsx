'use client';

import { Moon, Sun, LogOut, User, LogIn, Menu, TreePine } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationBell } from '@/components/notification-bell';
import { useAuth } from '@/components/auth-provider';
import { navItems, adminItems } from '@/components/layout/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
    const { theme, setTheme } = useTheme();
    const { isLoggedIn, profile, isAdmin, signOut } = useAuth();
    const router = useRouter();

    const initials = profile?.display_name
        ? profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : profile?.email?.slice(0, 2).toUpperCase() || '?';

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 lg:px-6">
            {/* Left side */}
            <div className="flex items-center gap-2">
                {/* Mobile Menu Toggle */}
                <div className="md:hidden flex items-center">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Menu">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[80vw] sm:w-80 flex flex-col p-0">
                            {/* Logo */}
                            <div className="flex items-center gap-2 px-6 py-6 border-b">
                                <TreePine className="h-6 w-6 text-primary shrink-0" />
                                <span className="font-bold text-lg">Gia phả họ Quảng</span>
                            </div>

                            {/* Mobile Navigation */}
                            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <span
                                                className={cn(
                                                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 shrink-0" />
                                                {item.label}
                                            </span>
                                        </Link>
                                    );
                                })}

                                {isAdmin && (
                                    <>
                                        <div className="pt-6 pb-2">
                                            <span className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                                Quản trị (Admin)
                                            </span>
                                        </div>
                                        {adminItems.map((item) => {
                                            const isActive = pathname.startsWith(item.href);
                                            return (
                                                <Link key={item.href} href={item.href}>
                                                    <span
                                                        className={cn(
                                                            'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                                                            isActive
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                                        )}
                                                    >
                                                        <item.icon className="h-5 w-5 shrink-0" />
                                                        {item.label}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                <h2 className="text-sm font-medium text-muted-foreground hidden md:block">
                    Dòng họ Quảng
                </h2>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label="Toggle theme"
                >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                {/* Notifications */}
                <NotificationBell />

                {isLoggedIn ? (
                    /* User menu (logged in) */
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {profile?.display_name || 'Thành viên'}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {profile?.email}
                                    </p>
                                    {isAdmin && (
                                        <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5 w-fit mt-1">
                                            Quản trị viên
                                        </span>
                                    )}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                Hồ sơ cá nhân
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Đăng xuất
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    /* Login button (not logged in) */
                    <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
                        <LogIn className="h-4 w-4 mr-2" /> Đăng nhập
                    </Button>
                )}
            </div>
        </header>
    );
}
