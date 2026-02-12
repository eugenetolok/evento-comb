import React, { useState, useEffect } from "react";
import { Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { PlusIcon } from "@/components/icons";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const carTypes = [{ key: 'truck', name: 'Грузовой' }, { key: 'car', name: 'Легковой' }]

const AddAutoModal = ({ action, label = "Добавить", company_id = 0 }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [auto, setAuto] = useState<any>({
        number: "",
        description: "",
        route: "",
        type: ""
    });


    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        const newState = { ...auto, [name]: value };

        setAuto(newState);
    };

    const handleAddAuto = () => {
        const newAuto = { ...auto, cars_limit: parseInt(auto.cars_limit, 10) };
        const postfix = company_id === 0 ? '' : `?company_id=${company_id}`
        axiosInstanceAuth.post('/api/autos' + postfix, newAuto)
            .then(response => {
                // Handle success
                console.log(response);
                // onAddAuto(auto);
                setAuto({
                    number: "",
                    description: "",
                    route: "",
                    type: ""
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


    const handleSelectChange = (selected: any) => {
        console.log("hmm", selected.target.value)
        setAuto({
            ...auto,
            type: selected.target.value,
        });
    };


    return (
        <>
            <Button auto color="primary" onPress={onOpen} endContent={<PlusIcon />}>
                {label}
            </Button>
            <Modal
                Modal backdrop="blur" size="lg" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Добавить новый автомобиль</div>
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                            {/* {JSON.stringify(auto)} */}
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                label="Гос. номер"
                                isRequired
                                name="number"
                                value={auto.number}
                                onChange={handleInputChange}
                            />
                            <Input
                                clearable
                                bordered
                                fullWidth
                                size="lg"
                                label="Описание"
                                name="description"
                                value={auto.description}
                                onChange={handleInputChange}
                            />
                            <Select
                                isRequired
                                label="Тип автомобиля"
                                placeholder="Выберите тип автомобиля"
                                defaultSelectedKeys={["car"]}
                                fullWidth
                                size="lg"
                                name="type"
                                onChange={handleSelectChange}
                            >
                                {carTypes.map((type) => (
                                    <SelectItem key={type.key}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </Select>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={handleAddAuto}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >
            <ToastContainer theme="dark" />
        </>
    );
};

export default AddAutoModal;
