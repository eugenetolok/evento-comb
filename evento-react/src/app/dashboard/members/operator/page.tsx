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
	{ name: "ID", uid: "id", sortable: true },
	{ name: "🖨️", uid: "print_count", sortable: true },
	{ name: "Фамилия", uid: "surname", sortable: true, searchable: true },
	{ name: "Имя", uid: "name", sortable: true },
	{ name: "Отчество", uid: "middlename", sortable: true },
	{ name: "Аккредитация", uid: "accreditation.name", sortable: true },
	{ name: "Документ", uid: "document", sortable: true },
	{ name: "Компания", uid: "company_name", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS = ["print_count", "surname", "name", "middlename", "accreditation.name", "company_name", "document"];

export default function App() {
	const [members, setMembers] = useState<any>([]);
	const router = useRouter();
	const [filteredItemsForMassActions, setFilteredItemsForMassActions] = useState<any>([]);
	const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));

	const [printerUrl, setPrinterUrl] = useState<any>('http://localhost:8434');

	useEffect(() => {
		const savedUrl = localStorage.getItem('printerApiUrl');
		setPrinterUrl(savedUrl || 'http://localhost:8434');
	}, []);

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

	const handleMassPrint = async (itemsToPrint: any) => {
		if (!itemsToPrint || itemsToPrint.length === 0) {
			toast.info("Нет участников для печати.");
			return;
		}

		// 1. Validate members using the shared utility function
		const { validMembers, invalidMembers } = validateAndSplitMembers(itemsToPrint);

		// 2. Notify user about invalid members, if any
		if (invalidMembers.length > 0) {
			toast.warn(
				<div>
					<b>Не будут напечатаны ({invalidMembers.length}):</b>
					<ul style={{ listStyle: 'disc', marginLeft: '20px', marginTop: '5px' }}>
						{invalidMembers.slice(0, 5).map((item: any) => (
							<li key={item.member.id}>
								{`${item.member.surname} ${item.member.name.charAt(0)}.`} ({item.reason})
							</li>
						))}
					</ul>
					{invalidMembers.length > 5 && <p style={{ marginTop: '5px' }}>...и еще {invalidMembers.length - 5}.</p>}
				</div>,
				{ autoClose: 8000, theme: "colored" }
			);
		}

		// 3. Check if there are any valid members left to print
		if (validMembers.length === 0) {
			toast.error("Нет подходящих для печати участников после проверки.");
			return;
		}

		try {
			const memberIdsToPrint = validMembers.map((m: any) => m.id);

			// 4. Fetch all badge payloads from our backend
			const payloadsResponse = await axiosInstanceAuth.post('/api/members/badge-payloads-mass', { memberIds: memberIdsToPrint });
			const badgeRequests = payloadsResponse.data;

			if (!badgeRequests || badgeRequests.length === 0) {
				toast.error("Не удалось получить данные для печати с сервера.");
				return;
			}

			// 5. Send the entire batch to the printer service
			await axios.post(`${printerUrl}/api/generate/badges?direct=true`, badgeRequests);

			// 6. Update print count in the 'evento' backend
			const memberIdsToUpdate = validMembers.map((member: any) => member.id);
			await axiosInstanceAuth.post(`/api/members/massPrint`, { memberIds: memberIdsToUpdate });

			toast.success(`Задание на печать для ${badgeRequests.length} бейджей успешно отправлено.`);

			// 7. Reset selection and refresh data
			setSelectedKeys(new Set([]));
			fetchMembers();

		} catch (error: any) {
			console.error("Error mass printing badges:", error);
			const errorMessage = error.response?.data?.message || "Ошибка печати бейджей";
			toast.error(errorMessage);
		}
	};

	const handlePrintSelected = () => {
		if (selectedKeys.size === 0) {
			toast.info("Нет выбранных участников для печати.");
			return;
		}
		const itemsToPrint = members.filter((member: any) => selectedKeys.has(member.key));
		handleMassPrint(itemsToPrint);
	};

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
			<h1 className="text-3xl mb-5">Массовая печать</h1>
			<div className="flex flex-wrap gap-2 mb-2">
				<Button
					endContent={<PrinterIcon />}
					isDisabled={selectedKeys.size === 0}
					color="primary"
					onPress={handlePrintSelected}
				>
					Печать выбранных ({selectedKeys.size})
				</Button>
			</div>
			<Table
				searchColumns={["name", "middlename", "surname", "company_name", "document"]}
				tableItems={members}
				columns={columns}
				INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
				renderCell={renderCell}
				CustomAddComponent={addMember}
				onRowClick={(item) => router.push(`/dashboard/members/${item.id}/operator`)}
				onFilteredItemsChange={setFilteredItemsForMassActions}
				tableHeight="full"
				selectionMode="multiple"
				selectedKeys={selectedKeys}
				onSelectionChange={setSelectedKeys}
			/>
		</div>
	);
}