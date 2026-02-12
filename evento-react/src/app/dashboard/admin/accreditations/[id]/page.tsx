'use client';
import React, { useState, useEffect } from "react";
import { Input, Checkbox } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from '@/shared/router';
import { handleDelete } from "@/components/utils/delete";

const AddAccreditation = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [accreditation, setAccreditation] = useState<any>({
        name: "",
        short_name: "",
        description: "",
        position: "",
        hidden: false,
        require_photo: false,
        gates: []
    });
    const [gates, setGates] = useState<any>([]);
    const [selectedGates, setSelectedGates] = useState<any>(accreditation.gates ? accreditation.gates.map((gate: any) => gate.id) : []);

    useEffect(() => {
        axiosInstanceAuth.get(`/api/accreditations/${id}`)
            .then(response => {
                setAccreditation(response.data);
                setSelectedGates(response.data.gates ? response.data.gates.map((gate: any) => gate.id) : []);
            });
        axiosInstanceAuth.get(`/api/gates`)
            .then(response => {
                setGates(response.data);
            });
    }, []);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        const newState = { ...accreditation, [name]: value };

        if (name === 'position') {
            const numericValue = value.match(/^\d+$/) || value === "";
            if (numericValue) {
                newState[name] = Number(value);
            } else {
                // Optionally, you can reset the state to its previous value if the input is invalid
                newState[name] = accreditation[name];
            }
        }

        if (name === 'hidden') {
            newState[name] = e.target.checked;
        }

        if (name === 'require_photo') {
            newState[name] = e.target.checked;
        }

        setAccreditation(newState);
    };

    const handleAddAccreditation = () => {
        const newState = { ...accreditation, gate_ids: selectedGates };
        console.log('hidden,', newState) // here hiden is ok, by in axios it does not work properly (always false)
        axiosInstanceAuth.put(`/api/accreditations/${id}`, newState)
            .then(response => {
                // Handle success
                console.log(response);
                toast.success('Успешно сохранено');
            })
            .catch(error => {
                // Handle error
                console.log(error);
                toast.error('Ошибка при сохранении');
            });
    };

    const handleDeleteAccreditation = () => {
        axiosInstanceAuth.delete(`/api/accreditations/${id}`)
            .then(response => {
                // Handle success
                console.log(response);
                toast.success('Успешно удалено');
                setTimeout(() => {
                    router.back();
                }, 1000)
            })
            .catch(error => {
                // Handle error
                console.log(error);
                toast.error('Ошибка при удалении');
            });
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar title="Редактирование аккредитации" deleteHandler={() => handleDelete({ path: 'accreditations', id: id, router: router })} saveHandler={handleAddAccreditation} />
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Название"
                    isRequired
                    name="name"
                    value={accreditation.name}
                    onChange={handleInputChange}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Короткое название (для бейджа)"
                    isRequired
                    name="short_name"
                    value={accreditation.short_name}
                    onChange={handleInputChange}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Описание"
                    name="description"
                    value={accreditation.description}
                    onChange={handleInputChange}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    labelPlacement="outside"
                    label="Позиция"
                    name="position"
                    value={accreditation.position}
                    onChange={handleInputChange}
                />
                <Checkbox
                    name="hidden"
                    isSelected={accreditation.hidden}
                    onChange={(e) => {
                        console.log('wtf happens')
                        handleInputChange(e)
                    }}
                >
                    Скрытая аккредитация
                </Checkbox>
                <Checkbox
                    name="require_photo"
                    isSelected={accreditation.require_photo}
                    onChange={(e) => {
                        console.log('wtf happens')
                        handleInputChange(e)
                    }}
                >
                    Обязательное фото
                </Checkbox>
                Зоны
                <div className="flex flex-wrap gap-4 max-w-full">
                    {gates.map((gate: any) => {

                        return (
                            <div key={gate.id} className="flex items-center">
                                <Checkbox
                                    key={gate.id}
                                    isSelected={selectedGates.includes(gate.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGates([...selectedGates, gate.id]);
                                        } else {
                                            setSelectedGates(selectedGates.filter((id: any) => id !== gate.id));
                                        }
                                    }}
                                >
                                    {gate.name}
                                </Checkbox>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    );
};

export default AddAccreditation;
