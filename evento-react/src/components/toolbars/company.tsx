import React, { useEffect, useState, useContext } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Switch, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { EyeSlashFilledIcon, EyeFilledIcon } from "@/components/icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddMemberModal from "@/components/popups/newMember";
import AddAutoModal from "@/components/popups/newAuto";
import ImportMembersModal from "@/components/popups/membersImport";
import ImportAutosModal from "@/components/popups/autosImport";
import CompanyMembers from "@/components/popups/companyMembers";
import CompanyAutos from "@/components/popups/companyAutos";
import { AppContext } from "@/app/dashboard/context";
import AddGateToCompanyModal from "@/components/popups/addGateToCompanyModal";
import RemoveGateFromCompanyModal from "@/components/popups/removeGateFromCompanyModal";

const CredsModal = ({ company }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [newPassword, setNewPassword] = useState<any>('');
    const [repeatPassword, setRepeatPassword] = useState<any>('');
    const [sendToEmail, setSendToEmail] = useState<any>(false);
    const [email, setEmail] = useState<any>('');
    const [isPasswordVisible, setIsPasswordVisible] = useState<any>(false);
    const toggleVisibility = () => setIsPasswordVisible(!isPasswordVisible);

    useEffect(() => {
        setEmail(company?.email || '');
    }, [company]);

    const generateRandomPass = () => {
        const tempPass = Math.random().toString(36).substring(2, 8)
            + Math.random().toString(36).substring(2, 8)
            + Date.now().toString(36).substring(2);
        setNewPassword(tempPass);
        setRepeatPassword(tempPass);
    };

    const handleResetPassword = async () => {
        if (!company?.user?.id) {
            toast.error("Нет данных пользователя");
            return;
        }

        if (newPassword !== '' && newPassword !== repeatPassword) {
            toast.error("Пароли не совпадают");
            return;
        }
        if (!sendToEmail && newPassword.trim() === '') {
            toast.error("Введите новый пароль или включите отправку ссылки на email");
            return;
        }
        if (sendToEmail && email.trim() === '') {
            toast.error("Укажите email получателя");
            return;
        }

        try {
            const response = await axiosInstanceAuth.post(`/api/users/resetPassword/${company.user.id}`, {
                password: newPassword.trim(),
                recipient_email: sendToEmail ? email.trim() : "",
                recepient_email: sendToEmail ? email.trim() : "",
            });

            if (response.status === 200) {
                const payload = response.data as {
                    password_updated?: boolean;
                    reset_email_sent?: boolean;
                };
                if (payload.password_updated && payload.reset_email_sent) {
                    toast.success("Пароль обновлён и ссылка отправлена на email");
                } else if (payload.password_updated) {
                    toast.success("Пароль успешно изменён");
                } else if (payload.reset_email_sent) {
                    toast.success("Ссылка для сброса пароля отправлена");
                } else {
                    toast.success("Запрос выполнен");
                }
                onClose();
            } else {
                toast.error(`Ошибка: ${response.statusText}`);
            }
        } catch (error: any) {
            toast.error(`Ошибка: ${error.response?.data || error.message}`);
        }
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <Button auto className="mr-1" onPress={onOpen}>
                Доступы
            </Button>
            <Modal
                backdrop="blur"
                size="sm"
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>Доступы</ModalHeader>
                    <ModalBody className="flex flex-col gap-3">
                        <Input
                            isReadOnly
                            label="Логин"
                            size="lg"
                            value={company.user.username}
                        />
                        <Input
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
                                type="email"
                                label="Email получателя"
                                size="lg"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onClose}>Отмена</Button>
                        <Button color="primary" onClick={handleResetPassword}>Изменить</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};


const CompanyNavbar = ({ company }: any) => {
    const role = useContext(AppContext);
    return (
        <>
            <div className="mr-7 text-right">

                <div className="flex justify-end items-center space-x-2 mb-2"> {/* row 1 */}
                    <CredsModal company={company} />
                    <AddMemberModal action={() => { }} company_id={company['id']} label="Участник" />
                    <AddAutoModal action={() => { }} company_id={company['id']} label="Авто" />
                </div>

                {role === "admin" && company && company.id && (
                    <div className="flex justify-end items-center space-x-2 mb-2">
                        <AddGateToCompanyModal companyId={company.id} />
                        <RemoveGateFromCompanyModal companyId={company.id} />
                    </div>
                )}

                <div className="flex justify-end items-center space-x-2 mb-2"> {/* row 2 */}

                    {company && company.id && company.name && (
                        <>
                            <ImportMembersModal action={() => { console.log("members added") }} label="Импорт участников" company_id={company.id} companyName={company.name} />
                            <ImportAutosModal action={() => { console.log("autos added") }} buttonLabel="Импорт авто" company_id={company.id} />
                        </>

                    )}
                </div>
                <div className="flex justify-end items-center space-x-2"> {/* row 3 */}
                    {/* <Button className="mr-1" color="primary" onClick={() => setButtonConfirmed(true)}>
                        Участники
                    </Button> */}
                    <CompanyMembers company={company} />
                    <CompanyAutos company={company} />
                </div>
            </div>
        </>
    )
};

export default CompanyNavbar;
