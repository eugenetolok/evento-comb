'use client';
import React, { useEffect, useState, useCallback } from "react";
import { Chip, Button } from "@heroui/react";
import Table from "@/components/tables/printTable/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import { useRouter } from '@/shared/router';
import { PrinterIcon } from "@/components/icons";
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
	generateBadgePayload,
	validateAndSplitMembers,
} from "@/components/print/badge";

const columns = [
	{ name: "Фамилия", uid: "surname", sortable: true, searchable: true },
	{ name: "Имя", uid: "name", sortable: true },
	{ name: "Отчество", uid: "middlename", sortable: true },
	{ name: "Аккредитация", uid: "accreditation.name", sortable: true },
	{ name: "Документ", uid: "document", sortable: true },
	{ name: "Компания", uid: "company_name", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS = ["surname", "name", "middlename", "accreditation.name", "company_name", "document"];

export default function App() {
	const [members, setMembers] = useState<any>([]);
	const router = useRouter();
	const [filteredItemsForMassActions, setFilteredItemsForMassActions] = useState<any>([]);
	const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));

	const fetchMembers = useCallback(async () => {
		try {
			// This endpoint preloads accreditation.gates, which is needed.
			const response = await axiosInstanceAuth.get("/api/members");
			const membersWithKey = response.data.map((member: any) => ({
				...member,
				key: member.id.toString(),
			}));
			setMembers(membersWithKey);
		} catch (error: any) {
			console.error("Error fetching members:", error);
			toast.error("Ошибка загрузки участников");
		}
	}, []);

	useEffect(() => {
		fetchMembers();
	}, [fetchMembers]);

	const renderCell = useCallback((member: any, columnKey: any) => {
		const isAccredPhotoReq = member.accreditation && member.accreditation.require_photo;
		const isAccredGatePhotoReq = member.accreditation && Array.isArray(member.accreditation.gates) && member.accreditation.gates.some((g: any) => g.require_photo);
		const isMemberAdditionalGatePhotoReq = Array.isArray(member.gates) && member.gates.some((g: any) => g.require_photo);

		const photoIsActuallyRequired = isAccredPhotoReq || isAccredGatePhotoReq || isMemberAdditionalGatePhotoReq;
		const photoIsMissing = !member.photo_filename; // Assuming photo_filename will be empty/null if no photo

		const highlightClassName = photoIsActuallyRequired && photoIsMissing ? "text-danger font-semibold" : "";

		const montazh = member.accreditation?.name?.toLowerCase().includes("монтаж") ? "text-warning font-semibold" : "";

		const cellValue = columnKey === "accreditation.name" ? member.accreditation?.name : member[columnKey];
		switch (columnKey) {
			case "accreditation.name":
				return <div className={`flex flex-col ${highlightClassName} ${montazh}`}>{cellValue || 'N/A'}</div>;
			case "print_count":
				return (
					<Chip
						color={
							member.blocked ? 'danger' :
								member.print_count === 0 ? 'default' :
									member.print_count === 1 ? 'success' : 'warning'
						}
					>
						{cellValue}
					</Chip>
				);
			default:
				return <div className={`flex flex-col ${highlightClassName} ${montazh}`}>{cellValue}</div>;
		}
	}, []);

	const addMember = useCallback(() => <div />, []);

	return (
		<div>
			<ToastContainer theme="dark" position="bottom-right" />
			<h1 className="text-3xl mb-5">Мониторинг участников</h1>
			<Table
				searchColumns={["name", "middlename", "surname", "company_name", "document"]}
				tableItems={members}
				columns={columns}
				INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
				renderCell={renderCell}
				CustomAddComponent={addMember}
				onRowClick={(item) => router.push(`/dashboard/members/${item.id}/monitoring`)}
				onFilteredItemsChange={setFilteredItemsForMassActions}
				tableHeight="full"
				onSelectionChange={setSelectedKeys}
			/>
		</div>
	);
}