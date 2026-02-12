import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Card, Link, useDisclosure } from "@heroui/react"; // Added Link
import { axiosInstanceAuth } from "@/axiosConfig";
import { ImportIcon } from "@/components/icons";
import { button as buttonStyles } from "@heroui/theme";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { siteConfig } from "@/config/site";


const ImportCompaniesModal = ({ action = () => { console.log('default action') }, label = "Импорт" }) => {
    const fileInput = useRef<any>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const { isOpen: isErrorOpen, onOpen: onErrorOpen, onClose: onErrorClose } = useDisclosure(); // For error modal
    const [errorMessage, setErrorMessage] = useState<any>(""); // For error modal

    const getCity = () => {
        if (typeof (window) !== "undefined") {
            const subdomain = window.location.host.split(".")[0];
            if (siteConfig.cities[subdomain]) {
                return siteConfig.cities[subdomain];
            }
        }
        return siteConfig.cities[""];
    }

    const downloadFile = async () => {
        try {
            const response = await axiosInstanceAuth({
                url: '/api/companies/template',
                method: 'GET',
                responseType: 'arraybuffer'
            });

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'companies_template.xlsx'; // Default filename
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
            toast.error("Ошибка при скачивании шаблона компаний.");
        }
    };

    const uploadFile = () => {
        if (!selectedFile) {
            toast.error('Файл не выбран.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        axiosInstanceAuth.post('/api/companies/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }).then(response => {
            console.log(response);
            onClose();
            toast.success("Компании успешно импортированы");
            setSelectedFile(null); // Reset selected file
            action(); // Refresh table or data
        }).catch(error => {
            let errorMsg = 'Произошла ошибка при загрузке файла.';
            if (error.response && error.response.data) {
                // Assuming error.response.data is a string with newlines for multi-line errors
                errorMsg = error.response.data;
            } else if (error.request) {
                errorMsg = 'Нет ответа от сервера. Проверьте соединение.';
            }
            setErrorMessage(errorMsg);
            onErrorOpen(); // Open the error modal
            console.error("Upload error:", error);
        });
    };

    const formatErrorMessage = (message: any) => {
        if (typeof message !== 'string') {
            return "Получена неверная ошибка от сервера.";
        }
        return message.split('\n').map((line, index) => (
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
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onClose={() => setSelectedFile(null)} // Reset file on close
                backdrop="blur"
                size="lg"
                scrollBehavior="inside"
            >
                <ModalContent>
                    {(modalClose) => (
                        <>
                            <ModalHeader>
                                <div id="modal-title">Импорт компаний</div>
                            </ModalHeader>
                            <ModalBody className="justify-center">
                                {selectedFile && <div className="w-full text-center">Выбрано: {selectedFile.name}</div>}
                                <div className="p-4">
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Скачайте актуальный шаблон.</li>
                                        <li>Заполните данные компаний в соответствии с заголовками столбцов (не удаляйте и не изменяйте порядок заголовков!).</li>
                                        <li>Столбец ИНН обязателен для заполнения и должен быть уникальным.</li>
                                        <li>Укажите числовые значения для лимитов (Мероприятия, Аккредитации, Доп. зоны).</li>
                                        <li>Прикрепите заполненный шаблон и нажмите Загрузить.</li>
                                    </ul>
                                </div>
                                <div className="flex flex-wrap mx-auto gap-2 mb-4 justify-center">
                                    <Button onClick={downloadFile}>Скачать шаблон</Button>
                                    <div className="flex items-center space-x-2">
                                        <label
                                            htmlFor="company-file-upload" // Unique ID for label
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
                                            id="company-file-upload" // Unique ID
                                            className="hidden"
                                            ref={fileInput}
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button auto variant="flat" color="danger" onPress={() => { modalClose(); setSelectedFile(null); }}>
                                    Отмена
                                </Button>
                                <Button auto onPress={uploadFile} disabled={!selectedFile}>
                                    Загрузить
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal >

            {/* Error Display Modal */}
            <Modal isOpen={isErrorOpen} onClose={onErrorClose} size="xl" backdrop="blur" scrollBehavior="inside">
                <ModalContent>
                    {(modalClose) => (
                        <>
                            <ModalHeader className="text-danger-500">Ошибка импорта</ModalHeader>
                            <ModalBody>
                                <div className="max-h-96 overflow-y-auto whitespace-pre-wrap">
                                    {formatErrorMessage(errorMessage)}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" onPress={modalClose}>Закрыть</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <ToastContainer theme="dark" autoClose={3000} />
        </>
    );
};

export default ImportCompaniesModal;