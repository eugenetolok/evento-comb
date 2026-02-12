'use client';
import React, { useState, useEffect } from "react";
import { Card, Input, Switch, cn, Checkbox } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from "@/shared/router";
import { handleDelete } from "@/components/utils/delete";

const AddGate = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [gate, setGate] = useState<any>({
        name: "",
        short_name: "",
        description: "",
        position: "",
        area: null,
        external: false,
        additional: false,
        require_photo: false,
    });

    useEffect(() => {
        axiosInstanceAuth.get(`/api/gates/${id}`)
            .then(response => {
                setGate(response.data);
            });
    }, []);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        const newState = { ...gate, [name]: value };

        if (name === 'position') {
            const numericValue = value.match(/^\d+$/) || value === "";
            if (numericValue) {
                newState[name] = Number(value);
            } else {
                newState[name] = gate[name];
            }
        }

        if (name == "external") {
            newState[name] = value === 'true';
        }

        setGate(newState);
    };

    const handleAddGate = () => {
        axiosInstanceAuth.put(`/api/gates/${id}`, gate)
            .then(response => {
                console.log(response);
                toast.success('Успешно сохранено');
                // onAddGate(gate);
            })
            .catch(error => {
                toast.error('Ошибка при сохранении');
                console.log(error);
            });
    };

    const handleAreaChange = (newArea: any) => {
        setGate((prevGate: any) => ({ ...prevGate, area: newArea }));
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar title="Редактирование зоны доступа" deleteHandler={() => handleDelete({ path: 'gates', id: id, router: router })} saveHandler={handleAddGate} />
            <div className="flex flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Название"
                    isRequired
                    name="name"
                    value={gate.name}
                    onChange={handleInputChange}
                    className="mb-4"
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Короткое название на бейдже"
                    isRequired
                    name="short_name"
                    value={gate.short_name}
                    onChange={handleInputChange}
                    className="mb-4"
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Описание"
                    name="description"
                    value={gate.description}
                    onChange={handleInputChange}
                    className="mb-4"
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    labelPlacement="outside"
                    label="Позиция"
                    name="position"
                    value={gate.position}
                    onChange={handleInputChange}
                    className="mb-4"
                />
                {/* <div className="flex flex-wrap mx-auto gap-2 mb-4">
                    <Switch
                        name="external"
                        value={gate.external}
                        onChange={handleInputChange}
                        classNames={{
                            base: cn(
                                "inline-flex flex-row-reverse w-full max-w-md bg-content1 hover:bg-content2 items-center",
                                "justify-between cursor-pointer rounded-lg gap-2 p-4 border-2 border-transparent",
                                "data-[selected=true]:border-primary",
                            ),
                            wrapper: "p-0 h-4 overflow-visible",
                            thumb: cn("w-6 h-6 border-2 shadow-lg",
                                "group-data-[hover=true]:border-primary",
                                //selected
                                "group-data-[selected=true]:ml-6",
                                // pressed
                                "group-data-[pressed=true]:w-7",
                                "group-data-[selected]:group-data-[pressed]:ml-4",
                            ),
                        }}
                    >
                        <div className="flex flex-col gap-1">
                            <p className="text-medium">Внешняя отсечка</p>
                            <p className="text-tiny text-default-400">
                                На данной зоне доступа вход на мероприятие осуществляется извне (из города)
                            </p>
                        </div>
                    </Switch>
                    <Switch
                        name="vk_approve"
                        value={gate.vk_approve}
                        onChange={handleInputChange}
                        classNames={{
                            base: cn(
                                "inline-flex flex-row-reverse w-full max-w-md bg-content1 hover:bg-content2 items-center",
                                "justify-between cursor-pointer rounded-lg gap-2 p-4 border-2 border-transparent",
                                "data-[selected=true]:border-primary",
                            ),
                            wrapper: "p-0 h-4 overflow-visible",
                            thumb: cn("w-6 h-6 border-2 shadow-lg",
                                "group-data-[hover=true]:border-primary",
                                //selected
                                "group-data-[selected=true]:ml-6",
                                // pressed
                                "group-data-[pressed=true]:w-7",
                                "group-data-[selected]:group-data-[pressed]:ml-4",
                            ),
                        }}
                    >
                        <div className="flex flex-col gap-1">
                            <p className="text-medium">Дополнительное подтверждение от VK</p>
                            <p className="text-tiny text-default-400">
                                Для данной зоны необходимо дополнительное подтверждение от отвественного сотрудника (например LOUNGE)
                            </p>
                        </div>
                    </Switch>
                </div> */}

                <div className="flex gap-4">
                    <Checkbox
                        name="external"
                        isSelected={gate.external}
                        onValueChange={(value) => {
                            setGate({ ...gate, external: value })
                        }}>
                        Внешний вход
                    </Checkbox>
                    <Checkbox
                        name="additional"
                        isSelected={gate.additional}
                        onValueChange={(value) => {
                            setGate({ ...gate, additional: value })
                        }}>
                        Доп. зона
                    </Checkbox>
                    <Checkbox
                        name="require_photo"
                        isSelected={gate.require_photo}
                        onValueChange={(value) => {
                            setGate({ ...gate, require_photo: value })
                        }}>
                        Обязательное фото
                    </Checkbox>
                </div>

                {/* <DrawArea area={gate.area} onAreaChange={handleAreaChange} className="mb-4" /> */}
            </div>
        </>
    );
};

export default AddGate;