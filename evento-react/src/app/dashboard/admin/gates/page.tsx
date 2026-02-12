'use client';
import React, { useEffect } from "react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddGateModal from "@/components/popups/newGate";
import { useRouter } from '@/shared/router';

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Название зоны", uid: "name", sortable: true },
	{ name: "Описание", uid: "description", sortable: true }, ,
];

const INITIAL_VISIBLE_COLUMNS = ["name", "description"];

export default function App() {
	const router = useRouter();
	const [gates, setGates] = React.useState<any>([]);

	useEffect(() => {
		fetchGates();
	}, []);

	const fetchGates = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/gates");
			const gatesWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setGates(gatesWithKey);
		} catch (error: any) {
			console.error("Error fetching gates:", error);
		}
	};

	const renderCell = React.useCallback((company: any, columnKey: any) => {
		const cellValue = company[columnKey];

		switch (columnKey) {
			default:
				return cellValue;
		}
	}, []);

	return (
		<div>
			<h1 className="text-3xl mb-5">Зоны доступа фестиваля</h1>
			<Table tableItems={gates} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={AddGateModal} customAddComponentAction={fetchGates} onRowClick={(item) => { router.push(`/dashboard/admin/gates/${item.id}`) }} />
		</div>
	);
}