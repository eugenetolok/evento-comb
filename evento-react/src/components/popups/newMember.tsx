import React, { useState, useEffect } from "react";
import { Switch, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Select, SelectItem, Checkbox, Link, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { PlusIcon } from "@/components/icons";
import './scroll.css'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { siteConfig } from "@/config/site";
import InputMask from 'react-input-mask';

const AddMemberModal = ({ action, label = "Добавить", company_id = null }: any) => {
    const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
    const [member, setMember] = useState<any>({
        surname: "",
        name: "",
        middlename: "",
        birth: "",
        document: "",
        responsible: false,
        accreditation_id: 0,
        events: [],
        gates: [],
    });

    const [noMiddlename, setNoMiddlename] = useState<any>(false);

    const [availCompanyLimits, setAvailCompanyLimits] = useState<any>([]);
    const { isOpen: isAcceptOpen, onOpen: onAcceptOpen, onClose: onAcceptClose } = useDisclosure();

    useEffect(() => {
        if (isOpen) {
            const postfix = company_id === null ? '' : `?company_id=${company_id}`;
            axiosInstanceAuth.get('/api/companies/limits' + postfix)
                .then(response => {
                    setAvailCompanyLimits(response.data);
                    console.log("company with limits", response.data);
                });
        }
    }, [isOpen]);

    const handleInputChange = (e: any) => {
        setMember({
            ...member,
            [e.target.name]: e.target.value,
        });
        if (e.target.name === "middlename" && e.target.value !== "") {
            setNoMiddlename(false);
        }
    };

    const handleNoMiddlenameChange = (isSelected: any) => {
        setNoMiddlename(isSelected);
        if (isSelected) {
            setMember((prevMember: any) => ({
                ...prevMember,
                middlename: "-",
            }));
        } else {
            if (member.middlename === "-") {
                setMember((prevMember: any) => ({
                    ...prevMember,
                    middlename: "",
                }));
            }
        }
    };

    const handleAccreditationChange = (selected: any) => {
        const accreditationId = Array.from(selected)[0];
        const accreditation = availCompanyLimits.accred_limits.find((acc: any) => acc.id === accreditationId);
        setMember({
            ...member,
            accreditation_id: accreditationId,
            accreditation,
        });
    };

    const handleResponsibleSelection = () => {
        setMember({
            ...member,
            responsible: !member.responsible,
        });
    };

    function parseDate(dateString: any) {
        if (!dateString) {
            return false; // Handle empty string
        }

        let parts = dateString.split('.');
        if (parts.length !== 3) {
            return false; // Ensure there are exactly 3 parts
        }

        let day = parseInt(parts[0], 10);
        if (isNaN(day) || day <= 0) {
            return false; // Check for valid day
        }

        let month = parseInt(parts[1], 10) - 1; // month is zero-based
        if (isNaN(month) || month < 0 || month > 11) {
            return false; // Check for valid month
        }

        let year = parseInt(parts[2], 10);
        if (isNaN(year) || year <= 0) {
            return false; // Check for valid year
        }

        console.log("ymd", year, month, day);
        return new Date(Date.UTC(year, month, day));
    }

    function validateAge(birthDate: any) {
        let now = new Date();
        let age = now.getFullYear() - birthDate.getFullYear();
        let monthDifference = now.getMonth() - birthDate.getMonth();

        // Adjust age if the current date is before the birthday in the current year
        if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthDate.getDate())) {
            age--;
        }

        console.log("current age", age);

        // Age validation
        if (age < 3 || age > 100 || birthDate > now) {
            return false;
        }
        return true;
    }

    const validateForm = () => {
        if (!member.surname || !member.name || !member.birth || !member.document || member.accreditation_id === 0) {
            toast.error("Заполните все обязательные поля");
            return false;
        }
        if (!noMiddlename && (!member.middlename || member.middlename.trim() === "")) {
            toast.error("Введите отчество или отметьте галочку 'Нет отчества'");
            return false;
        }
        if (member.events.length === 0) {
            toast.error("Выберите хотя бы одно мероприятие");
            return false;
        }
        return true;
    };


    const handleAddMember = () => {
        if (!validateForm()) {
            return;
        }
        const parsedDate = parseDate(member.birth);
        console.log('parsed date:', parsedDate);
        if (parsedDate === false) {
            toast.error('Невалидный возраст');
            return;
        }
        if (!validateAge(parsedDate)) {
            toast.error('Невалидный возраст');
            return;
        }

        const newMember = {
            ...member,
            birth: parsedDate,
            event_ids: member.events,
            gate_ids: member.gates,
        };
        const postfix = company_id === 0 ? '' : `?company_id=${company_id}`;
        axiosInstanceAuth.post('/api/members' + postfix, newMember)
            .then(response => {
                // Handle success
                console.log(response);
                setMember({
                    surname: "",
                    name: "",
                    middlename: "",
                    birth: "",
                    document: "",
                    responsible: false,
                    accreditation_id: 0,
                    events: [],
                    gates: [],
                });
                onClose();
                onAcceptClose();
                toast.success("Успешное создание");
                action();
            })
            .catch(error => {
                // Handle error
                if (error.response && error.response.status === 500 && error.response.data.includes('UNIQUE constraint failed: members.document')) {
                    toast.error('Данный документ уже присутствует в системе');
                } else {
                    toast.error("Ошибка при создании: " + error.response.data);
                }
                console.log(error);
            });
    };

    return (
        <>
            <Button auto color="primary" onPress={onOpen} endContent={<PlusIcon />}>
                {label}
            </Button>
            <Modal
                Modal backdrop="blur" size="5xl" isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <div id="modal-title">Добавить нового участника</div>
                    </ModalHeader>
                    <ModalBody>
                        <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2 scroll-animation">
                            <div className="flex flex-row w-full gap-3">
                                <Input
                                    clearable
                                    bordered
                                    size="lg"
                                    label="Фамилия"
                                    isRequired
                                    name="surname"
                                    value={member.surname}
                                    onChange={handleInputChange}
                                />
                                <Input
                                    clearable
                                    bordered
                                    size="lg"
                                    label="Имя"
                                    isRequired
                                    name="name"
                                    value={member.name}
                                    onChange={handleInputChange}
                                />
                                <div className="w-full">
                                    <Input
                                        clearable
                                        bordered
                                        size="lg"
                                        label="Отчество"
                                        isRequired
                                        name="middlename"
                                        value={member.middlename}
                                        onChange={handleInputChange}
                                    />
                                    <Checkbox
                                        isSelected={noMiddlename}
                                        onValueChange={handleNoMiddlenameChange}
                                        className="mt-1">
                                        Нет отчества
                                    </Checkbox>
                                </div>
                            </div>
                            <InputMask
                                mask="99.99.9999"
                                value={member.birth}
                                onChange={handleInputChange}
                            >
                                {() => (
                                    <Input
                                        clearable
                                        bordered
                                        fullWidth
                                        isRequired
                                        value={member.birth}
                                        label="Дата рождения"
                                        name="birth"
                                        onChange={handleInputChange}
                                    />
                                )}
                            </InputMask>
                            <div className="flex flex-row w-full gap-3">
                                <Input
                                    isRequired
                                    clearable
                                    bordered
                                    fullWidth
                                    size="lg"
                                    label="Серия и номер паспорта"
                                    name="document"
                                    value={member.document}
                                    onChange={handleInputChange}
                                />
                                <Switch onValueChange={handleResponsibleSelection}>
                                    Ответственный
                                </Switch>
                            </div>
                            {availCompanyLimits && availCompanyLimits.accred_limits && (
                                <Select
                                    isRequired
                                    label="Аккредитация участника"
                                    placeholder="Выберите аккредитацию участника"
                                    fullWidth
                                    size="lg"
                                    name="accreditation"
                                    onSelectionChange={handleAccreditationChange}
                                >
                                    {availCompanyLimits.accred_limits.filter((accreditation: any) => accreditation.limit > 0).map((accreditation: any) => (
                                        <SelectItem key={accreditation.id}>
                                            {accreditation.name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            )}
                            {availCompanyLimits && availCompanyLimits.event_limits && availCompanyLimits.event_limits.length > 0 && (
                                <>
                                    Мероприятия:
                                    <div className="flex flex-wrap gap-4 max-w-full">
                                        {availCompanyLimits.event_limits.map((event: any) => (
                                            <div key={event.id} className="flex items-center">
                                                <Checkbox
                                                    value={event.id}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setMember((prev: any) => ({
                                                                ...prev,
                                                                events: [...prev.events, event.id],
                                                            }));
                                                        } else {
                                                            setMember((prev: any) => ({
                                                                ...prev,
                                                                events: prev.events.filter((id: any) => id !== event.id),
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    {event.name}
                                                </Checkbox>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {member.accreditation && member.accreditation.gates && member.accreditation.gates.length > 0 && (
                                <>
                                    Доступные зоны:
                                    <div className="flex flex-wrap gap-4 max-w-full">
                                        {member.accreditation.gates.map((gate: any) => (
                                            <div key={gate.id} className="flex items-center">
                                                <Checkbox
                                                    value={gate.id}
                                                    isDisabled
                                                    isSelected
                                                >
                                                    {gate.name}
                                                </Checkbox>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {availCompanyLimits && availCompanyLimits.gate_limits && availCompanyLimits.gate_limits.length > 0 && (
                                <>
                                    Доп. зоны:
                                    <div className="flex flex-wrap gap-4 max-w-full">
                                        {availCompanyLimits.gate_limits.map((gate: any) => (
                                            <div key={gate.id} className="flex items-center">
                                                <Checkbox
                                                    value={gate.id}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setMember((prev: any) => ({
                                                                ...prev,
                                                                gates: [...prev.gates, gate.id],
                                                            }));
                                                        } else {
                                                            setMember((prev: any) => ({
                                                                ...prev,
                                                                gates: prev.gates.filter((id: any) => id !== gate.id),
                                                            }));
                                                        }
                                                    }}
                                                >
                                                    {gate.name}
                                                </Checkbox>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button auto variant="flat" color="danger" onPress={onClose}>
                            Отмена
                        </Button>
                        <Button auto onPress={() => {
                            if (typeof window !== 'undefined') {
                                localStorage.getItem('policy') === 'true' ? handleAddMember() : onAcceptOpen();
                            }
                        }}>
                            Добавить
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <Modal isOpen={isAcceptOpen} onClose={onAcceptClose} size="sm" backdrop="blur">
                <ModalContent>
                    <ModalHeader>Внимание!</ModalHeader>
                    <ModalBody>
                        Я ознакомился с <Link isExternal href={siteConfig.links.docs}>Политикой обработки персональных данных</Link>, даю оператору свое согласие на обработку персональных данных, а также на поручение обработки моих персональных данных третьим лицам.
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onAcceptClose}>Отмена</Button>
                        <Button color="primary" onPress={() => {
                            if (typeof window !== 'undefined') {
                                localStorage.setItem('policy', 'true');
                                handleAddMember();
                            }
                        }}>
                            Принять
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <ToastContainer theme="dark" />
        </>
    );
};

export default AddMemberModal;
