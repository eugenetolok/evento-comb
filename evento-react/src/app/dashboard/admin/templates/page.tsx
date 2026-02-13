'use client';

import React from "react";
import { Card, CardFooter, CardHeader } from "@heroui/react";
import { button as buttonStyles } from "@heroui/theme";
import { Link } from "@heroui/link";

export default function AdminTemplatesPage() {
	return (
		<div className="px-2 py-2">
			<h1 className="text-3xl font-bold mb-2">Шаблоны</h1>
			<p className="text-default-500 mb-5">
				Подменю шаблонов системы. Выберите нужный раздел.
			</p>
			<div className="grid grid-cols-12 gap-3">
				<Card className="col-span-12 md:col-span-6 h-[220px] bg-gradient-to-tr from-purple-600 to-blue-600">
					<CardHeader className="absolute z-10 top-1 flex-col items-start">
						<h4 className="text-white font-medium text-2xl">Шаблоны бейджей</h4>
						<p className="text-white/80 text-sm">Настройка JSON-шаблонов для печати бейджей</p>
					</CardHeader>
					<CardFooter className="absolute bg-white/25 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-end">
						<Link href="/dashboard/admin/badges" className={buttonStyles({ color: "primary", variant: "shadow" })}>
							Открыть
						</Link>
					</CardFooter>
				</Card>
				<Card className="col-span-12 md:col-span-6 h-[220px] bg-gradient-to-tr from-green-600 to-blue-600">
					<CardHeader className="absolute z-10 top-1 flex-col items-start">
						<h4 className="text-white font-medium text-2xl">Email-шаблоны</h4>
						<p className="text-white/80 text-sm">Тема и HTML писем, которые отправляет система</p>
					</CardHeader>
					<CardFooter className="absolute bg-white/25 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-end">
						<Link href="/dashboard/admin/email-templates" className={buttonStyles({ color: "primary", variant: "shadow" })}>
							Открыть
						</Link>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
