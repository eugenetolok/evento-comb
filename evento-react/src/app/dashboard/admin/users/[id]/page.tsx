'use client';
import React, { useState, useEffect } from "react";
import {
    Input, Select, SelectItem, Button, useDisclosure,
    Modal, ModalHeader, ModalBody, ModalContent, ModalFooter, Switch
} from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { handleDelete } from "@/components/utils/delete";
import { useRouter } from "@/shared/router";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { EyeSlashFilledIcon, EyeFilledIcon } from "@/components/icons";

const roles = [
    { label: "Админ", value: "admin" },
    { label: "Редактор компаний", value: "editor" },
    { label: "Представитель компании", value: "company" },
    { label: "Оператор на мероприятии", value: "operator" }
];

const User = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [user, setUser] = useState<any>({
        username: "",
        password: "",
        role: "",
        telegram_id: "",
        frozen: false,
        company_id: null,
    });

    const { isOpen: isResetOpen, onOpen: onResetOpen, onClose: onResetClose } = useDisclosure();

    const [newPassword, setNewPassword] = useState<any>('');
    const [repeatPassword, setRepeatPassword] = useState<any>('');
    const [sendToEmail, setSendToEmail] = useState<any>(false);
    const [resetEmail, setResetEmail] = useState<any>('');
    const [isPasswordVisible, setIsPasswordVisible] = React.useState<any>(false);
    const toggleVisibility = () => setIsPasswordVisible(!isPasswordVisible);

    useEffect(() => {
        (async () => {
            const res = await axiosInstanceAuth.get(`/api/users/${id}`);
            setUser(res.data);
        })();
    }, []);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setUser((prev: any) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e: any) => {
        setUser({
            ...user,
            role: e.target.value,
        });
    };

    const handleAddUser = () => {
        axiosInstanceAuth.put(`/api/users/${id}`, user)
            .then(() => toast.success('Успешно сохранено'))
            .catch(() => toast.error('Ошибка при сохранении'));
    };

    const handleFreezeSelection = () => {
        setUser((prev: any) => ({ ...prev, frozen: !prev.frozen }));
    };

    const handleResetPassword = async () => {
        if (newPassword !== repeatPassword) {
            toast.error("Пароли не совпадают");
            return;
        }

        try {
            const response = await axiosInstanceAuth.post(`/api/users/resetPassword/${user.id}`, {
                password: newPassword,
                recepient_email: sendToEmail ? resetEmail : "",
            });

            if (response.status === 200) {
                toast.success("Пароль успешно сброшен");
                onResetClose();
            } else {
                toast.error(`Ошибка: ${response.statusText}`);
            }
        } catch (error: any) {
            toast.error(`Ошибка: ${error.response?.data || error.message}`);
        }
    };

    const generateRandomPass = () => {
        var tempPass = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(2, length);
        setNewPassword(tempPass);
        setRepeatPassword(tempPass);
    }

    const handleGoToCompany = () => {
        if (user.company_id) {
            router.push(`/dashboard/companies/${user.company_id}`);
        } else {
            toast.warn('У пользователя не привязана компания.');
        }
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar
                title="Редактирование пользователя"
                deleteHandler={() => handleDelete({ path: 'users', id, router })}
                saveHandler={handleAddUser}
            />
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <Input
                    variant="bordered"
                    fullWidth
                    size="lg"
                    label="Логин"
                    isRequired
                    name="username"
                    value={user.username}
                    onChange={handleInputChange}
                />
                <Select
                    variant="bordered"
                    isRequired
                    label="Роль пользователя"
                    placeholder="Выберите роль пользователя"
                    selectedKeys={new Set([user.role])}
                    fullWidth
                    size="lg"
                    name="role"
                    onChange={handleSelectChange}
                >
                    {roles.map((role) => (
                        <SelectItem key={role.value}>
                            {role.label}
                        </SelectItem>
                    ))}
                </Select>
                <Switch isSelected={user.frozen} onValueChange={handleFreezeSelection}>
                    Заморожен
                </Switch>
                <Button onPress={onResetOpen} color="warning">
                    Изменить пароль
                </Button>
                {user.role === 'company' && (
                    <Button
                        onPress={handleGoToCompany}
                        color="secondary"
                        variant="flat"
                    >
                        Перейти к компании
                    </Button>
                )}

                <Modal isOpen={isResetOpen} onClose={onResetClose} size="sm" backdrop="blur">
                    <ModalContent>
                        <ModalHeader>Изменение пароля</ModalHeader>
                        <ModalBody className="flex flex-col gap-3">
                            <Input
                                clearable
                                label="Новый пароль"
                                type={isPasswordVisible ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                endContent={
                                    <>
                                        <button className="focus:outline-none mr-2" type="button" onClick={generateRandomPass}>
                                            🎲
                                        </button>
                                        <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                                            {isPasswordVisible ? (
                                                <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                                            ) : (
                                                <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                                            )}
                                        </button>
                                    </>
                                }
                            />
                            <Input
                                label="Повторите пароль"
                                type={isPasswordVisible ? "text" : "password"}
                                value={repeatPassword}
                                onChange={(e) => setRepeatPassword(e.target.value)}
                            />
                            <Switch isSelected={sendToEmail} onValueChange={setSendToEmail}>
                                Отправить на email
                            </Switch>
                            {sendToEmail && (
                                <Input
                                    label="Email получателя"
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                />
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button onClick={onResetClose}>Отмена</Button>
                            <Button color="primary" onClick={handleResetPassword}>Изменить</Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </div>
        </>
    );
};

export default User;
