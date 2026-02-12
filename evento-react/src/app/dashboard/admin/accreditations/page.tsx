'use client';
import React, { useEffect } from "react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddAccreditationModal from "@/components/popups/newAccreditation";
import { useRouter } from '@/shared/router';

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Название аккредитации", uid: "name", sortable: true },
	{ name: "Описание", uid: "description", sortable: true }
];

const INITIAL_VISIBLE_COLUMNS = ["name", "description"];

export default function App() {
	const router = useRouter();
	const [accreditations, setAccreditations] = React.useState<any>([]);

	useEffect(() => {
		fetchAccreditations();
	}, []);

	const fetchAccreditations = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/accreditations");
			const accreditationsWithKey = response.data.map((accreditation: any, index: any) => ({
				...accreditation,
				key: index,
			}));
			setAccreditations(accreditationsWithKey);
		} catch (error: any) {
			console.error("Error fetching accreditations:", error);
		}
	};

	const renderCell = React.useCallback((accreditation: any, columnKey: any) => {
		const cellValue = accreditation[columnKey];

		switch (columnKey) {
			default:
				return cellValue;
		}
	}, []);

	return (
		<div>
			<h1 className="text-3xl mb-5">Аккредитации фестиваля</h1>
			<Table tableItems={accreditations} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={AddAccreditationModal} customAddComponentAction={fetchAccreditations} onRowClick={(item) => { router.push(`/dashboard/admin/accreditations/${item.id}`) }} />
		</div>
	);
}