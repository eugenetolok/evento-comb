import React, { useState } from 'react';
import { Navbar, NavbarContent, NavbarItem, NavbarBrand, Button } from "@heroui/react";
import { useRouter } from '@/shared/router';

const SimpleNavbar = ({ title = "Редактирование", member }: any) => {
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
                        <Button color="primary" variant="flat" className='mr-1'>
                            Выдать монтажный браслет
                        </Button>
                        <Button color="success" variant="flat">
                            {localStorage.getItem('print') === 'print' ? 'Распечатать' : 'Выдать'} бейдж
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
        </>
    );
};

export default SimpleNavbar;