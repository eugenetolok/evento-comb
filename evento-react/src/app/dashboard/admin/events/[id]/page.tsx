'use client';
import React, { useState, useEffect } from "react";
import { Input } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { useRouter } from '@/shared/router';
import { handleDelete } from "@/components/utils/delete";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddEvent = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [event, setEvent] = useState<any>({
        name: "",
        description: "",
        position: ""
    });

    useEffect(() => {
        axiosInstanceAuth.get(`/api/events/${id}`)
            .then(response => {
                setEvent(response.data);
            });
    }, []);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        const newState = { ...event, [name]: value };

        if (name === 'position') {
            const numericValue = value.match(/^\d+$/) || value === "";
            if (numericValue) {
                newState[name] = Number(value);
            } else {
                // Optionally, you can reset the state to its previous value if the input is invalid
                newState[name] = event[name];
            }
        }

        setEvent(newState);
    };

    const handleAddEvent = () => {
        axiosInstanceAuth.put(`/api/events/${id}`, event)
            .then(response => {
                // Handle success
                console.log(response);
                // onAddEvent(event);
                toast.success('Успешно сохранено');
            })
            .catch(error => {
                // Handle error
                console.log(error);
                toast.error('Ошибка при сохранении');
            });
    };


    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar title="Редактирование мероприятия" deleteHandler={() => handleDelete({ path: 'events', id: id, router: router })} saveHandler={handleAddEvent} />
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Название"
                    isRequired
                    name="name"
                    value={event.name}
                    onChange={handleInputChange}
                />
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Описание"
                    name="description"
                    value={event.description}
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
                    value={event.position}
                    onChange={handleInputChange}
                />
            </div>
        </>
    );
};

export default AddEvent;
