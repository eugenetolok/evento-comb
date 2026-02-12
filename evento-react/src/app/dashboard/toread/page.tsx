'use client';
import React, { useState, useEffect } from "react";
import { Tabs, Tab, Table, TableHeader, TableColumn, TableRow, TableBody, TableCell, Button, Chip, Link } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import 'react-toastify/dist/ReactToastify.css';
import { siteConfig } from "@/config/site";
import { button as buttonStyles } from "@heroui/theme";

const ToRead = ({ }) => {

    const [accreditations, setAccreditations] = useState<any>([]);
    const [events, setEvents] = useState<any>([]);
    const [gates, setGates] = useState<any>([]);

    const getDocs = () => {
        if (typeof (window) !== "undefined") {
            const subdomain = window.location.host.split(".")[0]; // Get the subdomain

            if (siteConfig.docs[subdomain]) {
                return siteConfig.docs[subdomain];
            }
        }
        return siteConfig.docs[""];
    }



    // useEffect(() => {
    //     axiosInstanceAuth.get('/api/accreditations/all')
    //         .then(response => {
    //             setAccreditations(response.data);
    //         });
    //     axiosInstanceAuth.get('/api/events')
    //         .then(response => {
    //             setEvents(response.data);
    //         });
    //     axiosInstanceAuth.get('/api/gates')
    //         .then(response => {
    //             setGates(response.data);
    //         });
    // }, []);


    return (
        <>
            <SimpleNavbar title="Информация к ознакомлению" />
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <div className="flex w-full flex-col">
                    <Tabs aria-label="Аккредитации">
                        <Tab key="docs" title="Документы">
                            <Link
                                isExternal
                                href={getDocs()}
                                className={buttonStyles({ color: "primary", variant: "shadow" }) + " col-span-12 sm:col-span-6"}
                            >
                                Перейти к прочтению
                            </Link>
                        </Tab>
                        {/* <Tab key="accreds" title="Аккредитации">

                            <Table isStriped aria-label="Аккредитации">
                                <TableHeader>
                                    <TableColumn>Название</TableColumn>
                                    <TableColumn>Описание</TableColumn>
                                    <TableColumn>Зоны доступа</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {accreditations.map((accreditation) => (
                                        <TableRow key={accreditation.id}>
                                            <TableCell>{accreditation.name}</TableCell>
                                            <TableCell>{accreditation.description}</TableCell>
                                            <TableCell>

                                                {accreditation['gates'].map((gate, index) => (
                                                    <>
                                                        <Chip className="m-1">{gate.name}</Chip>
                                                    </>
                                                ))}

                                            </TableCell>
                                        </TableRow>
                                    ))}

                                </TableBody>
                            </Table>

                        </Tab>
                        <Tab key="events" title="Мероприятия">

                            <Table isStriped aria-label="Мероприятия">
                                <TableHeader>
                                    <TableColumn>Название</TableColumn>
                                    <TableColumn>Описание</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {events.map((event) => (
                                        <TableRow key={event.id}>
                                            <TableCell>{event.name}</TableCell>
                                            <TableCell>{event.description}</TableCell>
                                        </TableRow>
                                    ))}

                                </TableBody>
                            </Table>

                        </Tab>
                        <Tab key="gates" title="Зоны доступа">

                            <Table isStriped aria-label="Зоны доступа">
                                <TableHeader>
                                    <TableColumn>Название</TableColumn>
                                    <TableColumn>Описание</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {gates.map((gate) => (
                                        <TableRow key={gate.id}>
                                            <TableCell>{gate.name}</TableCell>
                                            <TableCell>{gate.description}</TableCell>
                                        </TableRow>
                                    ))}

                                </TableBody>
                            </Table>
                        </Tab> */}
                    </Tabs>
                </div>

            </div>
        </>
    );
};

export default ToRead;
