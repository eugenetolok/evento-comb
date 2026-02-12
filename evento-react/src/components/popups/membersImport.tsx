import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Card, Link, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { ImportIcon } from "@/components/icons";
import { button as buttonStyles } from "@heroui/theme";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { siteConfig } from "@/config/site";

const ImportCompaniesModal = ({ action, label = "Импорт", company_id = 0, companyName = "" }: any) => {
    const fileInput = useRef<any>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const { isOpen: isAcceptOpen, onOpen: onAcceptOpen, onClose: onAcceptClose } = useDisclosure();
    const { isOpen: isErrorOpen, onOpen: onErrorOpen, onClose: onErrorClose } = useDisclosure();
    const [errorMessage, setErrorMessage] = useState<any>("");

    const getCity = () => {
        if (typeof (window) !== "undefined") {
            const subdomain = window.location.host.split(".")[0]; // Get the subdomain

            if (siteConfig.cities[subdomain]) {
                return siteConfig.cities[subdomain];
            }
        }
        return siteConfig.cities[""];
    }

    const downloadFile = async () => {
        try {
            const postfix = company_id === 0 ? '' : `?company_id=${company_id}`
            const response = await axiosInstanceAuth({
                url: '/api/members/template' + postfix,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'members_template.xlsx'; // Default filename
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename); // Use filename from header
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url); // Clean up
        } catch (error: any) {
            console.error('Error downloading the file:', error);
            toast.error("Ошибка при скачивании шаблона участников.");
        }
    };

    const uploadFile = async () => {
        if (!selectedFile) {
            console.error('No file selected.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const postfix = company_id === 0 ? '' : `?company_id=${company_id}`
            const response = await axiosInstanceAuth.post('/api/members/import' + postfix, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            console.log(response);
            toast.success("Успешное создание");
            action();
            onClose();
            onAcceptClose();
        } catch (error: any) {
            let errorMsg = 'Произошла ошибка при загрузке';
            if (error.response && error.response.data) {
                errorMsg = `Ошибки при загрузке:\n${error.response.data}`;
            } else if (error.request) {
                errorMsg = 'Нет ответа от сервера';
            }
            setErrorMessage(errorMsg);
            onErrorOpen();
            console.log(error);
        }
    };

    const formatErrorMessage = (message: any) => {
        return message.split('\n').map((line: any, index: any) => (
            <React.Fragment key={index}>
                {line}
                <br />
            </React.Fragment>
        ));
    };



    return (
        <>
            <Button auto color="success" variant="flat" onPress={onOpen} endContent={<ImportIcon />}>
                {label}
            </Button>
            <Modal
                Modal backdrop="blur" size="lg" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Импорт участников</div>
                    </ModalHeader>
                    <ModalBody className="justify-center">
                        {selectedFile && <div className="w-full text-center">Выбрано: {selectedFile.name}</div>}
                        <div className="p-4">
                            <ul className="list-disc">
                                <li>Скачайте шаблон</li>
                                <li>Добавьте данные участников в соответствии с заголовками столбцов (не стирайте заголовки!)</li>
                                <li>В столбце Аккредитация выберите соответствующий тип из выпадающего списка</li>
                                <li>В столбцах Мероприятия (дни посещения) и Дополнительные зоны доступа укажите цифру 1, если участник присутствует на мероприятии (дне посещения) и имеет соответствующую зону доступа</li>
                                <li>Загрузите шаблон в данную форму и нажмите загрузить</li>
                            </ul>
                        </div>
                        <div className="flex flex-wrap mx-auto gap-2 mb-4">
                            <Button onClick={downloadFile}>Скачать шаблон</Button>
                            <div className="flex items-center space-x-2">
                                <label
                                    htmlFor="file-upload"
                                    className={buttonStyles({ color: "default", variant: "shadow" })}
                                >
                                    Выбрать файл
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(e) => {
                                        setSelectedFile(e.target.files?.[0]);
                                    }}
                                    id="file-upload"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={() => {
                            if (typeof window !== 'undefined') {
                                localStorage.getItem('policy') === 'true' ? uploadFile() : onAcceptOpen()
                            }
                        }}>
                            Загрузить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >

            <Modal isOpen={isAcceptOpen} onClose={onAcceptClose} size="sm" backdrop="blur">
                <ModalContent>
                    <ModalHeader>Внимание!</ModalHeader>
                    <ModalBody>
                        Я ознакомился с <Link isExternal href={siteConfig.links.docs}>Политикой обработки персональных данных</Link>, даю оператору свое согласие на обработку персональных данных, а также на поручение обработки моих персональных данных третьим лицам.
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onAcceptClose}>Отмена</Button>
                        <Button color="primary" onPress={() => {
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('policy', 'true');
                                uploadFile();
                            }
                        }
                        }>Принять</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isErrorOpen} onClose={onErrorClose} size="xl" backdrop="blur">
                <ModalContent>
                    <ModalHeader></ModalHeader>
                    <ModalBody>
                        <div>{formatErrorMessage(errorMessage)}</div>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onErrorClose}>Закрыть</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <ToastContainer autoClose={false} theme="dark" />
        </>
    );
};

export default ImportCompaniesModal;
