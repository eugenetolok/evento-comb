'use client'
import {
	Navbar as NextUINavbar,
	NavbarContent,
	NavbarMenu,
	NavbarMenuToggle,
	NavbarBrand,
	NavbarItem,
	NavbarMenuItem,
} from "@heroui/navbar";
import { Link } from "@heroui/link";
import { Button } from "@heroui/button";

import { link as linkStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { Link as RouterLink, useLocation } from "react-router-dom";
import clsx from "clsx";

import Cookies from 'js-cookie';

import { ThemeSwitch } from "@/components/theme-switch";

import { LogoFest } from "@/components/icons";

import { useContext, useEffect, useState } from 'react';
import { AppContext } from '@/app/dashboard/context';


export const Navbar = () => {
	const role = useContext(AppContext);
	const normalizedRole = role ?? "";
	const location = useLocation();
	const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
	const isDashboardHome = location.pathname === "/dashboard" || location.pathname === "/dashboard/";

	useEffect(() => {
		setIsMenuOpen(false);
	}, [location.pathname]);

	const getCity = () => {
		if (typeof (window) !== "undefined") {
			const subdomain = window.location.host.split(".")[0]; // Get the subdomain

			if (siteConfig.cities[subdomain]) {
				return siteConfig.cities[subdomain];
			}
		}
		return siteConfig.cities[""];
	}


	const exitHandler = () => {
		if (typeof window !== undefined) {
			Cookies.remove('access_token'); // Delete the access token cookie
			window.location.href = '/login'; // Redirect to the login page
		}
		setIsMenuOpen(false);
	}

	return (
		<NextUINavbar
			maxWidth="xl"
			position="sticky"
			isMenuOpen={isMenuOpen}
			onMenuOpenChange={setIsMenuOpen}
			className={isDashboardHome ? "bg-transparent shadow-none" : undefined}
			classNames={isDashboardHome ? {
				base: "bg-transparent before:bg-transparent shadow-none",
				wrapper: "bg-transparent",
				menu: "bg-black/35 backdrop-blur-xl",
				toggleIcon: "text-white",
			} : undefined}
		>
			<NavbarContent className="basis-1/5 sm:basis-full" justify="start">
				<NavbarBrand as="li" className="gap-3 max-w-fit">
					<RouterLink className="flex justify-start items-center gap-1" to="/dashboard">
						<div className="mt-[-10px]">
							<div className="w-full flex items-center justify-center text-center">
								<LogoFest size={48} fill={isDashboardHome ? "#fff" : undefined} />
							</div>
							<div className={clsx("w-full text-center mt-[-10px]", isDashboardHome ? "text-white" : undefined)}>
								{getCity()}
							</div>
						</div>
					</RouterLink>
				</NavbarBrand>
				<ul className="hidden lg:flex gap-4 justify-start ml-2">
					{siteConfig.navItems[normalizedRole]?.map((item: any) => (
						<NavbarItem key={item.href}>
							<RouterLink
								className={clsx(
									linkStyles({ color: "foreground" }),
									"data-[active=true]:text-primary data-[active=true]:font-medium",
									isDashboardHome ? "text-white hover:text-white/90" : undefined
								)}
								to={item.href}
							>
								{item.label}
							</RouterLink>
						</NavbarItem>
					))}
				</ul>
			</NavbarContent>

			<NavbarContent
				className="hidden sm:flex basis-1/5 sm:basis-full"
				justify="end"
			>
				<NavbarItem className={clsx("hidden sm:flex gap-2", isDashboardHome ? "text-white" : undefined)}>
					<ThemeSwitch classNames={isDashboardHome ? { wrapper: "!text-white" } : undefined} />
				</NavbarItem>
				<span className={isDashboardHome ? "text-white" : undefined}>{siteConfig.version}</span>
				<NavbarItem className="hidden lg:flex">
					<Button
						variant={isDashboardHome ? "bordered" : "flat"}
						className={isDashboardHome ? "text-white border-white/45 bg-white/10" : undefined}
						onClick={() => exitHandler()}
					>
						Выйти
					</Button>
				</NavbarItem>


				<NavbarMenuToggle
					className={clsx("lg:hidden", isDashboardHome ? "text-white" : undefined)}
					aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
				/>
			</NavbarContent>

			<NavbarContent className={clsx("sm:hidden basis-1 pl-4", isDashboardHome ? "text-white" : undefined)} justify="end">
				<ThemeSwitch classNames={isDashboardHome ? { wrapper: "!text-white" } : undefined} />
				<span className={isDashboardHome ? "text-white" : undefined}>{siteConfig.version}</span>
				<NavbarMenuToggle
					className={isDashboardHome ? "text-white" : undefined}
					aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
				/>
			</NavbarContent>

			<NavbarMenu>
				<div className="mx-4 mt-2 flex flex-col gap-2">
					{siteConfig.navItems[normalizedRole]?.map((item: any, index: any) => (
						<NavbarMenuItem key={`${item}-${index}`}>
							<Link
								color="foreground"
								href={item.href}
								size="lg"
								className={isDashboardHome ? "text-white" : undefined}
								onPress={() => setIsMenuOpen(false)}
							>
								{item.label}
							</Link>
						</NavbarMenuItem>
					))}
					<NavbarMenuItem>
						<Button
							variant={isDashboardHome ? "bordered" : "flat"}
							className={isDashboardHome ? "text-white border-white/45 bg-white/10" : undefined}
							onClick={() => exitHandler()}
						>
							Выйти
						</Button>
					</NavbarMenuItem>
				</div>
			</NavbarMenu>
		</NextUINavbar>
	);
};
