'use client';
import React, { useState } from "react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Card, useDisclosure } from "@heroui/react";
import { CarIcon, TruckIcon } from "@/components/icons";
import Table from "@/components/tables/universal/table";
import { useRouter } from '@/shared/router';
import CarPlate from "@/components/tables/plateCell/carPlate";

const columns = [
    { name: "ID", uid: "id", sortable: true },
    { name: "Гос. номер", uid: "number", sortable: true },
    { name: "Тип", uid: "type", sortable: true },
    { name: "Описание", uid: "description", sortable: false }
];

const INITIAL_VISIBLE_COLUMNS = ["number", "type", "description"];

const CompanyAutos = ({ company }: any) => {
    const router = useRouter();
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

    const [buttonConfirmed, setButtonConfirmed] = useState<any>(false);

    const customAddComponent = React.useCallback((auto: any, columnKey: any) => {
        return (
            <>
                {
                    !buttonConfirmed && (
                        <Button color="primary" onClick={() => setButtonConfirmed(true)}>
                            Выдать пропуски
                        </Button>
                    )
                }
                {
                    buttonConfirmed && (
                        <Button color="danger" onClick={() => setButtonConfirmed(false)}>
                            Отменить авто
                        </Button>
                    )
                }
            </>);
    }, [buttonConfirmed]);

    const renderCell = React.useCallback((auto: any, columnKey: any) => {
        const cellValue = auto[columnKey];

        switch (columnKey) {
            case "number":
                return <CarPlate plateCode={String(cellValue ?? "")} compact />;
            case "type":
                if (auto.type === "truck") {
                    return <Button color="primary"><TruckIcon /></Button>
                } else {
                    return <Button color="primary"><CarIcon /></Button>
                }
            default:
                return cellValue ?? "—";
        }
    }, []);

    return (
        <>
            {company && company.autos && (
                <>
                    <Button auto color="success" variant="flat" onPress={onOpen}>
                        Авто
                    </Button>
                    <Modal
                        backdrop="blur" size="5xl" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
                    >
                        <ModalContent>
                            <ModalHeader>
                                <div id="modal-title">Список автомобилей</div>
                            </ModalHeader>
                            <ModalBody className="justify-center">
                                <Table searchColumns={["number", "description"]} tableItems={company.autos} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} onRowClick={(item) => { router.push(`/dashboard/autos/${item.id}`) }} />
                            </ModalBody>
                            <ModalFooter>
                                <Button auto variant="flat" color="danger" onPress={onClose}>
                                    Закрыть
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal >
                </>
            )}
        </>
    );
}

export default CompanyAutos;
