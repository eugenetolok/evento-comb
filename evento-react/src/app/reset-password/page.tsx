'use client';

import React, { FormEvent, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { axiosInstance } from "@/axiosConfig";
import { EyeFilledIcon, EyeSlashFilledIcon, LogoFestLoginPage } from "@/components/icons";
import { useRouter } from "@/shared/router";

const MIN_PASSWORD_LENGTH = 8;

function readTokenFromSearch(search: string): string {
	const params = new URLSearchParams(search);
	return (params.get("token") || "").trim();
}

export default function ResetPasswordPage() {
	const router = useRouter();
	const location = useLocation();
	const token = useMemo(() => readTokenFromSearch(location.search), [location.search]);

	const [password, setPassword] = useState<string>("");
	const [passwordConfirm, setPasswordConfirm] = useState<string>("");
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const toggleVisibility = () => setIsVisible((value) => !value);

	const extractErrorMessage = (error: unknown): string => {
		if (typeof error !== "object" || error === null) {
			return "Не удалось обновить пароль";
		}
		const axiosError = error as { response?: { data?: unknown } };
		const data = axiosError.response?.data;
		if (typeof data === "string" && data.length > 0) {
			try {
				const parsed = JSON.parse(data) as { error?: string };
				if (parsed.error) {
					return parsed.error;
				}
			} catch {
				return data;
			}
		}
		if (typeof data === "object" && data !== null && "error" in data) {
			const parsed = data as { error?: unknown };
			if (typeof parsed.error === "string" && parsed.error.length > 0) {
				return parsed.error;
			}
		}
		return "Не удалось обновить пароль";
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (token === "") {
			toast.error("Некорректная ссылка для сброса пароля");
			return;
		}
		if (password.trim().length < MIN_PASSWORD_LENGTH) {
			toast.error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
			return;
		}
		if (password !== passwordConfirm) {
			toast.error("Пароли не совпадают");
			return;
		}

		setIsSubmitting(true);
		try {
			await axiosInstance.post("/api/auth/reset-password", {
				token,
				password: password.trim(),
			});
			toast.success("Пароль обновлён. Выполняется переход на страницу входа...");
			setTimeout(() => {
				router.push("/login");
			}, 900);
		} catch (error: unknown) {
			toast.error(extractErrorMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="h-screen flex items-center justify-center px-4">
			<Card className="w-full max-w-md">
				<CardHeader className="flex flex-col items-center gap-2 pt-6">
					<LogoFestLoginPage className="h-10 w-auto" />
					<div className="text-lg font-bold">Сброс пароля</div>
				</CardHeader>
				<CardBody className="pb-6">
					<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
						<Input
							label="Новый пароль"
							type={isVisible ? "text" : "password"}
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							endContent={
								<button className="focus:outline-none" type="button" onClick={toggleVisibility}>
									{isVisible ? (
										<EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
									) : (
										<EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
									)}
								</button>
							}
						/>
						<Input
							label="Повторите пароль"
							type={isVisible ? "text" : "password"}
							value={passwordConfirm}
							onChange={(event) => setPasswordConfirm(event.target.value)}
						/>
						<Button color="primary" type="submit" isLoading={isSubmitting}>
							Сохранить новый пароль
						</Button>
						<Button variant="light" type="button" onClick={() => router.push("/login")}>
							Назад к авторизации
						</Button>
					</form>
				</CardBody>
			</Card>
			<ToastContainer theme="dark" />
		</div>
	);
}
