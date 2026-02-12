'use client';
import React, { useState, useEffect } from "react";
import { Input, Select, SelectItem } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { handleDelete } from "@/components/utils/delete";
import { useRouter } from "@/shared/router";

const carTypes = [
    { key: 'truck', name: 'Грузовой' },
    { key: '', name: 'Легковой' } // "" is the UI and backend key for "Легковой"
];

const AddCar = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [car, setCar] = useState<any>({
        number: "",
        description: "",
        type: "",
        route: ""
    });
    const [isFrozen, setIsFrozen] = useState<any>(false);

    useEffect(() => {
        if (id) {
            axiosInstanceAuth.get(`/api/autos/${id}`)
                .then(response => {
                    setCar(response.data);
                })
                .catch(error => {
                    console.error('Error fetching car data:', error);
                    toast.error('Ошибка при загрузке данных автомобиля');
                });
        }

        axiosInstanceAuth.get('/api/users/frozen')
            .then(response => {
                setIsFrozen(response.data === true);
            })
            .catch(error => {
                console.error('Error checking frozen status:', error);
            });
    }, [id]);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setCar((prevCar: any) => ({ ...prevCar, [name]: value }));
    };

    const handleAddCar = () => {
        axiosInstanceAuth.put(`/api/autos/${id}`, car)
            .then(response => {
                console.log(response);
                toast.success('Успешно сохранено');
            })
            .catch(error => {
                console.log(error);
                const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Неизвестная ошибка';
                toast.error('Ошибка при сохранении: ' + errorMessage);
            });
    };

    const handleSelectChange = (selected: any) => {
        setCar((prevCar: any) => ({
            ...prevCar,
            type: selected.target.value,
        }));
    };

    const getSelectedCarTypeKeyForUI = () => {
        if (car.type === "car" || car.type === "") {
            return "";
        }
        return car.type;
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar
                title="Редактирование автомобиля"
                deleteHandler={() => handleDelete({ path: 'autos', id: id, router: router })}
                saveHandler={handleAddCar}
                isSaveDisabled={isFrozen}
            />
            {isFrozen && (
                <div className="fixed bottom-0 right-0 m-4 p-4 bg-blue-500 text-white rounded-lg shadow-lg z-50">
                    Ваш аккаунт заморожен (только чтение)
                </div>
            )}
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Номер"
                    isRequired
                    name="number"
                    value={car.number || ""}
                    onChange={handleInputChange}
                    isDisabled={isFrozen}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Описание"
                    name="description"
                    value={car.description || ""}
                    onChange={handleInputChange}
                    isDisabled={isFrozen}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Маршрут"
                    name="route"
                    value={car.route || ""}
                    isDisabled
                />
                <Select
                    isRequired
                    label="Тип"
                    placeholder="Выберите тип автомобиля"
                    selectedKeys={[getSelectedCarTypeKeyForUI()]}
                    fullWidth
                    size="lg"
                    name="type"
                    onChange={handleSelectChange}
                    isDisabled={isFrozen}
                >
                    {carTypes.map((carType) => (
                        <SelectItem key={carType.key}>
                            {carType.name}
                        </SelectItem>
                    ))}
                </Select>
            </div>
        </>
    );
};

export default AddCar;