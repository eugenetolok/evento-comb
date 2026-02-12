import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Checkbox, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { PlusIcon } from "@/components/icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddGateModal = ({ action }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [gate, setGate] = useState<any>({
        name: "",
        description: "",
        position: 0,
        external: false,
        additional: false
    });

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        const newState = { ...gate, [name]: value };

        if (name === 'position') {
            const numericValue = value.match(/^\d+$/);
            if (numericValue) {
                newState[name] = Number(value);
            } else {
                // Optionally, you can reset the state to its previous value if the input is invalid
                newState[name] = gate[name];
            }
        }
        // console.log('gate.external', gate.external, 'gate.additional', gate.additional)
        if (name === 'external' || name === 'additional') {
            newState[name] = value === 'true'
        }

        setGate(newState);
    };

    const handleAddGate = () => {
        axiosInstanceAuth.post('/api/gates', gate)
            .then(response => {
                // Handle success
                console.log(response);
                // onAddGate(gate);
                setGate({
                    name: "",
                    description: "",
                    position: 0,
                    external: false,
                    additional: false
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
                        <div id="modal-title">Добавить новую зону</div>
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
                                value={gate.name}
                                onChange={handleInputChange}
                            />
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                label="Описание"
                                name="description"
                                value={gate.description}
                                onChange={handleInputChange}
                            />
                            <span>Позиция в сортировке:</span>
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                name="position"
                                value={gate.position}
                                onChange={handleInputChange}
                            />
                            <div className="flex gap-4">
                                <Checkbox
                                    name="external"
                                    onValueChange={(value) => {
                                        setGate({ ...gate, external: value })
                                    }}>
                                    Внешний вход
                                </Checkbox>
                                <Checkbox
                                    name="additional"
                                    onValueChange={(value) => {
                                        setGate({ ...gate, additional: value })
                                    }}>
                                    Доп. зона
                                </Checkbox>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={handleAddGate}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >
            <ToastContainer theme="dark" />
        </>
    );
};

export default AddGateModal;
