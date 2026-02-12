import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Select, SelectItem, Card, useDisclosure } from "@heroui/react";
import InputMask from 'react-input-mask';
import { axiosInstanceAuth } from "@/axiosConfig";
import SelectItemsTable from '@/components/tables/selectItemsTable';
import { PlusIcon } from "@/components/icons";
import './scroll.css'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddCompanyModal = ({ action }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [company, setCompany] = useState<any>({
        name: "",
        inn: "",
        description: "",
        phone: "",
        email: "",
        cars_limit: "",
        members_limit: "",
        default_route: "",
        accreditations: {},
        events: {},
        gates: {}
    });
    const [accreditations, setAccreditations] = useState<any>([]);
    const [events, setEvents] = useState<any>([]);
    const [gates, setGates] = useState<any>([]);

    const handleSelectChange = (selected: any) => {
        setCompany({
            ...company,
            default_route: selected.target.value,
        });
    };


    useEffect(() => {
        if (isOpen) {
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
        }
    }, [isOpen]);

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
        // const newState = { ...company, [accreditations]: selected };
        setCompany((prevCompany: any) => ({
            ...prevCompany,
            accreditations: selected
        }))
    };

    const handleEventChange = (selected: any) => {
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

    const handleAddCompany = () => {
        const newCompany = { ...company, cars_limit: parseInt(company.cars_limit, 10) };
        axiosInstanceAuth.post('/api/companies', newCompany)
            .then(response => {
                // Handle success
                console.log(response);
                // onAddCompany(company);
                setCompany({
                    name: "",
                    inn: "",
                    description: "",
                    phone: "",
                    email: "",
                    cars_limit: "",
                    default_route: "1",
                    accreditations: {},
                    events: {},
                });
                onClose(); // Assuming you have onClose function to close the modal
                toast.success("Успешное создание");
                setTimeout(() => {
                    action();
                }, 1000);
            })
            .catch(error => {
                // Handle error
                toast.error(`Ошибка при создании. ${error.response.data}`);
                console.log(error);
            });
    };


    const validateEmail = (value: any) => value.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

    const isInvalid = React.useMemo(() => {
        if (company.email === "") return false;

        return validateEmail(company.email) ? false : true;
    }, [company.email]);

    return (
        <>
            <Button auto color="primary" onPress={onOpen} endContent={<PlusIcon />}>
                Добавить
            </Button>
            <Modal
                Modal backdrop="blur" size="5xl" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Добавить новую компанию</div>
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2 scroll-animation">
                            {/* {JSON.stringify(company)} */}
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
                            <div className="flex flex-wrap mx-auto w-full">
                                <div className="flex flex-1 gap-2">
                                    <InputMask
                                        mask="+7 (999) 999-99-99"
                                        value={company.phone}
                                        onChange={handleInputChange}
                                    >
                                        {() => (
                                            <Input

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
                            <div className="flex flex-wrap mx-auto w-full">
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
                            <div className="flex flex-wrap mx-auto w-full">
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

                            <span>Аккредитации</span>
                            <SelectItemsTable items={accreditations} onInputChange={handleAccreditationChange} />
                            <span>Мероприятия</span>
                            <SelectItemsTable items={events} onInputChange={handleEventChange} />
                            <span>Доп. зоны доступа</span>
                            <SelectItemsTable items={gates} onInputChange={handleGateChange} />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={handleAddCompany}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >
            <ToastContainer theme="dark" />
        </>
    );
};

export default AddCompanyModal;
