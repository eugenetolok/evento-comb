// components/popups/removeGateFromCompanyModal.jsx
import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Select, SelectItem, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RemoveGateFromCompanyModal = ({ companyId }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [gatesList, setGatesList] = useState<any>([]);
    const [selectedGate, setSelectedGate] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<any>(false);

    useEffect(() => {
        if (isOpen) {
            axiosInstanceAuth.get('/api/gates')
                .then(response => {
                    setGatesList(response.data);
                })
                .catch(error => {
                    toast.error("Не удалось загрузить список зон доступа.");
                    console.error("Error fetching gates:", error);
                });
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!selectedGate) {
            toast.warn("Пожалуйста, выберите зону доступа.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosInstanceAuth.post(`/api/companies/${companyId}/remove-gate-from-members`, {
                gate_id: selectedGate
            });
            toast.success(`Зона успешно удалена. Затронуто записей: ${response.data.rows_affected}`);
            onClose();
        } catch (error: any) {
            toast.error("Ошибка при удалении зоны: " + (error.response?.data?.error || error.message));
            console.error("Error removing gate from company members:", error);
        } finally {
            setIsLoading(false);
            setSelectedGate(null);
        }
    };

    return (
        <>
            <Button auto className="mr-1" color="danger" variant="flat" onPress={onOpen}>
                Удалить зону у всех
            </Button>
            <Modal
                backdrop="blur"
                size="md"
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onClose={() => setSelectedGate(null)}
            >
                <ModalContent>
                    {(modalClose) => (
                        <>
                            <ModalHeader>Удалить зону у всех участников компании</ModalHeader>
                            <ModalBody>
                                <p className="text-danger font-bold">Внимание! Это опасное действие.</p>
                                <p>Выберите зону доступа, которая будет удалена у всех участников этой компании. Это действие нельзя будет отменить.</p>
                                <Select
                                    isRequired
                                    label="Зона доступа для удаления"
                                    placeholder="Выберите зону из списка"
                                    selectedKeys={selectedGate ? [selectedGate] : []}
                                    onSelectionChange={(keys) => setSelectedGate(Array.from(keys)[0])}
                                >
                                    {gatesList.map((gate: any) => (
                                        <SelectItem key={gate.id} textValue={gate.name}>
                                            {gate.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="default" variant="light" onPress={modalClose}>
                                    Отмена
                                </Button>
                                <Button color="danger" onPress={handleConfirm} isLoading={isLoading}>
                                    Подтвердить удаление
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};

export default RemoveGateFromCompanyModal;