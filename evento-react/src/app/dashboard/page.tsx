'use client'
import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { siteConfig } from "@/config/site";
import { useContext } from 'react';
import { AppContext } from './context';
import VkLiquidMainBackground from "@/components/backgrounds/vkLiquidMain";


const roleMap: Record<string, string> = {
	'admin': 'администратор',
	'editor': 'редактор компаний',
	'company': 'представитель компании',
	'operator': 'оператор на мероприятии',
	'monitoring': 'мониторинг участников'
};

const roleButtonMap: Record<string, { title: string; url: string }> = {
	'admin': { title: 'Администрирование', url: '/dashboard/admin/main' },
	'editor': { title: 'Мои компании', url: '/dashboard/companies/editor' },
	'company': { title: 'Мои участники', url: '/dashboard/members/company' },
	'operator': { title: 'Все участники', url: '/dashboard/members/operator' },
	'monitoring': { title: 'Все участники', url: '/dashboard/members/monitoring' },
	'': { title: '', url: '' }
};

export default function Home() {
	const role = useContext(AppContext);
	const normalizedRole = role ?? "";
	const roleButtonData = roleButtonMap[normalizedRole];

	const getDocs = () => {
		if (typeof (window) !== "undefined") {
			const subdomain = window.location.host.split(".")[0]; // Get the subdomain

			if (siteConfig.docs[subdomain]) {
				return siteConfig.docs[subdomain];
			}
		}
		return siteConfig.docs[""];
	}

	return (
		<>
			<VkLiquidMainBackground fullScreen />
			<section className="relative z-10 flex min-h-[72vh] flex-col items-center justify-center gap-6 py-8 md:py-10">
				<div className="inline-block max-w-2xl text-center text-white">
					<h1 className="text-5xl lg:text-7xl font-semibold tracking-tight drop-shadow-[0_8px_34px_rgba(0,0,0,0.54)]">
						VK FEST <span className="bg-gradient-to-b from-[#9ed1ff] to-[#4da1ff] bg-clip-text text-transparent">{siteConfig.year}</span>
					</h1>
					<h2 className="mt-4 text-2xl lg:text-4xl font-semibold text-white/90 drop-shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
						Ваша роль: {roleMap[normalizedRole]}
					</h2>
				</div>

				<div className="grid grid-cols-12 grid-rows-2 gap-3 rounded-2xl p-4">
					<Link
						isExternal
						href={getDocs()}
						className={buttonStyles({ color: "primary", variant: "shadow" }) + " col-span-12 sm:col-span-6"}
					>
						Документы к прочтению
					</Link>
					{roleButtonData ? (
						<Link
							className={buttonStyles({ variant: "bordered" }) + " text-white col-span-12 sm:col-span-6"}
							href={roleButtonData?.url}
						>
							{roleButtonData?.title}
						</Link>
					) : null}
				</div>
			</section>
		</>
	);
}
