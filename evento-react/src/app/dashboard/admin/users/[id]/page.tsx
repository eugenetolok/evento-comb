'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
	Button,
	Card,
	CardBody,
	Input,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	Select,
	SelectItem,
	Switch,
	Tab,
	Tabs,
	Chip,
	useDisclosure,
} from "@heroui/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { axiosInstanceAuth } from "@/axiosConfig";
import { EyeFilledIcon, EyeSlashFilledIcon } from "@/components/icons";
import SimpleNavbar from "@/components/toolbars/simple";
import { handleDelete } from "@/components/utils/delete";
import { useRouter } from "@/shared/router";

type UserRole = "admin" | "editor" | "company" | "operator" | "monitoring" | string;

type UserModel = {
	id: string;
	username: string;
	password?: string;
	role: UserRole;
	frozen: boolean;
	company_id: string;
};

type CreatedCompany = {
	id: string;
	name: string;
	inn: string;
	created_at: string;
	is_deleted: boolean;
	current_editor_id: string;
};

type UserPageProps = {
	params: {
		id?: string;
	};
};

const roles = [
	{ label: "Админ", value: "admin" },
	{ label: "Редактор компаний", value: "editor" },
	{ label: "Представитель компании", value: "company" },
	{ label: "Оператор на мероприятии", value: "operator" },
	{ label: "Мониторинг", value: "monitoring" },
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

function formatDateTime(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	return parsed.toLocaleString("ru-RU");
}

const EMPTY_USER: UserModel = {
	id: "",
	username: "",
	role: "editor",
	frozen: false,
	company_id: "00000000-0000-0000-0000-000000000000",
};

export default function UserPage({ params }: UserPageProps) {
	const id = params.id || "";
	const router = useRouter();
	const [user, setUser] = useState<UserModel>(EMPTY_USER);
	const [createdCompanies, setCreatedCompanies] = useState<CreatedCompany[]>([]);

	const { isOpen: isResetOpen, onOpen: onResetOpen, onClose: onResetClose } = useDisclosure();

	const [newPassword, setNewPassword] = useState<string>("");
	const [repeatPassword, setRepeatPassword] = useState<string>("");
	const [sendToEmail, setSendToEmail] = useState<boolean>(false);
	const [resetEmail, setResetEmail] = useState<string>("");
	const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);

	const linkedCompanyId = useMemo(() => {
		const value = user.company_id || "";
		return value === "00000000-0000-0000-0000-000000000000" ? "" : value;
	}, [user.company_id]);

	useEffect(() => {
		if (!id) {
			toast.error("Некорректный ID пользователя");
			return;
		}
		const loadData = async () => {
			try {
				const [userResponse, createdCompaniesResponse] = await Promise.all([
					axiosInstanceAuth.get<UserModel>(`/api/users/${id}`),
					axiosInstanceAuth.get<CreatedCompany[]>(`/api/users/${id}/created-companies`),
				]);
				setUser(userResponse.data);
				setCreatedCompanies(createdCompaniesResponse.data || []);
			} catch (error) {
				toast.error("Не удалось загрузить данные пользователя");
			}
		};
		void loadData();
	}, [id]);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setUser((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setUser((prev) => ({
			...prev,
			role: event.target.value,
		}));
	};

	const handleSaveUser = () => {
		axiosInstanceAuth
			.put(`/api/users/${id}`, user)
			.then(() => toast.success("Успешно сохранено"))
			.catch(() => toast.error("Ошибка при сохранении"));
	};

	const handleFreezeSelection = () => {
		setUser((prev) => ({ ...prev, frozen: !prev.frozen }));
	};

	const handleResetPassword = async () => {
		if (newPassword !== "" && newPassword !== repeatPassword) {
			toast.error("Пароли не совпадают");
			return;
		}
		if (!sendToEmail && newPassword.trim() === "") {
			toast.error("Введите новый пароль или включите отправку ссылки на email");
			return;
		}
		if (sendToEmail && resetEmail.trim() === "") {
			toast.error("Укажите email получателя");
			return;
		}

		try {
			const response = await axiosInstanceAuth.post(`/api/users/resetPassword/${user.id}`, {
				password: newPassword.trim(),
				recipient_email: sendToEmail ? resetEmail.trim() : "",
				recepient_email: sendToEmail ? resetEmail.trim() : "",
			});

			if (response.status === 200) {
				const payload = response.data as {
					password_updated?: boolean;
					reset_email_sent?: boolean;
				};
				if (payload.password_updated && payload.reset_email_sent) {
					toast.success("Пароль обновлён и ссылка отправлена на email");
				} else if (payload.password_updated) {
					toast.success("Пароль успешно обновлён");
				} else if (payload.reset_email_sent) {
					toast.success("Ссылка для сброса пароля отправлена");
				} else {
					toast.success("Запрос выполнен");
				}
				onResetClose();
			} else {
				toast.error(`Ошибка: ${response.statusText}`);
			}
		} catch (error: any) {
			toast.error(`Ошибка: ${error.response?.data || error.message}`);
		}
	};

	const generateRandomPass = () => {
		const tempPass =
			Math.random().toString(36).slice(2, 8) +
			Math.random().toString(36).slice(2, 8) +
			Date.now().toString(36).slice(2, 8);
		setNewPassword(tempPass);
		setRepeatPassword(tempPass);
	};

	return (
		<>
			<ToastContainer theme="dark" />
			<SimpleNavbar
				title="Редактирование пользователя"
				deleteHandler={() => handleDelete({ path: "users", id, router })}
				saveHandler={handleSaveUser}
			/>
			<div className="flex w-full flex-col gap-4 px-6 py-2">
				<Tabs aria-label="Пользователь">
					<Tab key="profile" title="Профиль">
						<div className="flex flex-col gap-3 mt-3">
							<Input
								variant="bordered"
								fullWidth
								size="lg"
								label="Логин"
								isRequired
								name="username"
								value={user.username}
								onChange={handleInputChange}
							/>
							<Select
								variant="bordered"
								isRequired
								label="Роль пользователя"
								selectedKeys={new Set([user.role])}
								fullWidth
								size="lg"
								name="role"
								onChange={handleSelectChange}
							>
								{roles.map((roleOption) => (
									<SelectItem key={roleOption.value}>{roleOption.label}</SelectItem>
								))}
							</Select>
							<Switch isSelected={user.frozen} onValueChange={handleFreezeSelection}>
								Заморожен
							</Switch>
							<div className="flex flex-wrap gap-2">
								<Chip variant="flat">Роль: {roleToLabel(user.role)}</Chip>
								{user.role === "company" ? (
									<Chip variant="flat" color={linkedCompanyId ? "primary" : "warning"}>
										{linkedCompanyId ? "Компания привязана" : "Компания не привязана"}
									</Chip>
								) : null}
							</div>
							<div className="flex flex-wrap gap-2">
								<Button onPress={onResetOpen} color="warning">
									Изменить пароль
								</Button>
								{user.role === "company" ? (
									<Button
										color="secondary"
										variant="flat"
										isDisabled={!linkedCompanyId}
										onPress={() => {
											if (!linkedCompanyId) {
												toast.warn("У пользователя не привязана компания.");
												return;
											}
											router.push(`/dashboard/companies/${linkedCompanyId}`);
										}}
									>
										Перейти к компании
									</Button>
								) : null}
							</div>
						</div>
					</Tab>
					<Tab key="created_companies" title={`Созданные компании (${createdCompanies.length})`}>
						<div className="mt-3 space-y-3">
							{createdCompanies.length === 0 ? (
								<Card className="border border-divider">
									<CardBody className="text-default-500">
										Этот пользователь не создавал компании.
									</CardBody>
								</Card>
							) : (
								createdCompanies.map((company) => (
									<Card key={company.id} className="border border-divider">
										<CardBody className="gap-3">
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div>
													<div className="text-lg font-semibold">{company.name}</div>
													<div className="text-sm text-default-500">ИНН: {company.inn || "—"}</div>
													<div className="text-sm text-default-500">
														Создана: {formatDateTime(company.created_at)}
													</div>
												</div>
												<div className="flex flex-wrap gap-2">
													<Chip size="sm" variant="flat" color={company.is_deleted ? "warning" : "success"}>
														{company.is_deleted ? "Удалена" : "Активна"}
													</Chip>
													{company.current_editor_id === user.id ? (
														<Chip size="sm" variant="flat" color="primary">
															В управлении этого пользователя
														</Chip>
													) : null}
												</div>
											</div>
											<Button
												variant="flat"
												color="primary"
												isDisabled={company.is_deleted}
												onPress={() => router.push(`/dashboard/companies/${company.id}`)}
											>
												Открыть карточку компании
											</Button>
										</CardBody>
									</Card>
								))
							)}
						</div>
					</Tab>
				</Tabs>
			</div>

			<Modal isOpen={isResetOpen} onClose={onResetClose} size="sm" backdrop="blur">
				<ModalContent>
					<ModalHeader>Изменение пароля</ModalHeader>
					<ModalBody className="flex flex-col gap-3">
						<Input
							label="Новый пароль"
							type={isPasswordVisible ? "text" : "password"}
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							endContent={
								<div className="flex items-center gap-2">
									<button className="focus:outline-none" type="button" onClick={generateRandomPass}>
										🎲
									</button>
									<button
										className="focus:outline-none"
										type="button"
										onClick={() => setIsPasswordVisible((prev) => !prev)}
									>
										{isPasswordVisible ? (
											<EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
										) : (
											<EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
										)}
									</button>
								</div>
							}
						/>
						<Input
							label="Повторите пароль"
							type={isPasswordVisible ? "text" : "password"}
							value={repeatPassword}
							onChange={(event) => setRepeatPassword(event.target.value)}
						/>
						<Switch isSelected={sendToEmail} onValueChange={setSendToEmail}>
							Отправить ссылку на email
						</Switch>
						{sendToEmail ? (
							<Input
								label="Email получателя"
								type="email"
								value={resetEmail}
								onChange={(event) => setResetEmail(event.target.value)}
							/>
						) : null}
					</ModalBody>
					<ModalFooter>
						<Button onPress={onResetClose}>Отмена</Button>
						<Button color="primary" onPress={handleResetPassword}>
							Изменить
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
