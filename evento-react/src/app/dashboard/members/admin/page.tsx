'use client';
import React, { useEffect, useState, useCallback } from "react";
import { Checkbox, Chip, User, Button, Dropdown, DropdownMenu, DropdownTrigger, DropdownItem } from "@heroui/react";
import { Link } from "@heroui/link";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import { useRouter } from '@/shared/router';
import { PrinterIcon, VerticalDotsIcon } from "@/components/icons";

const columns = [
	{ name: "Выделить", uid: "select" },
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Фамилия", uid: "surname", sortable: true, searchable: true },
	{ name: "Имя", uid: "name", sortable: true },
	{ name: "Отчество", uid: "middlename", sortable: true },
	{ name: "Аккредитация", uid: "accreditation_id", sortable: true },
	{ name: "Документ", uid: "document", sortable: true },
	{ name: "Компания", uid: "company_name", sortable: true },
	{ name: "Действия", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["surname", "name", "middlename", "accreditation_id", "company_name", "document"];

export default function App() {
	const [companies, setCompanies] = useState<any>([]);
	const router = useRouter();

	const [selectedKeys, setSelectedKeys] = useState<any>([]);

	const [showMissingPhotoBanner, setShowMissingPhotoBanner] = useState<any>(false);


	const handleSelectedKeysChange = useCallback((keys: any) => {
		setSelectedKeys(keys);
	}, []);

	useEffect(() => {
		fetchCompanies();
	}, []);

	useEffect(() => {
		if (companies.length > 0) {
			const needsBanner = companies.some((member: any) => {
				const isAccredPhotoReq = member.accreditation?.require_photo;
				const isAccredGatePhotoReq = member.accreditation?.gates?.some((g: any) => g.require_photo);
				const isMemberAdditionalGatePhotoReq = member.gates?.some((g: any) => g.require_photo);
				const photoIsActuallyRequired = isAccredPhotoReq || isAccredGatePhotoReq || isMemberAdditionalGatePhotoReq;
				const photoIsMissing = !member.photo_filename;
				return photoIsActuallyRequired && photoIsMissing;
			});
			setShowMissingPhotoBanner(needsBanner);
		} else {
			setShowMissingPhotoBanner(false);
		}
	}, [companies]);

	const fetchCompanies = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/members");
			const companiesWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setCompanies(companiesWithKey);
		} catch (error: any) {
			console.error("Error fetching companies:", error);
		}
	};

	const renderCell = useCallback((member: any, columnKey: any) => {
		const isAccredPhotoReq = member.accreditation && member.accreditation.require_photo;
		const isAccredGatePhotoReq = member.accreditation && Array.isArray(member.accreditation.gates) && member.accreditation.gates.some((g: any) => g.require_photo);
		const isMemberAdditionalGatePhotoReq = Array.isArray(member.gates) && member.gates.some((g: any) => g.require_photo);

		const photoIsActuallyRequired = isAccredPhotoReq || isAccredGatePhotoReq || isMemberAdditionalGatePhotoReq;
		const photoIsMissing = !member.photo_filename; // Assuming photo_filename will be empty/null if no photo

		const highlightClassName = photoIsActuallyRequired && photoIsMissing ? "text-danger font-semibold" : "";

		const cellValue = member[columnKey];

		switch (columnKey) {
			case "accreditation_id":
				return (
					<><div className="invisible h-0 w-0">{member['accreditation_id']}</div><div className={`flex flex-col ${highlightClassName}`}>{member['accreditation']['name']}</div></>
				);
			case "surname":
				return (
					<div className={`flex flex-col ${highlightClassName}`}>
						{cellValue}
					</div>
				);
			case "name":
				return (
					<div className={`flex flex-col ${highlightClassName}`}>
						{cellValue}
					</div>
				);
			case "middlename":
				return (
					<div className={`flex flex-col ${highlightClassName}`}>
						{cellValue}
					</div>
				);
			case "document": {
				return (
					<div className={`flex flex-col ${highlightClassName}`}>
						{cellValue}
					</div>
				);
			}
			default:
				return (
					<div className={`flex flex-col ${highlightClassName}`}>
						{cellValue}
					</div>
				);
		}
	}, []);

	const addMember = useCallback(() => {
		return (
			<div></div>
		)
	}, []);

	return (
		<div>
			<h1 className="text-3xl mb-5">
				Все участники
				<br />
				<Link
					isExternal
					href='/dashboard/members/operator'>
					Режим оператора
				</Link>
			</h1>
			{showMissingPhotoBanner && (
				<div className="mb-4 p-4 rounded-xl shadow-md bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-lg font-semibold animate-pulse border border-white">
					Внимание: У некоторых участников в таблице не загружено обязательное фото!
				</div>
			)}
			<Table
				controlledSelectedKeys={selectedKeys}
				onSelectedKeysChange={handleSelectedKeysChange}
				// selectionMode="multiple"
				searchColumns={["name", "middlename", "surname", "company_name", "document"]}
				tableItems={companies}
				columns={columns}
				INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
				renderCell={renderCell}
				CustomAddComponent={addMember}
				onRowClick={(item) => { router.push(`/dashboard/members/${item.id}`) }}
				tableHeight="full" />
		</div >
	);
}
