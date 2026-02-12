'use client';
import React, { useState, useEffect, useContext } from "react";
import { Input, Link, Card, Button } from "@heroui/react";
import InputMask from 'react-input-mask';
import { axiosInstanceAuth } from "@/axiosConfig";
import SelectItemsTable from '@/components/tables/selectItemsTable';
import SimpleNavbar from '@/components/toolbars/simple';
import CompanyNavbar from '@/components/toolbars/company';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { handleDelete } from "@/components/utils/delete";
import { useRouter } from "@/shared/router";
import { AppContext } from "@/app/dashboard/context";

export default function AddCompany({ params }: any) {
    const { id } = params;
    const router = useRouter();
    const role = useContext(AppContext);
    const [company, setCompany] = useState<any>({
        name: "",
        inn: "",
        description: "",
        phone: "",
        email: "",
        cars_limit: "",
        members_limit: "",
        in_event_members_limit: "",
        default_route: "",
        accreditations: {},
        events: {},
        user: {},
        // gates: {}
    });
    const [accreditations, setAccreditations] = useState<any>([]);
    const [events, setEvents] = useState<any>([]);
    const [gates, setGates] = useState<any>([]);
    const [preparedAccreditations, setPreparedAccreditations] = useState<any>({});
    const [preparedEvents, setPreparedEvents] = useState<any>({});
    const [preparedGates, setPreparedGates] = useState<any>({});
    const [isFrozen, setIsFrozen] = useState<any>(false);


    useEffect(() => {
        axiosInstanceAuth.get('/api/accreditations')
            .then(response => {
                setAccreditations(response.data);
            });
        axiosInstanceAuth.get('/api/events')
            .then(response => {
                setEvents(response.data);
            });
        axiosInstanceAuth.get('/api/gates/additional')
            .then(response => {
                setGates(response.data);
            });
        axiosInstanceAuth.get(`/api/companies/${id}`)
            .then(response => {
                setCompany(response.data);
	                const accreditationsData: Record<string, number> = {};
	                const eventsData: Record<string, number> = {};
	                const gatesData: Record<string, number> = {}

                response.data.accreditation_limits.forEach((limit: any) => {
                    accreditationsData[limit.accreditation_id] = limit.limit;
                });

                response.data.event_limits.forEach((limit: any) => {
                    eventsData[limit.event_id] = limit.limit;
                });

                response.data.gate_limits.forEach((limit: any) => {
                    gatesData[limit.gate_id] = limit.limit;
                });


                setPreparedAccreditations(accreditationsData);
                setPreparedEvents(eventsData);
                setPreparedGates(gatesData)
            });
        axiosInstanceAuth.get('/api/users/frozen')
            .then(response => {
                setIsFrozen(response.data === true);
            })
            .catch(error => {
                console.error('Error checking frozen status:', error);
            });
    }, []);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        const newState = { ...company, [name]: value };
        if (name === 'cars_limit' || name === 'members_limit' || name === 'in_event_members_limit') {
            const numericValue = value.match(/^\d+$/) || value === "";
            if (numericValue) {
                newState[name] = Number(value);
            } else {
                // Optionally, you can reset the state to its previous value if the input is invalid
                newState[name] = company[name];
            }
        }
        setCompany(newState);
    };

    const handleAccreditationChange = (selected: any) => {
        console.log("will be changed", selected)
        setCompany((prevCompany: any) => ({
            ...prevCompany,
            accreditations: selected
        }))
        console.log("company", company)
    };

    const handleEventChange = (selected: any) => {
        console.log(selected)
        setCompany((prevCompany: any) => ({
            ...prevCompany,
            events: selected
        }))
    };

    const handleGateChange = (selected: any) => {
        console.log(selected)
        setCompany((prevCompany: any) => ({
            ...prevCompany,
            gates: selected
        }))
    };


    const handleFreezeToggle = async () => {
        try {
            await axiosInstanceAuth.get(`/api/companies/${id}/freeze`);
            setCompany((prevCompany: any) => ({
                ...prevCompany,
                user: { ...prevCompany.user, frozen: !prevCompany.user.frozen }
            }));
            toast.success(company.user.frozen ? "Компания разморожена" : "Компания заморожена");
        } catch (error: any) {
            console.error('Error toggling freeze status:', error);
            toast.error("Ошибка при изменении статуса заморозки");
        }
    };


    const handleUpdateCompany = () => {
        const newCompany = {
            ...company,
            cars_limit: parseInt(company.cars_limit, 10),
            members_limit: parseInt(company.members_limit, 10),
        };

        axiosInstanceAuth.put(`/api/companies/${id}`, newCompany)
            .then(response => {
                // Handle success
                console.log(response);
                toast.success("Успешное сохранение");
            })
            .catch(error => {
                // Handle error
                console.log(error);
                toast.error("Ошибка при сохранении: " + error.response.data);
            });
    };



    const validateEmail = (value: any) => value.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

    const isInvalid = React.useMemo(() => {
        if (company.email === "") return false;

        return validateEmail(company.email) ? false : true;
    }, [company.email]);

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar title="Редактирование компании" deleteHandler={() => handleDelete({ path: 'companies', id: id, router: router })} saveHandler={handleUpdateCompany} />
            <CompanyNavbar company={company} />
            {isFrozen && (
                <div className="fixed bottom-0 right-0 m-4 p-4 bg-blue-500 text-white rounded-lg shadow-lg z-50">
                    Ваш аккаунт заморожен (только чтение)
                </div>
            )}
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                {role === "admin" && (
                    <>
                        <Link
                            isExternal
                            href={`/dashboard/admin/users/${company.editor_id}`}
                        >
                            Перейти к редактору
                        </Link>
                    </>
                )}
                <Card
                    className={`m-4 p-4 ${company.user.frozen ? 'bg-blue-100' : 'bg-green-100'}`}
                >
                    <div className="flex justify-between items-center">
                        <span className="text-black">{company.user.frozen ? "Компания заморожена" : "Компания активна"}</span>
                        <Button onClick={handleFreezeToggle} color={company.user.frozen ? 'primary' : 'danger'} variant="flat">{company.user.frozen ? 'Разморозить' : 'Заморозить'}</Button>
                    </div>
                </Card>
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Название"
                    isRequired
                    name="name"
                    value={company.name}
                    onChange={handleInputChange}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="ИНН"
                    isRequired
                    name="inn"
                    value={company.inn}
                    onChange={handleInputChange}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Описание"
                    name="description"
                    value={company.description}
                    onChange={handleInputChange}
                />
                <div className="flex flex-wrap mx-auto gap-2 w-full">
                    <div className="flex flex-1">
                        <Input
                            clearable
                            bordered
                            fullWidth
                            isRequired
                            // className="max-w-xs"
                            label="Телефон"
                            name="phone"
                            value={company.phone}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="flex flex-1">
                        <Input
                            clearable
                            bordered
                            // fullWidth
                            // className="max-w-xs"
                            label="Email"
                            isRequired
                            type="email"
                            name="email"
                            value={company.email}
                            onChange={handleInputChange}
                            isInvalid={isInvalid}
                            color={isInvalid ? "danger" : undefined}
                            errorMessage={isInvalid && "Введите действительный email"}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap mx-auto gap-2 w-full">
                    <div className="flex flex-1  gap-2">
                        <Input
                            labelPlacement="outside"
                            clearable
                            bordered
                            // fullWidth
                            size="lg"
                            description="Максимальное число участников в системе"
                            label="Лимит участников"
                            name="members_limit"
                            value={company.members_limit}
                            onChange={handleInputChange}
                        />
                        <Input
                            labelPlacement="outside"
                            clearable
                            bordered
                            // fullWidth
                            size="lg"
                            description="Единовременное кол-во участников на мероприятии"
                            label="Лимит пропуска"
                            name="in_event_members_limit"
                            value={company.in_event_members_limit}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap mx-auto gap-2 w-full">
                    <div className="flex flex-1  gap-2">
                        <Input
                            labelPlacement="outside"
                            clearable
                            bordered
                            // fullWidth
                            size="lg"
                            label="Лимит автомобилей"
                            name="cars_limit"
                            value={company.cars_limit}
                            onChange={handleInputChange}
                        />
                        <Input
                            labelPlacement="outside"
                            clearable
                            bordered
                            // fullWidth
                            size="lg"
                            label="Маршрут по-умолчанию"
                            name="default_route"
                            value={company.default_route}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <span>Аккредитации</span>
                <SelectItemsTable items={accreditations} onInputChange={handleAccreditationChange} initialValues={preparedAccreditations} />
                <span>Мероприятия</span>
                <SelectItemsTable items={events} onInputChange={handleEventChange} initialValues={preparedEvents} />
                <span>Доп. зоны доступа</span>
                <SelectItemsTable items={gates} onInputChange={handleGateChange} initialValues={preparedGates} />
            </div>
        </>
    );
};
