const currentYear = new Date().getFullYear();
const currentYearText = String(currentYear);

type NavItem = {
	label: string;
	href: string;
};

type SiteConfigModel = {
	name: string;
	year: string;
	description: string;
	version: string;
	cities: Record<string, string>;
	docs: Record<string, string>;
	city: string;
	navItems: Record<string, NavItem[]>;
	links: {
		docs: string;
	};
};

export const siteConfig: SiteConfigModel = {
	name: `VK FEST ${currentYearText}`,
	year: currentYearText,
	description: "Регистрация участников VK FEST",
	version: "0.4.7",
	cities: {
		"spb": "Санкт-Петербург",
		"msk": "Москва",
		"clb": "Челябинск",
		"sir": "Сириус (Сочи)",
		"kzn": "Казань",
		"": currentYearText
	},
	docs: {
		"spb": `https://cloud.mail.ru/public/QYxH/taxBiV818/VK%20Fest%20%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%2005-06.07.${currentYearText}`,
		"msk": `https://cloud.mail.ru/public/QYxH/taxBiV818/VK%20Fest%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%2019-20.07.${currentYearText}`,
		"clb": `https://cloud.mail.ru/public/QYxH/taxBiV818/VK%20Fest%20%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2014.06.${currentYearText}`,
		"sir": `https://cloud.mail.ru/public/QYxH/taxBiV818/VK%20Fest%20%D0%A1%D0%B8%D1%80%D0%B8%D1%83%D1%81%2021.06.${currentYearText}`,
		"kzn": `https://cloud.mail.ru/public/QYxH/taxBiV818/VK%20Fest%20%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C%2029.06.${currentYearText}`,
		"": "https://vkfestreg.ru"
	},
	city: "Санкт-Петербург",
	navItems: {
		"admin": [
			{
				label: "Главная",
				href: "/dashboard",
			},
			{
				label: "Компании",
				href: "/dashboard/companies/admin",
			},
			{
				label: "Участники",
				href: "/dashboard/members/admin",
			},
			{
				label: "Автомобили",
				href: "/dashboard/autos/admin",
			},
			{
				label: "Администрирование",
				href: "/dashboard/admin/main",
			}
		],
		"editor": [
			{
				label: "Главная",
				href: "/dashboard",
			},
			{
				label: "Мои компании",
				href: "/dashboard/companies/editor",
			},
			{
				label: "Мои участники",
				href: "/dashboard/members/editor",
			},
			{
				label: "Мои автомобили",
				href: "/dashboard/autos/editor",
			}
		],
		"company": [
			{
				label: "Мои участники",
				href: "/dashboard/members/company",
			},
			{
				label: "Мои автомобили",
				href: "/dashboard/autos/company",
			}
		],
		"operator": [
			{
				label: "Участники",
				href: "/dashboard/members/operator",
			},
			{
				label: "Автомобили",
				href: "/dashboard/autos/operator",
			}
		],
		"monitoring": [
			{
				label: "Участники",
				href: "/dashboard/members/monitoring",
			},
			{
				label: "Автомобили",
				href: "/dashboard/autos/operator",
			}
		],
		"": []
	},
	links: {
		docs: "/toread"
	}
};

export type SiteConfig = typeof siteConfig;
