'use client';
import React, { useEffect, useState } from "react";
import { Chip, User, Button, Dropdown, DropdownMenu, DropdownTrigger, DropdownItem } from "@heroui/react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddMemberModal from "@/components/popups/newMember";
import ImportMembersModal from "@/components/popups/membersImport";
import { useRouter } from '@/shared/router';
import { PrinterIcon, VerticalDotsIcon } from "@/components/icons";

const statusColorMap = {
	"Подтверждён": "success",
	"Не отправлен": "danger",
	"В ожидании": "warning",
};

const columns = [
	{ name: "ID", uid: "id", sortable: true },
	{ name: "Фамилия", uid: "surname", sortable: true },
	{ name: "Имя", uid: "name", sortable: true },
	{ name: "Отчество", uid: "middlename", sortable: true },
	{ name: "Аккредитация", uid: "accreditation_id", sortable: true },
	{ name: "Компания", uid: "company_name", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS = ["surname", "name", "middlename", "accreditation_id", "company_name"];

export default function App() {
	const [companies, setCompanies] = React.useState<any>([]);
	const router = useRouter();
	const [showMissingPhotoBanner, setShowMissingPhotoBanner] = useState<any>(false);

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
			const response = await axiosInstanceAuth.get("/api/members/editor");
			const companiesWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setCompanies(companiesWithKey);
		} catch (error: any) {
			console.error("Error fetching companies:", error);
		}
	};

	const renderCell = React.useCallback((member: any, columnKey: any) => {
		const isAccredPhotoReq = member.accreditation && member.accreditation.require_photo;
		const isAccredGatePhotoReq = member.accreditation && Array.isArray(member.accreditation.gates) && member.accreditation.gates.some((g: any) => g.require_photo);
		const isMemberAdditionalGatePhotoReq = Array.isArray(member.gates) && member.gates.some((g: any) => g.require_photo);

		const photoIsActuallyRequired = isAccredPhotoReq || isAccredGatePhotoReq || isMemberAdditionalGatePhotoReq;
		const photoIsMissing = !member.photo_filename; // Assuming photo_filename will be empty/null if no photo

		const highlightClassName = photoIsActuallyRequired && photoIsMissing ? "text-danger font-semibold" : "";

		const cellValue = member[columnKey];

		switch (columnKey) {
			case "state":
				return (
					<><Button color="primary">Подтвердить</Button><Button color="warning" className="ml-1">Отказать</Button></>
				);
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
			default:
				return (
					<div className={`flex flex-col ${highlightClassName}`}>
						{cellValue}
					</div>
				);
		}
	}, []);

	const buttonsGroup = React.useCallback(() => {
		return (
			// <Button color="primary" onClick={() => { alert("Добавление участников временно запрещено") }}>Добавить</Button>
			<div></div>
		)
	}, []);

	return (
		<div>
			<h1 className="text-3xl mb-5">Участники редактора компаний</h1>
			{showMissingPhotoBanner && (
				<div className="mb-4 p-4 rounded-xl shadow-md bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-lg font-semibold animate-pulse border border-white">
					Внимание: У некоторых участников в таблице не загружено обязательное фото!
				</div>
			)}
			<Table tableHeight="full" searchColumns={["name", "middlename", "surname", "company_name"]} tableItems={companies} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={buttonsGroup} onRowClick={(item) => { router.push(`/dashboard/members/${item.id}`) }} />
		</div>
	);
}