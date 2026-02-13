'use client';
import React, { useState, useEffect, useMemo } from "react";
import { Input, Switch, Checkbox, Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from '@/shared/router';


const Member = ({ params }: any) => {
    const { id } = params;
    const url = `/api/members/${id}`;
    const urlBangle = `/api/members/${id}/block`;
    const router = useRouter();

    const [imagePreview, setImagePreview] = useState<any>(null);
    const [member, setMember] = useState<any>(null); // Initialize as null to show loading state



    const handleBlock = () => {
        axiosInstanceAuth.post(urlBangle)
            .then(response => {
                setMember((prevState: any) => ({
                    ...prevState,
                    blocked: !prevState.blocked
                }));
                toast.success("Участник изменён");
            })
            .catch(error => {
                toast.error("Ошибка блокировки участника");
            });
    };

    // Effect to fetch the main member data
    useEffect(() => {
        if (!id) return;

        axiosInstanceAuth.get(url)
            .then(response => {
                const dateObject = new Date(response.data.birth);
                setMember({
                    ...response.data,
                    birth: `${dateObject.getUTCDate().toString().padStart(2, '0')}.${(dateObject.getUTCMonth() + 1).toString().padStart(2, '0')}.${dateObject.getUTCFullYear()}`,
                });
            }).catch(err => {
                console.error("Error fetching member:", err);
                toast.error("Не удалось загрузить данные участника.");
            });

        axiosInstanceAuth.get(`/api/members/${id}/photo`, { responseType: 'blob' })
            .then((photoResponse) => {
                const imageUrl = URL.createObjectURL(photoResponse.data);
                setImagePreview(imageUrl);
            })
            .catch((error) => {
                if (error.response?.status !== 404) {
                    console.error('Error fetching image:', error);
                }
            });
    }, [id, url]);


    if (!member) {
        return <div className="flex justify-center items-center h-screen"><Spinner label="Загрузка участника..." /></div>;
    }

    return (
        <>
            <ToastContainer theme="dark" position="bottom-right" />
            <Navbar position="static">
                <NavbarBrand>
                    <Button onClick={() => router.back()} variant="flat">Назад</Button>
                </NavbarBrand>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button
                            color={member.blocked ? "danger" : `warning`}
                            variant="flat"
                            onClick={handleBlock}
                        >
                            {member.blocked ? "Заблокирован" : `Заблокировать`}
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                {imagePreview && (
                    <div className="flex justify-center mb-4">
                        <img src={imagePreview} alt="Фото участника" className="max-w-full h-auto rounded-lg shadow-md" style={{ maxHeight: '400px', width: 'auto' }} />
                    </div>
                )}
                <div className="flex flex-row w-full gap-3">
                    <Input isReadOnly size="lg" label="Фамилия" value={member.surname} />
                    <Input isReadOnly size="lg" label="Имя" value={member.name} />
                    <Input isReadOnly size="lg" label="Отчество" value={member.middlename} />
                </div>
                <Input label="Компания" value={member.company_name} isReadOnly fullWidth size="lg" />
                <div className="flex flex-row w-full gap-3 items-center">
                    <Input isReadOnly fullWidth size="lg" label="Серия и номер паспорта" value={member.document} />
                    <Input isReadOnly fullWidth size="lg" value={member.birth} label="Дата рождения" name="birth" />
                    <Switch isSelected={member.responsible} isReadOnly>Ответственный</Switch>
                </div>
                {member.accreditation && <Input label="Аккредитация участника" value={member.accreditation.name || ''} isReadOnly fullWidth size="lg" />}

                {member.events?.length > 0 && (
                    <>
                        Мероприятия:
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {member.events.map((event: any) => (
                                <Checkbox key={event.id} isReadOnly isSelected defaultSelected>{event.name}</Checkbox>
                            ))}
                        </div>
                    </>
                )}

                {member.accreditation?.gates?.length > 0 && (
                    <>
                        Доступные зоны (по аккредитации):
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {member.accreditation.gates.map((gate: any) => (
                                <Checkbox key={gate.id} isReadOnly isSelected defaultSelected>{gate.name}</Checkbox>
                            ))}
                        </div>
                    </>
                )}
                {member.gates?.length > 0 && (
                    <>
                        Дополнительные зоны:
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {member.gates.map((gate: any) => (
                                <Checkbox key={gate.id} isReadOnly isSelected defaultSelected>{gate.name}</Checkbox>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default Member;
