'use client';
import React from "react";
import { Card, CardFooter, Button, CardHeader } from "@heroui/react";
import { button as buttonStyles } from "@heroui/theme";
import { axiosInstanceAuth } from "@/axiosConfig";

export default function PricingPage() {
    const handleDownloadReport = async (reportName: any) => {
        try {
            const response = await axiosInstanceAuth({
                url: `/api/reports/${reportName}`,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${reportName}.xlsx`); // set the file name
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error: any) {
            console.error('Error downloading the file:', error);
        }
    }
    return (
        <div>
            <div>
                <div className="gap-2 grid grid-cols-12 grid-rows-2 px-8">
                    <Card className="col-span-12 sm:col-span-3 h-[200px]  bg-gradient-to-tr from-red-600 to-yellow-600">
                        <CardHeader className="absolute z-10 top-1 flex-col items-start">
                            <h4 className="text-white font-medium text-2xl">Все компании</h4>
                        </CardHeader>
                        <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
                            <div>
                            </div>
                            <Button onClick={() => { handleDownloadReport('companies') }} className={buttonStyles({ color: "warning", variant: "shadow" })}>
                                Скачать отчёт
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="col-span-12 sm:col-span-3 h-[200px]  bg-gradient-to-tr from-yellow-600 to-red-600">
                        <CardHeader className="absolute z-10 top-1 flex-col items-start">
                            <h4 className="text-white font-medium text-2xl">Все участники</h4>
                        </CardHeader>
                        <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
                            <div>
                            </div>
                            <Button onClick={() => { handleDownloadReport('members') }} className={buttonStyles({ color: "warning", variant: "shadow" })}>
                                Скачать отчёт
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="col-span-12 sm:col-span-3 h-[200px]  bg-gradient-to-tr from-red-600 to-yellow-600">
                        <CardHeader className="absolute z-10 top-1 flex-col items-start">
                            <h4 className="text-white font-medium text-2xl">Все автомобили</h4>
                        </CardHeader>
                        <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
                            <div>
                                {/* <p className="text-grey-900 text-tiny">Зоны доступа, отсечки</p> */}
                            </div>
                            <Button onClick={() => { handleDownloadReport('autos') }} className={buttonStyles({ color: "warning", variant: "shadow" })}>
                                Скачать отчёт
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="col-span-12 sm:col-span-3 h-[200px]  bg-gradient-to-tr from-red-600 to-yellow-600">
                        <CardHeader className="absolute z-10 top-1 flex-col items-start">
                            <h4 className="text-white font-medium text-2xl">Все пользователи</h4>
                        </CardHeader>
                        <CardFooter className="absolute bg-white/30 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
                            <div>
                                {/* <p className="text-grey-900 text-tiny">Зоны доступа, отсечки</p> */}
                            </div>
                            <Button onClick={() => { handleDownloadReport('users') }} className={buttonStyles({ color: "warning", variant: "shadow" })}>
                                Скачать отчёт
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div >
    );
}
