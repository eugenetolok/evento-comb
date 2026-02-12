'use client';
import React, { useState, useEffect } from "react";
import { Input } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from "@/shared/router";
import { Navbar, NavbarContent, NavbarItem, NavbarBrand, Button } from "@heroui/react";


const Car = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [car, setCar] = useState<any>({
        number: "",
        description: "",
        type: "",
        company: "",
        companyRoute: "1",
        pass: false,
        pass2: false
    });

    useEffect(() => {
        axiosInstanceAuth.get(`/api/autos/${id}`)
            .then(response => {
                setCar(response.data);
            });
    }, [id]);

    const handleGivePass = () => {
        axiosInstanceAuth.get(`/api/autos/givePass/${car.id}`)
            .then(response => {
                setCar((prevState: any) => ({
                    ...prevState,
                    pass: !prevState.pass
                }));
                toast.success("Пропуск выдан");
            })
            .catch(error => {
                toast.error("Ошибка выдачи пропуска");
            });
    };

    const handleGivePass2 = () => {
        axiosInstanceAuth.get(`/api/autos/givePass2/${car.id}`)
            .then(response => {
                setCar((prevState: any) => ({
                    ...prevState,
                    pass2: !prevState.pass2
                }));
                toast.success("Пропуск выдан");
            })
            .catch(error => {
                toast.error("Ошибка выдачи пропуска");
            });
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <Navbar position="static">
                <NavbarBrand>
                    <Button onClick={() => { router.back() }} variant="flat">
                        Назад
                    </Button>
                </NavbarBrand>
                <NavbarContent className="hidden sm:flex gap-4" justify="center">
                    <NavbarItem>
                        Автомобиль
                    </NavbarItem>
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button
                            color="primary"
                            variant="flat"
                            onClick={handleGivePass}
                            disabled={car.pass}
                        >
                            {car.pass ? 'Пропуск выдан' : 'Выдать пропуск'} (монтаж)
                        </Button>
                        <Button
                            color="warning"
                            variant="flat"
                            onClick={handleGivePass2}
                            disabled={car.pass2}
                        >
                            {car.pass2 ? 'Пропуск выдан' : 'Выдать пропуск'} (демонтаж)
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    clearable
                    bordered
                    fullWidth
                    isReadOnly
                    size="lg"
                    label="Номер"
                    isRequired
                    name="number"
                    value={car.number}
                />
                <Input
                    clearable
                    bordered
                    isReadOnly
                    fullWidth
                    size="lg"
                    label="Описание"
                    name="description"
                    value={car.description}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Маршрут"
                    name="route"
                    value={car.route}
                    isDisabled
                />
                <Input
                    clearable
                    bordered
                    isReadOnly
                    fullWidth
                    size="lg"
                    label="Тип автомобиля"
                    name="type"
                    value={car.type === 'truck' ? 'Грузовой' : 'Легковой'}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Компания"
                    name="company"
                    value={car.company}
                    isDisabled
                />
            </div>
        </>
    );
};

export default Car;
