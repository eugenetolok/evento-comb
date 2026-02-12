'use client';
import React, { useEffect } from "react";
import { Button } from "@heroui/react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import { useRouter } from '@/shared/router';
import { CarIcon, TruckIcon } from "@/components/icons";
import CarPlate from "@/components/tables/plateCell/carPlate";

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Гос. номер", uid: "number", sortable: true },
	{ name: "Тип", uid: "type", sortable: true },
	{ name: "Описание", uid: "description", sortable: false },
	{ name: "Компания", uid: "company" },
];

const INITIAL_VISIBLE_COLUMNS = ["number", "type", "description", "company"];

export default function App() {
	const [companies, setCompanies] = React.useState<any>([]);
	const router = useRouter();

	useEffect(() => {
		fetchCompanies();
	}, []);

	const fetchCompanies = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/autos");
			const companiesWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setCompanies(companiesWithKey);
		} catch (error: any) {
			console.error("Error fetching companies:", error);
		}
	};

	const renderCell = React.useCallback((auto: any, columnKey: any) => {
		const cellValue = auto[columnKey];

		switch (columnKey) {
			case "number":
				return <CarPlate plateCode={String(cellValue ?? "")} compact />;
			case "type":
				if (auto.type === "truck") {
					return <Button color="primary"><TruckIcon /></Button>
				} else {
					return <Button color="primary"><CarIcon /></Button>
				}
			default:
				return cellValue ?? "—";
		}
	}, []);

	const addCar = React.useCallback(() => {
		return (
			<></>
		)
	}, []);

	return (
		<div className="space-y-4">
			<h1 className="text-3xl">Все автомобили</h1>
			<div className="rounded-2xl border border-divider bg-content1 p-3 md:p-4 shadow-sm">
				<Table searchColumns={["number", "description"]} tableItems={companies} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={addCar} onRowClick={(item) => { router.push(`/dashboard/autos/${item.id}/operator`) }} />
			</div>
		</div>
	);
}
