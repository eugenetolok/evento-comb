import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Card, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { ImportIcon } from "@/components/icons";
import { button as buttonStyles } from "@heroui/theme";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { siteConfig } from "@/config/site";

const ImportAutosModal = ({ action = () => { console.log('default action') }, buttonLabel = "Импорт авто", company_id = 0 }) => {
    const fileInput = useRef<any>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

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
            const postfix = company_id === 0 ? '' : `?company_id=${company_id}`;
            const response = await axiosInstanceAuth({
                url: '/api/autos/template' + postfix,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            // --- Debugging Logs ---
            console.log('Axios Response:', response);
            console.log('Response Headers:', response.headers);
            // --- End Debugging Logs ---

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers ? response.headers['content-disposition'] : null; // Added check for headers existence
            let filename = 'autos_template.xlsx'; // Default filename

            if (contentDisposition) {
                // Split the header by semicolon and find the filename part
                const dispositionParts = contentDisposition.split(';');
                for (const part of dispositionParts) {
                    const trimmedPart = part.trim();
                    if (trimmedPart.startsWith('filename=')) {
                        // Extract the filename value and remove any quotes
                        filename = trimmedPart.substring('filename='.length).replace(/^"|"$/g, '');
                        break; // Found the filename, no need to check other parts
                    }
                }
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename); // Use the extracted filename
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url); // Clean up the URL object
        } catch (error: any) {
            console.error('Error downloading the file:', error);
            toast.error("Ошибка при скачивании шаблона автомобилей.");
        }
    };



    const uploadFile = () => {
        if (!selectedFile) {
            console.error('No file selected.');
            return;
        }

        // Create a FormData instance and append the file
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Send the FormData instance using axios
        const postfix = company_id === 0 ? '' : `?company_id=${company_id}`
        axiosInstanceAuth.post('/api/autos/import' + postfix, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }).then(response => {
            console.log(response);
            onClose();
            toast.success("Успешное создание");
            setTimeout(() => {
                action();
            }, 1000);
        }).catch(error => {
            // Handle error
            if (error.response && error.response.data) {
                if (error.response.data.error) {
                    toast.error(`Ошибки при загрузке:\n${error.response.data.error}`);
                } else {
                    toast.error(`Проблема с распознаванием шаблона.\nСкачайте шаблон заново и заполните именно этот файл.`);
                }
            } else if (error.request) {
                toast.error('Нет ответа от сервера');
            } else {
                toast.error('Произошла ошибка при загрузке');
            }
            console.log(error);
        });
    };


    return (
        <>
            <Button auto color="success" variant="flat" onPress={onOpen} endContent={<ImportIcon />}>
                {buttonLabel}
            </Button>
            <Modal
                Modal backdrop="blur" size="lg" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Импорт автомобилей</div>
                    </ModalHeader>
                    <ModalBody className="justify-center">
                        {selectedFile && <div className="w-full text-center">Выбрано: {selectedFile.name}</div>}
                        <div className="p-4">
                            <ul className="list-disc">
                                <li>Скачайте шаблон</li>
                                <li>Добавьте данные автомобилей в соответствии с заголовками столбцов (не стирайте заголовки!)</li>
                                <li>Прикрепите шаблон в данную форму и нажмите загрузить</li>
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
                        <Button auto onPress={uploadFile}>
                            Загрузить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >
            <ToastContainer theme="dark" />
        </>
    );
};

export default ImportAutosModal;
