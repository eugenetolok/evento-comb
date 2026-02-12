'use client';
import React, { useState } from "react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Card, useDisclosure } from "@heroui/react";
import Table from "@/components/tables/universal/table";
import { useRouter } from '@/shared/router';

const statusColorMap = {
    "Подтверждён": "success",
    "Не отправлен": "danger",
    "В ожидании": "warning",
};

const columns = [
    { name: "ID", uid: "id", sortable: true },
    { name: "Фамилия", uid: "surname", sortable: true },
    { name: "Имя", uid: "name", sortable: true },
    { name: "Отчество", uid: "middlename", sortable: true },
    { name: "Аккредитация", uid: "accreditation", sortable: true },
    { name: "Статус", uid: "status", sortable: true },
    { name: "Действия", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["surname", "name", "middlename", "accreditation", "description"];

const CompanyMembers = ({ company }: any) => {
    const router = useRouter();
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [buttonConfirmed, setButtonConfirmed] = useState<any>(false);

    const customAddComponent = React.useCallback((auto: any, columnKey: any) => {
        return (
            <>
                {
                    !buttonConfirmed && (
                        <Button color="primary" onClick={() => setButtonConfirmed(true)}>
                            {localStorage.getItem('print') === 'print' ? 'Распечатать' : 'Выдать'} бейджи
                        </Button>
                    )
                }
                {
                    buttonConfirmed && (
                        <Button color="danger" onClick={() => setButtonConfirmed(false)}>
                            Отменить участников
                        </Button>
                    )
                }
            </>);
    }, [buttonConfirmed]);

    const renderCell = React.useCallback((auto: any, columnKey: any) => {
        const cellValue = auto[columnKey];

        switch (columnKey) {
            case "accreditation":
                return (
                    <div className="flex flex-col">{cellValue['name']}</div>
                );
            case "surname":
                return (
                    <div className="flex flex-col">
                        {cellValue}
                    </div>
                );
            case "name":
                return (
                    <div className="flex flex-col">
                        {cellValue}
                    </div>
                );
            case "middlename":
                return (
                    <div className="flex flex-col">
                        {cellValue}
                    </div>
                );
            default:
                return cellValue;
        }
    }, []);

    return (
        <>
            {company && company.members && (
                <>
                    <Button auto color="success" variant="flat" onPress={onOpen}>
                        Участники
                    </Button>
                    <Modal
                        backdrop="blur" size="5xl" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="outside"
                    >
                        <ModalContent>
                            <ModalHeader>
                                <div id="modal-title">Список участников</div>
                            </ModalHeader>
                            <ModalBody className="justify-center">
                                <Table tableHeight="[100px]" searchColumns={["surname", "name", "middlename"]} tableItems={company.members} columns={columns} INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS} renderCell={renderCell} onRowClick={(item) => { router.push(`/dashboard/members/${item.id}`) }} />
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

export default CompanyMembers;
