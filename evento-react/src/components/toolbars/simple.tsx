import React, { useState } from 'react';
import { Navbar, NavbarContent, NavbarItem, NavbarBrand, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useRouter } from '@/shared/router';

type SimpleNavbarProps = {
    deleteHandler?: (() => void) | null;
    saveHandler?: (() => void) | null;
    noBackButton?: boolean;
    title?: string;
    isSaveDisabled?: boolean;
};

const SimpleNavbar = ({
    deleteHandler,
    saveHandler,
    noBackButton = false,
    title = "Редактирование",
    isSaveDisabled = false,
}: SimpleNavbarProps) => {
    const router = useRouter();
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

    const handleDelete = () => {
        setShowConfirmModal(true);
    };

    const confirmDelete = () => {
        setShowConfirmModal(false);
        deleteHandler?.();
    };
    return (
        <>
            <Navbar position="static">
                <NavbarBrand>
                    {!noBackButton && (
                        <Button onClick={() => { router.back() }} variant="flat">
                            Назад
                        </Button>
                    )}
                </NavbarBrand>
                <NavbarContent className="hidden sm:flex gap-4" justify="center">
                    <NavbarItem>
                        {title}
                    </NavbarItem>
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        {deleteHandler && (
                            <Button onClick={handleDelete} color="danger" variant="flat" className='mr-1'>
                                Удалить
                            </Button>
                        )}
                        {saveHandler && (
                            <Button onClick={saveHandler} color="primary" variant="flat" isDisabled={isSaveDisabled}>
                                Сохранить
                            </Button>
                        )}
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
            <Modal placement="center" backdrop="blur" isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
                <ModalContent>
                    <ModalHeader>Вы уверены?</ModalHeader>
                    <ModalBody>Данное действие невозможно отменить</ModalBody>
                    <ModalFooter>
                        <Button color="primary" variant="flat" onPress={confirmDelete}>Да</Button>
                        <Button color="danger" variant="flat" onPress={() => setShowConfirmModal(false)}>Отмена</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default SimpleNavbar;
