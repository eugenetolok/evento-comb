const currentYearText = String(new Date().getFullYear());

export type NavItem = {
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

const defaultSiteConfig: SiteConfigModel = {
	name: "VK FEST",
	year: currentYearText,
	description: "",
	version: "",
	cities: {
		"": currentYearText
	},
	docs: {
		"": "https://vkfestreg.ru"
	},
	city: "",
	navItems: {
		"admin": [],
		"editor": [],
		"company": [],
		"operator": [],
		"monitoring": [],
		"": []
	},
	links: {
		docs: "/toread"
	}
};

export const siteConfig: SiteConfigModel = { ...defaultSiteConfig };

type SiteConfigApiResponse = Partial<SiteConfigModel>;

const apiHost = (import.meta.env.VITE_API_HOST as string | undefined)?.replace(/\/$/, "");
const siteConfigEndpoint = `${apiHost || ""}/api/settings/frontend`;

export async function loadSiteConfig(): Promise<void> {
	try {
		const response = await fetch(siteConfigEndpoint);
		if (!response.ok) {
			return;
		}

		const data = (await response.json()) as SiteConfigApiResponse;

		Object.assign(siteConfig, {
			...siteConfig,
			...data,
			cities: {
				...defaultSiteConfig.cities,
				...(data.cities ?? {})
			},
			docs: {
				...defaultSiteConfig.docs,
				...(data.docs ?? {})
			},
			navItems: {
				...defaultSiteConfig.navItems,
				...(data.navItems ?? {})
			},
			links: {
				...defaultSiteConfig.links,
				...(data.links ?? {})
			}
		});
	} catch (error) {
		console.error("Unable to load site config from backend:", error);
	}
}

export type SiteConfig = typeof siteConfig;
