'use client';
import React, { useState, useEffect, useContext } from "react";
import { Input, Link } from "@heroui/react";
import InputMask from 'react-input-mask';
import { axiosInstanceAuth } from "@/axiosConfig";
import SelectItemsTable from '@/components/tables/selectItemsTable';
import SimpleNavbar from '@/components/toolbars/simple';
import CompanyNavbar from '@/components/toolbars/companyOperator';
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
        description: "",
        phone: "",
        email: "",
        cars_limit: "",
        members_limit: "",
        default_route: "",
        accreditations: {},
        events: {},
        // gates: {}
    });
    const [accreditations, setAccreditations] = useState<any>([]);
    const [events, setEvents] = useState<any>([]);
    const [gates, setGates] = useState<any>([]);
    const [preparedAccreditations, setPreparedAccreditations] = useState<any>({});
    const [preparedEvents, setPreparedEvents] = useState<any>({});
    const [preparedGates, setPreparedGates] = useState<any>({});


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
    }, []);

    const handleInputChange = (e: any) => {
        setCompany({
            ...company,
            [e.target.name]: e.target.value,
        });
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
                toast.error("Ошибка при сохранении");
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
            <SimpleNavbar title="Карточка компании" />
            <CompanyNavbar company={company} />
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    isReadOnly
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
                    isReadOnly
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
                        <InputMask
                            mask="+7 (999) 999-99-99"
                            value={company.phone}
                            onChange={handleInputChange}
                        >
                            {() => (
                                <Input
                                    isReadOnly
                                    clearable
                                    bordered
                                    fullWidth
                                    isRequired
                                    // className="max-w-xs"
                                    label="Телефон"
                                    name="phone"
                                    onChange={handleInputChange}
                                />
                            )}
                        </InputMask>
                    </div>
                    <div className="flex flex-1">
                        <Input
                            isReadOnly
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
                    <div className="flex flex-1">
                        <InputMask
                            // formatChar={'9': '[0-9]'}
                            mask="999999"
                            maskChar=""
                            value={company.members_limit}
                            onChange={handleInputChange}
                        >
                            {() => (
                                <Input
                                    isReadOnly
                                    labelPlacement="outside"
                                    clearable
                                    bordered
                                    // fullWidth
                                    size="lg"
                                    // placeholder="Лимит участников"
                                    label="Лимит участников"
                                    name="members_limit"
                                    endContent={
                                        <input
                                            type="text"
                                            value={company.members_limit}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', border: 'none', outline: 'none' }}
                                        />
                                    }
                                />
                            )}
                        </InputMask>
                    </div>
                    <div className="flex flex-1">
                        <InputMask
                            // formatChar={'9': '[0-9]'}
                            mask="999999"
                            maskChar=""
                            value={company.cars_limit}
                            onChange={handleInputChange}
                        >
                            {() => (
                                <Input
                                    isReadOnly
                                    labelPlacement="outside"
                                    clearable
                                    bordered
                                    // fullWidth
                                    size="lg"
                                    // placeholder="Лимит автомобилей"
                                    label="Лимит автомобилей"
                                    name="cars_limit"
                                    endContent={
                                        <input
                                            type="text"
                                            value={company.cars_limit}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', border: 'none', outline: 'none' }}
                                        />
                                    }
                                />
                            )}
                        </InputMask>
                    </div>
                    <Input
                        isReadOnly
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
                <span>Аккредитации</span>
                <SelectItemsTable isReadOnly={true} items={accreditations} onInputChange={handleAccreditationChange} initialValues={preparedAccreditations} />
                <span>Мероприятия</span>
                <SelectItemsTable isReadOnly={true} items={events} onInputChange={handleEventChange} initialValues={preparedEvents} />
                <span>Доп. зоны доступа</span>
                <SelectItemsTable isReadOnly={true} items={gates} onInputChange={handleGateChange} initialValues={preparedGates} />
            </div>
        </>
    );
};
