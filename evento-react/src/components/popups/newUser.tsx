import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Select, SelectItem, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { PlusIcon, EyeSlashFilledIcon, EyeFilledIcon } from "@/components/icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const roles = [
    { label: "Админ", value: "admin" },
    { label: "Редактор компаний", value: "editor" },
    { label: "Представитель компании", value: "company" },
    { label: "Оператор на мероприятии", value: "operator" },
    { label: "Мониторинг", value: "monitoring" }]

const AddUserModal = ({ action }: any) => {
    const [isPasswordVisible, setIsPasswordVisible] = React.useState<any>(false);
    const toggleVisibility = () => setIsPasswordVisible(!isPasswordVisible);

    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [user, setUser] = useState<any>({
        username: "",
        password: "",
        role: "editor",
        telegram_id: ""
    });

    const generateRandomPass = () => {
        setUser({
            ...user,
            password: Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(2, length),
        });
    }

    const handleInputChange = (e: any) => {
        setUser({
            ...user,
            [e.target.name]: e.target.value,
        });
    };

    const handleSelectChange = (selected: any) => {
        console.log("hmm", selected.target.value)
        setUser({
            ...user,
            role: selected.target.value,
        });
    };

    const handleAddUser = () => {
        axiosInstanceAuth.post('/api/users', user)
            .then(response => {
                // Handle success
                console.log(response);
                setUser({
                    name: "",
                    description: "",
                    role: "",
                });
                onClose(); // Assuming you have onClose function to close the modal
                toast.success("Успешное создание");
                action();
            })
            .catch(error => {
                // Handle error
                toast.error("Ошибка при создании");
                console.log(error);
            });
    };

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
                        <div id="modal-title">Добавить нового пользователя</div>
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                label="Логин"
                                isRequired
                                name="username"
                                value={user.username}
                                onChange={handleInputChange}
                            />
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                label="Пароль"
                                name="password"
                                value={user.password}
                                onChange={handleInputChange}
                                type={isPasswordVisible ? "text" : "password"}
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
                            <Select
                                isRequired
                                label="Роль пользователя"
                                placeholder="Выберите роль пользователя"
                                defaultSelectedKeys={["editor"]}
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
                            {/* <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                label="Telegram ID"
                                name="telegram_id"
                                value={user.telegram_id}
                                onChange={handleInputChange}
                            /> */}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={handleAddUser}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >
            <ToastContainer theme="dark" />
        </>
    );
};

export default AddUserModal;
