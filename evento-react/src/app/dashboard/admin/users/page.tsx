'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody, Chip, Select, SelectItem } from "@heroui/react";

import { axiosInstanceAuth } from "@/axiosConfig";
import AddUserModal from "@/components/popups/newUser";
import Table from "@/components/tables/universal/table";
import { useRouter } from "@/shared/router";

type UserRole = "admin" | "editor" | "company" | "operator" | "monitoring" | string;

type UserTableItem = {
	id: string;
	username: string;
	role: UserRole;
	frozen: boolean;
	company_id: string;
	company_name: string;
	company_deleted: boolean;
	managed_companies_count: number;
	created_companies_count: number;
};

type UserRow = UserTableItem & {
	key: string;
	role_label: string;
	status_label: string;
	company_display: string;
	company_binding: "linked" | "unlinked" | "none";
};

const columns = [
	{ name: "Логин", uid: "username", sortable: true },
	{ name: "Роль", uid: "role_label", sortable: true },
	{ name: "Компания", uid: "company_display", sortable: true },
	{ name: "Управляет", uid: "managed_companies_count", sortable: true },
	{ name: "Создал компаний", uid: "created_companies_count", sortable: true },
	{ name: "Статус", uid: "status_label", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS = [
	"username",
	"role_label",
	"company_display",
	"managed_companies_count",
	"created_companies_count",
	"status_label",
];

const roleOptions = [
	{ key: "all", label: "Все роли" },
	{ key: "admin", label: "Админ" },
	{ key: "editor", label: "Редактор компаний" },
	{ key: "company", label: "ЛК компании" },
	{ key: "operator", label: "Оператор" },
	{ key: "monitoring", label: "Мониторинг" },
];

const frozenOptions = [
	{ key: "all", label: "Все статусы" },
	{ key: "active", label: "Активные" },
	{ key: "frozen", label: "Замороженные" },
];

const companyBindingOptions = [
	{ key: "all", label: "Все привязки" },
	{ key: "linked", label: "С привязанной компанией" },
	{ key: "unlinked", label: "Без компании / удалена" },
];

function roleToLabel(role: UserRole): string {
	switch (role) {
		case "admin":
			return "Админ";
		case "editor":
			return "Редактор компаний";
		case "company":
			return "ЛК компании";
		case "operator":
			return "Оператор";
		case "monitoring":
			return "Мониторинг";
		default:
			return role || "Неизвестно";
	}
}

function isNilUUID(value: string | undefined): boolean {
	return value === "00000000-0000-0000-0000-000000000000";
}

function buildCompanyDisplay(user: UserTableItem): string {
	if (user.role === "company") {
		if (!isNilUUID(user.company_id) && user.company_name) {
			return user.company_deleted ? `${user.company_name} (удалена)` : user.company_name;
		}
		return "Не привязана";
	}
	if (user.role === "editor" && user.managed_companies_count > 0) {
		return `Управляет: ${user.managed_companies_count}`;
	}
	return "—";
}

function getCompanyBindingState(user: UserTableItem): "linked" | "unlinked" | "none" {
	if (user.role !== "company") {
		return "none";
	}
	if (!isNilUUID(user.company_id) && user.company_name && !user.company_deleted) {
		return "linked";
	}
	return "unlinked";
}

export default function UsersAdminPage() {
	const router = useRouter();
	const [users, setUsers] = useState<UserRow[]>([]);
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [frozenFilter, setFrozenFilter] = useState<string>("all");
	const [companyBindingFilter, setCompanyBindingFilter] = useState<string>("all");

	useEffect(() => {
		void fetchUsers();
	}, []);

	const fetchUsers = async () => {
		try {
			const response = await axiosInstanceAuth.get<UserTableItem[]>("/api/users/table");
			const mapped = response.data.map((user) => ({
				...user,
				key: user.id,
				role_label: roleToLabel(user.role),
				status_label: user.frozen ? "Заморожен" : "Активен",
				company_display: buildCompanyDisplay(user),
				company_binding: getCompanyBindingState(user),
			}));
			setUsers(mapped);
		} catch (error) {
			console.error("Error fetching users table:", error);
		}
	};

	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			if (roleFilter !== "all" && user.role !== roleFilter) {
				return false;
			}
			if (frozenFilter === "active" && user.frozen) {
				return false;
			}
			if (frozenFilter === "frozen" && !user.frozen) {
				return false;
			}
			if (companyBindingFilter !== "all") {
				if (user.role !== "company") {
					return false;
				}
				if (companyBindingFilter === "linked" && user.company_binding !== "linked") {
					return false;
				}
				if (companyBindingFilter === "unlinked" && user.company_binding !== "unlinked") {
					return false;
				}
			}
			return true;
		});
	}, [users, roleFilter, frozenFilter, companyBindingFilter]);

	const stats = useMemo(() => {
		const companyUsers = users.filter((user) => user.role === "company").length;
		const editors = users.filter((user) => user.role === "editor").length;
		const frozenUsers = users.filter((user) => user.frozen).length;
		const creators = users.filter((user) => user.created_companies_count > 0).length;
		return {
			total: users.length,
			companyUsers,
			editors,
			frozenUsers,
			creators,
		};
	}, [users]);

	const renderCell = React.useCallback((item: UserRow, columnKey: string) => {
		const cellValue = item[columnKey as keyof UserRow];
		switch (columnKey) {
			case "role_label":
				return (
					<Chip size="sm" variant="flat" color={item.role === "company" ? "primary" : "default"}>
						{item.role_label}
					</Chip>
				);
			case "status_label":
				return (
					<Chip size="sm" variant="flat" color={item.frozen ? "danger" : "success"}>
						{item.status_label}
					</Chip>
				);
			case "company_display":
				return (
					<span className={item.company_display.includes("удалена") || item.company_display === "Не привязана" ? "text-warning" : ""}>
						{item.company_display}
					</span>
				);
			default:
				return cellValue as React.ReactNode;
		}
	}, []);

	return (
		<div className="space-y-4">
			<h1 className="text-3xl">Пользователи системы</h1>

			<Card className="border border-divider">
				<CardBody className="gap-3">
					<div className="flex flex-wrap gap-2">
						<Chip variant="flat">Всего: {stats.total}</Chip>
						<Chip variant="flat">ЛК компаний: {stats.companyUsers}</Chip>
						<Chip variant="flat">Редакторы: {stats.editors}</Chip>
						<Chip variant="flat" color="danger">Замороженные: {stats.frozenUsers}</Chip>
						<Chip variant="flat" color="success">Создавали компании: {stats.creators}</Chip>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<Select
							label="Фильтр по роли"
							selectedKeys={new Set([roleFilter])}
							onSelectionChange={(keys) => {
								const value = String(Array.from(keys)[0] ?? "all");
								setRoleFilter(value);
							}}
						>
							{roleOptions.map((option) => (
								<SelectItem key={option.key}>{option.label}</SelectItem>
							))}
						</Select>
						<Select
							label="Фильтр по статусу"
							selectedKeys={new Set([frozenFilter])}
							onSelectionChange={(keys) => {
								const value = String(Array.from(keys)[0] ?? "all");
								setFrozenFilter(value);
							}}
						>
							{frozenOptions.map((option) => (
								<SelectItem key={option.key}>{option.label}</SelectItem>
							))}
						</Select>
						<Select
							label="Привязка компании (для ЛК компании)"
							selectedKeys={new Set([companyBindingFilter])}
							onSelectionChange={(keys) => {
								const value = String(Array.from(keys)[0] ?? "all");
								setCompanyBindingFilter(value);
							}}
						>
							{companyBindingOptions.map((option) => (
								<SelectItem key={option.key}>{option.label}</SelectItem>
							))}
						</Select>
					</div>
				</CardBody>
			</Card>

			<Table
				tableItems={filteredUsers}
				columns={columns}
				INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
				renderCell={renderCell}
				CustomAddComponent={AddUserModal}
				customAddComponentAction={fetchUsers}
				searchColumns={["username", "role_label", "company_display"]}
				onRowClick={(item) => {
					router.push(`/dashboard/admin/users/${item.id}`);
				}}
			/>
		</div>
	);
}
