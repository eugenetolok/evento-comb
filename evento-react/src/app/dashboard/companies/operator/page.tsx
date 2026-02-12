'use client';
import React, { useEffect } from "react";
import { Chip, User } from "@heroui/react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import { useRouter } from '@/shared/router';

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Название компании", uid: "name", sortable: true },
	{ name: "Участники", uid: "members", sortable: true },
	{ name: "Автомобили", uid: "autos", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS = ["name", "members", "autos"];

export default function App() {
	const [companies, setCompanies] = React.useState<any>([]);
	const router = useRouter();

	useEffect(() => {
		fetchCompanies();
	}, []);

	const fetchCompanies = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/companies/search");
			const companiesWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setCompanies(companiesWithKey);
		} catch (error: any) {
			console.error("Error fetching companies:", error);
		}
	};

	const renderCell = React.useCallback((company: any, columnKey: any) => {
		const cellValue = company[columnKey];

		switch (columnKey) {
			case "name":
				return (
					<User
						description={company.email + ", " + company.phone}
						name={cellValue}
					/>
				);
			case "members":
				return (
					<div>
						<Chip className="capitalize" color="success" size="sm" variant="flat">
							Лимиты: {company.members.count} / {company.members.limit}
						</Chip>
					</div>
				);
			case "autos":
				return (
					<div>
						<Chip className="capitalize" color="success" size="sm" variant="flat">
							Лимиты: {company.autos.count} / {company.autos.limit}
						</Chip>
					</div>
				);
			default:
				return cellValue;
		}
	}, []);

	const buttonsGroup = React.useCallback(() => {
		return (
			<>
			</>
		)
	}, [fetchCompanies]);

	return (
		<div>
			<h1 className="text-3xl mb-5">Все компании</h1>
			<Table tableItems={companies} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={buttonsGroup} onRowClick={(item) => { router.push(`/dashboard/companies/${item.id}/operator`) }} />
		</div>
	);
}