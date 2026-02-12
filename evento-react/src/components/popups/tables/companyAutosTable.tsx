import React, { useState, useEffect } from "react";
import { Chip, User, Modal, ModalContent, ModalHeader, ModalBody, Button, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import Table from "@/components/tables/universal/table";

const carTypes = [
    { label: "Легковой", value: "car" },
    { label: "Грузовой", value: "truck" },
]

const columns = [
    { name: "ID", uid: "id", sortable: true },
    { name: "Гос. номер", uid: "name", sortable: true },
    { name: "Компания", uid: "company" },
    { name: "Тип", uid: "type", sortable: true },
    { name: "Статус", uid: "status", sortable: true },
    { name: "Действия", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["name", "type", "status", "actions"];

const CompanyAutosTablePopup = ({ onAddAuto }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [autos, setAutos] = useState<any[]>([]);

    useEffect(() => {
        fetchAutos();
    }, []);

    const fetchAutos = async () => {
        try {
            // const response = await axiosInstanceAuth.get(`/api/companies/autos?company_id=${company.id}`);
            const response = await axiosInstanceAuth.get(`/api/autos/search`);
            const autosWithKey = response.data.map((auto: any, index: number) => ({
                ...auto,
                key: index,
            }));
            setAutos(autosWithKey);
        } catch (error: any) {
            console.error("Error fetching companies:", error);
        }
    };

    const renderCell = React.useCallback((company: any, columnKey: any) => {
        const cellValue = company[columnKey];

        switch (columnKey) {
            case "name":
                return (
                    <User
                        description={company.email + ", " + company.phone}
                        name={cellValue}
                    />
                );
            case "members":
                return (
                    <div>
                        <Chip className="capitalize" color="success" size="sm" variant="flat">
                            Лимиты: {company.members.count} / {company.members.limit}
                        </Chip>
                        <Chip className="capitalize ml-2" color="warning" size="sm" variant="flat">
                            Ожидающие: {company.members.waiting}
                        </Chip>
                    </div>
                );
            case "autos":
                return (
                    <div>
                        <Chip className="capitalize" color="success" size="sm" variant="flat">
                            Лимиты: {company.autos.count} / {company.autos.limit}
                        </Chip>
                        <Chip className="capitalize ml-2" color="warning" size="sm" variant="flat">
                            Ожидающие: {company.autos.waiting}
                        </Chip>
                    </div>
                );
            default:
                return cellValue;
        }
    }, []);


    return (
        <>
            <Button className='mr-1' onPress={onOpen}>
                Автомобили
            </Button>
            <Modal
                backdrop="blur" size="5xl" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Список автомобилей: </div>
                    </ModalHeader>
                    <ModalBody>
                        <Table
                            tableItems={autos}
                            columns={columns}
                            INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
                            renderCell={renderCell}
                            onRowClick={(item: any) => {
                                if (onAddAuto) {
                                    onAddAuto(item);
                                }
                                onClose();
                            }}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal >
        </>
    );
};

export default CompanyAutosTablePopup;
