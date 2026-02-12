import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { PlusIcon } from "@/components/icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddAccreditationModal = ({ action }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [accreditation, setAccreditation] = useState<any>({
        name: "",
        short_name: "",
        description: "",
        position: 0
    });

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        const newState = { ...accreditation, [name]: value };

        if (name === 'position') {
            const numericValue = value.match(/^\d+$/);
            if (numericValue) {
                newState[name] = Number(value);
            } else {
                // Optionally, you can reset the state to its previous value if the input is invalid
                newState[name] = accreditation[name];
            }
        }

        setAccreditation(newState);
    };

    const handleAddAccreditation = () => {
        axiosInstanceAuth.post('/api/accreditations', accreditation)
            .then(response => {
                // Handle success
                console.log(response);
                // onAddAccreditation(accreditation);
                setAccreditation({
                    name: "",
                    description: "",
                    position: 0
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
                        <div id="modal-title">Добавить новую аккредитацию</div>
                    </ModalHeader>
                    <ModalBody>
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
                            <span>Позиция в сортировке:</span>
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                name="position"
                                value={accreditation.position}
                                onChange={handleInputChange}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={handleAddAccreditation}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >
            <ToastContainer theme="dark" />
        </>
    );
};

export default AddAccreditationModal;
