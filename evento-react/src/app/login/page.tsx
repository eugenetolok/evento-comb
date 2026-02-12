'use client';
import React, { useState } from "react";
import { axiosInstance } from "@/axiosConfig";
import { Input, Button, Card, CardHeader } from "@heroui/react";
import { EyeFilledIcon, EyeSlashFilledIcon } from "./icons";
import './styles.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from '@/shared/router';
import { LogoFestLoginPage } from "@/components/icons";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
	const [isVisible, setIsVisible] = useState<any>(false);
	const [login, setLogin] = useState<any>("");
	const [password, setPassword] = useState<any>("");
	const router = useRouter();

	const toggleVisibility = () => setIsVisible(!isVisible);

	const handleLoginChange = (e: any) => {
		setLogin(e.target.value);
	};

	const handlePasswordChange = (e: any) => {
		setPassword(e.target.value);
	};

	const handleSubmit = async (event: any) => {
		event.preventDefault(); // Prevent default form submission

		try {
			const response = await axiosInstance.post(`/api/auth`, { username: login.trim(), password: password.trim() });

			// Assuming your API returns the token directly, adjust as needed
			const { token } = response.data;

			// Set cookie client-side
			document.cookie = `access_token = ${token}; path = /;max-age=${72 * 60 * 60};`;
			// Redirect or perform any action after successful login
			toast.success("Успешная авторизация")
			setTimeout(() => {
				router.push('/dashboard');
			}, 200)

		} catch (error: any) {
			// Handle errors or unsuccessful responses
			toast.error("Ошибка авторизации")
			console.error("Login failed:", error.response || error.message);
		}
	};

	const getCity = () => {
		if (typeof (window) !== "undefined") {
			const subdomain = window.location.host.split(".")[0]; // Get the subdomain

			if (siteConfig.cities[subdomain]) {
				return siteConfig.cities[subdomain];
			}
		}
		return siteConfig.cities[""];
	}

	return (
		<div className="h-screen flex">
			<div className="hidden md:flex flex-col items-center justify-center w-1/2 p-8">
				<div className="non-video">

				</div>
				<div className="top text-center">
					<LogoFestLoginPage className="mb-2 mx-auto" />

					{/* <div className="text-2xl font-bold mb-2 text-gray-200">Главное событие года</div> */}
					<div className="text-gray-200">{getCity()}</div>
				</div>
			</div>
			<div className="flex flex-col items-center justify-center md:w-1/2 md:p-8 w-[100%]">
				<div className="mb-4 text-2xl font-bold text-center">Авторизация</div>
				<form className="w-full max-w-xs mx-auto space-y-4 text-center" onSubmit={handleSubmit}>
					<div>
						<Input
							label="Логин"
							variant="bordered"
							className="max-w-xs"
							value={login}
							onChange={handleLoginChange}
						/>
					</div>
					<div>
						<Input
							label="Пароль"
							variant="bordered"
							endContent={
								<button className="focus:outline-none" type="button" onClick={toggleVisibility}>
									{isVisible ? (
										<EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
									) : (
										<EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
									)}
								</button>
							}
							type={isVisible ? "text" : "password"}
							className="max-w-xs"
							value={password}
							onChange={handlePasswordChange}
						/>
					</div>
					<Button type="submit" className="w-[100%]" color="primary">Вход</Button>
					<ToastContainer theme="dark" />
				</form>
			</div>
		</div>
	);
};
