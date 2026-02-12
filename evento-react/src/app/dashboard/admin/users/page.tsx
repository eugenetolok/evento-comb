'use client';
import React, { useEffect } from "react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddUserModal from "@/components/popups/newUser";
import { useRouter } from "@/shared/router";

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Логин", uid: "username", sortable: true },
	{ name: "Роль", uid: "role", sortable: true }, ,
];

const INITIAL_VISIBLE_COLUMNS = ["username", "role"];

export default function App() {
	const router = useRouter();
	const [users, setUsers] = React.useState<any>([]);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/users");
			const usersWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setUsers(usersWithKey);
		} catch (error: any) {
			console.error("Error fetching users:", error);
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
			<h1 className="text-3xl mb-5">Пользователи системы</h1>
			<Table tableItems={users} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={AddUserModal} customAddComponentAction={fetchUsers} searchColumns={["username"]} onRowClick={(item) => { router.push(`/dashboard/admin/users/${item.id}`) }} />
		</div>
	);
}