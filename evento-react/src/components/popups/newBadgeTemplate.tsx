import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Switch, Textarea, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { PlusIcon } from "@/components/icons";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddBadgeTemplateModal = ({ action }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [template, setTemplate] = useState<any>({
        name: "",
        template_json: "",
        is_default: false,
    });

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setTemplate((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleDefaultChange = (isSelected: any) => {
        setTemplate((prev: any) => ({ ...prev, is_default: isSelected }));
    };

    const handleAddTemplate = () => {
        if (!template.name || !template.template_json) {
            toast.error("Название и JSON шаблона обязательны.");
            return;
        }
        try {
            // Basic JSON validation before sending
            JSON.parse(template.template_json);
        } catch (e) {
            toast.error("Ошибка: Неверный формат JSON.");
            return;
        }

        axiosInstanceAuth.post('/api/badges', template)
            .then(() => {
                toast.success("Шаблон успешно создан");
                setTemplate({ name: "", template_json: "", is_default: false }); // Reset form
                onClose();
                action(); // Refresh table
            })
            .catch(error => {
                toast.error("Ошибка при создании шаблона");
                console.log(error);
            });
    };

    return (
        <>
            <Button auto color="primary" onPress={onOpen} endContent={<PlusIcon />}>
                Добавить
            </Button>
            <Modal
                backdrop="blur"
                size="3xl"
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onClose={() => setTemplate({ name: "", template_json: "", is_default: false })}
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Добавить новый шаблон бейджа</div>
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex flex-col gap-4">
                            <Input
                                isRequired
                                label="Название"
                                name="name"
                                value={template.name}
                                onChange={handleInputChange}
                            />
                            <Textarea
                                isRequired
                                label="JSON шаблона"
                                name="template_json"
                                value={template.template_json}
                                onChange={handleInputChange}
                                minRows={15}
                                placeholder="Введите JSON..."
                                className="font-mono"
                            />
                            <Switch
                                isSelected={template.is_default}
                                onValueChange={handleDefaultChange}
                            >
                                Использовать по-умолчанию
                            </Switch>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={handleAddTemplate}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default AddBadgeTemplateModal;