'use client'
import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";
import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import React, { useContext } from 'react';
import { AppContext } from './context';


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
		<section className="flex flex-col justify-center items-center  gap-4 py-8 md:py-10 min-h-full">
			<div className="inline-block max-w-lg text-center">
				<h1 className={title()}>VK FEST&nbsp;</h1>
				<h1 className={title({ color: "blue" })}>{siteConfig.year}&nbsp;</h1>
				<h2 className={subtitle({ class: "mt-4" })}>
					Ваша роль: {roleMap[normalizedRole]}
				</h2>
			</div>

			<div className="grid grid-cols-12 grid-rows-2 gap-3">
				<Link
					isExternal
					href={getDocs()}
					className={buttonStyles({ color: "primary", variant: "shadow" }) + " col-span-12 sm:col-span-6"}
				>
					Документы к прочтению
				</Link>
				{roleButtonData ? (
					<Link
						className={buttonStyles({ variant: "bordered" }) + " col-span-12 sm:col-span-6"}
						href={roleButtonData?.url}
					>
						{roleButtonData?.title}
					</Link>
				) : null}
			</div>

		</section>
	);
}
