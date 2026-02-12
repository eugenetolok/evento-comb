'use client';
import React, { useEffect, useState } from "react";
import { Chip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import { useRouter } from '@/shared/router';
import { CarIcon, TruckIcon, VerticalDotsIcon } from "@/components/icons";
import AddAutoModal from "@/components/popups/newAuto";
import ImportAutosModal from "@/components/popups/autosImport";

const statusColorMap = {
	"Подтверждён": "success",
	"Не отправлен": "danger",
	"В ожидании": "warning",
};

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Гос. номер", uid: "number", sortable: true },
	{ name: "Тип", uid: "type", sortable: true },
	{ name: "Описание", uid: "description", sortable: false }
];

const INITIAL_VISIBLE_COLUMNS = ["number", "type", "description"];

export default function App() {
	const [company, setCompany] = React.useState<any>({
		name: "",
		cars_limit: 0
	});
	const [autos, setAutos] = React.useState<any>([]);
	const router = useRouter();
	const [isFrozen, setIsFrozen] = useState<any>(false);

	useEffect(() => {
		fetchCompanyName();
		fetchAutos();
	}, []);

	const fetchCompanyName = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/companies/my");
			setCompany(response.data)
		} catch (error: any) {
			console.error("Error fetching autos:", error);
		}
	};

	const fetchAutos = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/autos/company");
			const autosWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setAutos(autosWithKey);
		} catch (error: any) {
			console.error("Error fetching autos:", error);
		}
		axiosInstanceAuth.get('/api/users/frozen')
			.then(response => {
				setIsFrozen(response.data === true);
			})
			.catch(error => {
				console.error('Error checking frozen status:', error);
			});
	};

	const renderCell = React.useCallback((auto: any, columnKey: any) => {
		const cellValue = auto[columnKey];

		switch (columnKey) {
			case "name":
				return (
					<div className="flex flex-col">
						{cellValue}
					</div>
				);
			case "type":
				if (auto.type === "truck") {
					return <Button color="primary"><TruckIcon /></Button>
				} else {
					return <Button color="primary"><CarIcon /></Button>
				}
			default:
				return cellValue;
		}
	}, []);

	const buttonsGroup = React.useCallback(() => {
		return (
			<>
				<AddAutoModal action={fetchAutos} />
				<ImportAutosModal />
			</>
		)
	}, []);
	return (
		<div>
			<h1 className="text-3xl mb-5">Автомобили: {company.name}</h1>
			<h2 className="text-xl mb-5">Лимиты:  {autos.length} из {company.cars_limit}</h2>
			{isFrozen && (
				<div className="fixed bottom-0 right-0 m-4 p-4 bg-blue-500 text-white rounded-lg shadow-lg z-50">
					Ваш аккаунт заморожен (только чтение)
				</div>
			)}
			<Table searchColumns={["number", "description"]} tableItems={autos} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={buttonsGroup} onRowClick={(item) => { router.push(`/dashboard/autos/${item.id}`) }} />
		</div>
	);
}