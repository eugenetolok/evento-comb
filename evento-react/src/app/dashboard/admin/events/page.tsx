'use client';
import React, { useEffect } from "react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddEventModal from "@/components/popups/newEvent";
import { useRouter } from '@/shared/router';

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Название мероприятия", uid: "name", sortable: true },
	{ name: "Описание", uid: "description", sortable: true }
];

const INITIAL_VISIBLE_COLUMNS = ["name", "description"];

export default function App() {
	const router = useRouter();
	const [events, setEvents] = React.useState<any>([]);

	useEffect(() => {
		fetchEvents();
	}, []);

	const fetchEvents = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/events");
			const eventsWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setEvents(eventsWithKey);
		} catch (error: any) {
			console.error("Error fetching events:", error);
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
			<h1 className="text-3xl mb-5">Мероприятия фестиваля</h1>
			<Table tableItems={events} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={AddEventModal} customAddComponentAction={fetchEvents} onRowClick={(item) => { router.push(`/dashboard/admin/events/${item.id}`) }} />
		</div>
	);
}