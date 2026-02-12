'use client';
import React from "react";
import { Card, CardFooter, Image, Button, CardHeader } from "@heroui/react";
import { title, subtitle } from "@/components/primitives";
import { button as buttonStyles } from "@heroui/theme";
import { Link } from "@heroui/link";

export default function PricingPage() {
	return (
		<div>
			<div>
				<div className="gap-2 grid grid-cols-12 grid-rows-2 px-8">
					<Card className="col-span-12 sm:col-span-4 h-[200px]  bg-gradient-to-tr from-blue-600 to-purple-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Мероприятия</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Link href="/dashboard/admin/events" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Редактировать мероприятия
							</Link>
						</CardFooter>
					</Card>

					<Card className="col-span-12 sm:col-span-4 h-[200px]  bg-gradient-to-tr from-purple-600 to-green-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Аккредитации</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Link href="/dashboard/admin/accreditations" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Редактировать аккредитации
							</Link>
						</CardFooter>
					</Card>
					<Card className="col-span-12 sm:col-span-4 h-[200px]  bg-gradient-to-tr from-green-600 to-blue-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Зоны мероприятий</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
								{/* <p className="text-grey-900 text-tiny">Зоны доступа, отсечки</p> */}
							</div>
							<Link href="/dashboard/admin/gates" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Редактировать зоны
							</Link>
						</CardFooter>
					</Card>
					<Card isFooterBlurred className="w-full h-[200px] col-span-12 sm:col-span-4 bg-gradient-to-tr from-green-600 to-purple-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Пользователи</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Link href="/dashboard/admin/users" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Редактировать пользователей
							</Link>
						</CardFooter>
					</Card>
					{/* <Card isFooterBlurred className="w-full h-[200px] col-span-12 sm:col-span-7 bg-gradient-to-tr from-purple-600 to-green-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Настройки системы</h4>
						</CardHeader>
					<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
						<div>
						</div>
						<Button className="text-tiny" color="primary" radius="full" size="sm" onClick={() => { alert('Данное действие производится через командную консоль') }}>
							Перейти к настройкам
						</Button>
					</CardFooter>
				</Card> */}
					{/* <Card className="col-span-12 sm:col-span-4 h-[200px] bg-gradient-to-tr from-purple-600 to-green-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Шаблоны</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Button className="text-tiny" color="primary" radius="full" size="sm" onClick={() => { alert('Данное действие производится через командную консоль') }}>
								Редактировать шаблоны
							</Button>
						</CardFooter>
					</Card> */}
					<Card className="col-span-12 sm:col-span-4 h-[200px] bg-gradient-to-tr from-blue-600 to-purple-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Отчёты</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Link href="/dashboard/admin/reports" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Перейти к отчётам
							</Link>
						</CardFooter>
					</Card>
					<Card className="col-span-12 sm:col-span-4 h-[200px] bg-gradient-to-tr from-purple-600 to-green-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">SMART-менеджмент участников</h4>
						</CardHeader>

						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Link href="/dashboard/admin/kick" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Открыть матрицу доступа
							</Link>
						</CardFooter>
					</Card>
					<Card className="col-span-12 sm:col-span-4 h-[200px]  bg-gradient-to-tr from-purple-600 to-blue-600">
						<CardHeader className="absolute z-10 top-1 flex-col items-start">
							<h4 className="text-white font-medium text-2xl">Шаблоны бейджей</h4>
						</CardHeader>
						<CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
							<div>
							</div>
							<Link href="/dashboard/admin/badges" className={buttonStyles({ color: "primary", variant: "shadow" })}>
								Редактировать шаблоны
							</Link>
						</CardFooter>
					</Card>
				</div>
			</div>
		</div >
	);
}
