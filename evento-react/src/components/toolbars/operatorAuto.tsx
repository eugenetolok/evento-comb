import React, { useState } from 'react';
import { Navbar, NavbarContent, NavbarItem, NavbarBrand, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useRouter } from '@/shared/router';

const SimpleNavbar = ({ deleteHandler, saveHandler, noBackButton, title = "Редактирование" }: any) => {
    const router = useRouter();

    return (
        <>
            <Navbar position="static">
                <NavbarBrand>

                    <Button onClick={() => { router.back() }} variant="flat">
                        Назад
                    </Button>

                </NavbarBrand>
                <NavbarContent className="hidden sm:flex gap-4" justify="center">
                    <NavbarItem>
                        {title}
                    </NavbarItem>
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button color="primary" variant="flat">
                            Выдать пропуск
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
        </>
    );
};

export default SimpleNavbar;