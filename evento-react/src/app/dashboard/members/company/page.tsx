'use client';
import React, { useEffect, useState } from "react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import { useRouter } from '@/shared/router';
import AddMemberModal from "@/components/popups/newMember";
import ImportMembersModal from "@/components/popups/membersImport";

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
	{ name: "Аккредитация", uid: "accreditation", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS = ["surname", "name", "middlename", "accreditation", "company_name"];

export default function App() {
	const [company, setCompany] = React.useState<any>({
		name: "",
		members_limit: 0
	});
	const [members, setMembers] = React.useState<any>([]);
	const router = useRouter();
	const [isFrozen, setIsFrozen] = useState<any>(false);
	const [showMissingPhotoBanner, setShowMissingPhotoBanner] = useState<any>(false);

	useEffect(() => {
		fetchCompanyName();
		fetchMembers();
	}, []);

	useEffect(() => {
		if (members.length > 0) {
			const needsBanner = members.some((member: any) => {
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
	}, [members]);

	const fetchCompanyName = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/companies/my");
			setCompany(response.data)
		} catch (error: any) {
			console.error("Error fetching members:", error);
		}
	};

	const fetchMembers = async () => {
		try {
			const response = await axiosInstanceAuth.get("/api/members/company");
			const membersWithKey = response.data.map((company: any, index: any) => ({
				...company,
				key: index,
			}));
			setMembers(membersWithKey);
		} catch (error: any) {
			console.error("Error fetching members:", error);
		}
		axiosInstanceAuth.get('/api/users/frozen')
			.then(response => {
				setIsFrozen(response.data === true);
			})
			.catch(error => {
				console.error('Error checking frozen status:', error);
			});
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
			case "accreditation":
				return (
					<div className={`flex flex-col ${highlightClassName}`}>{cellValue['name']}</div>
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
			<>
				<AddMemberModal action={fetchMembers} company_id={company.id} />
				<ImportMembersModal action={fetchMembers} companyName={company.name} />
			</>
		)
	}, []);
	return (
		<div>
			<h1 className="text-3xl mb-5">Участники: {company.name}</h1>
			<h2 className="text-xl mb-5">Лимиты:  {members.length} из {company.members_limit}</h2>
			{showMissingPhotoBanner && (
				<div className="mb-4 p-4 rounded-xl shadow-md bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-lg font-semibold animate-pulse border border-white">
					Внимание: У некоторых участников в таблице не загружено обязательное фото!
				</div>
			)}
			{isFrozen && (
				<div className="fixed bottom-0 right-0 m-4 p-4 bg-blue-500 text-white rounded-lg shadow-lg z-50">
					Ваш аккаунт заморожен (только чтение)
				</div>
			)}
			<Table tableHeight="full" searchColumns={["name", "middlename", "surname"]} tableItems={members} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} CustomAddComponent={buttonsGroup} onRowClick={(item) => { router.push(`/dashboard/members/${item.id}`) }} />
		</div>
	);
}