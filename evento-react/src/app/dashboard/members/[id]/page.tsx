'use client';
import React, { useState, useEffect, useContext } from "react";
import { Input, Switch, Checkbox, Select, SelectItem, Button } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { handleDelete } from "@/components/utils/delete";
import { useRouter } from "@/shared/router";
import InputMask from 'react-input-mask';
import { AppContext } from "@/app/dashboard/context";
import "./gradient.css";
import { button as buttonStyles } from "@heroui/theme";


const Member = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [member, setMember] = useState<any>({
        surname: "",
        name: "",
        middlename: "",
        document: "",
        responsible: false,
        in_zone: false,
        blocked: false,
        accreditation_id: 0,
        birth: "",
        accreditation: {}, // Should contain accreditation.gates
        events: [], // IDs of selected events
        gates: [], // IDs of selected *additional* gates
        realEvents: [], // Full objects of selected events
        realGates: [], // Full objects of selected *additional* gates
        photo_filename: "",
    });
    const role = useContext(AppContext);
    const [noMiddlename, setNoMiddlename] = useState<any>(false);

    const [availCompanyLimits, setAvailCompanyLimits] = useState<any>({ event_limits: [], accred_limits: [], gate_limits: [] });
    const [isFrozen, setIsFrozen] = useState<any>(false);
    const [gatesChanged, setGatesChanged] = useState<any>(false);

    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [imagePreview, setImagePreview] = useState<any>(null);

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        setSelectedFile(file);

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

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
        const newAccreditation = availCompanyLimits.accred_limits.find((acc: any) => acc.id === accreditationId) ||
            (member.accreditation_id === accreditationId ? member.accreditation : null);

        setMember((prevMember: any) => ({
            ...prevMember,
            accreditation_id: accreditationId,
            accreditation: newAccreditation || {},
            gates: newAccreditation?.gates?.map((gate: any) => gate.id) || [],
            realGates: newAccreditation?.gates || [],
        }));
        setGatesChanged(true);
    };


    const handleResponsibleSelection = () => {
        setMember({
            ...member,
            responsible: !member.responsible
        });
    };

    const handleInZone = () => {
        setMember({
            ...member,
            in_zone: !member.in_zone
        });
    };

    const handleBlock = () => {
        setMember({
            ...member,
            blocked: !member.blocked
        });
    };

    useEffect(() => {
        axiosInstanceAuth.get(`/api/members/${id}`)
            .then(response => {
                const dateObject = new Date(response.data.birth);
                setMember({
                    ...response.data,
                    birth: `${dateObject.getUTCDate().toString().padStart(2, '0')}.${(dateObject.getUTCMonth() + 1).toString().padStart(2, '0')}.${dateObject.getUTCFullYear()}`,
                    events: response.data.events.map((event: any) => event.id),
                    gates: response.data.gates.map((gate: any) => gate.id),
                    realEvents: response.data.events,
                    realGates: response.data.gates,
                    accreditation: response.data.accreditation || {}
                });
                axiosInstanceAuth.get(`/api/members/${id}/photo`, { responseType: 'blob' })
                    .then((photoResponse) => {
                        const imageUrl = URL.createObjectURL(photoResponse.data);
                        setImagePreview(imageUrl);
                    })
                    .catch((error) => {
                        console.error('Error fetching image:', error);
                    });
                axiosInstanceAuth.get('/api/companies/limits' + `?company_id=${response.data.company_id}`)
                    .then(limitsResponse => {
                        setAvailCompanyLimits(limitsResponse.data);
                    });
            });
        axiosInstanceAuth.get('/api/users/frozen')
            .then(response => {
                setIsFrozen(response.data === true);
            })
            .catch(error => {
                console.error('Error checking frozen status:', error);
            });
    }, [id]);

    function parseDate(dateString: any) {
        if (!dateString) {
            return false;
        }
        let parts = dateString.split('.');
        if (parts.length !== 3) {
            return false;
        }
        let day = parseInt(parts[0], 10);
        if (isNaN(day) || day <= 0) {
            return false;
        }
        let month = parseInt(parts[1], 10) - 1;
        if (isNaN(month) || month < 0 || month > 11) {
            return false;
        }
        let year = parseInt(parts[2], 10);
        if (isNaN(year) || year <= 0) {
            return false;
        }
        return new Date(Date.UTC(year, month, day));
    }


    function validateAge(birthDate: any) {
        let now = new Date();
        let age = now.getFullYear() - birthDate.getFullYear();
        let monthDifference = now.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 3 || age > 100 || birthDate > now) {
            return false;
        }
        return true;
    }

    const validateForm = () => {
        if (!member.surname || !member.name || !member.birth || !member.document || !member.accreditation_id) {
            toast.error("Заполните все обязательные поля");
            return false;
        }
        if (!noMiddlename && (!member.middlename || member.middlename.trim() === "")) {
            toast.error("Введите отчество или отметьте галочку 'Нет отчества'");
            return false;
        }
        return true;
    };

    const handleAddMember = () => {
        if (!validateForm()) {
            return;
        }
        const parsedDate = parseDate(member.birth)
        if (parsedDate === false) {
            toast.error('Невалидный возраст')
            return
        }
        if (!validateAge(parsedDate)) {
            toast.error('Невалидный возраст')
            return
        }
        const updatedMember = {
            ...member,
            birth: parsedDate,
            event_ids: member.events,
            gate_ids: member.gates,
        };

        axiosInstanceAuth.put(`/api/members/${id}`, updatedMember)
            .then(response => {
                const responseData = response.data;
                const dateObject = new Date(responseData.birth);
                setMember({
                    ...responseData,
                    birth: `${dateObject.getUTCDate().toString().padStart(2, '0')}.${(dateObject.getUTCMonth() + 1).toString().padStart(2, '0')}.${dateObject.getFullYear()}`,
                    events: responseData.events.map((event: any) => event.id),
                    gates: responseData.gates.map((gate: any) => gate.id),
                    realEvents: responseData.events,
                    realGates: responseData.gates,
                    accreditation: responseData.accreditation || {}
                });
                toast.success('Успешно сохранено');

                if (selectedFile) {
                    const formData = new FormData();
                    formData.append('photo', selectedFile);
                    axiosInstanceAuth.post(`/api/members/${id}/photo`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }).then(() => {
                        toast.success('Фото успешно обновлено');
                    })
                        .catch((error) => {
                            toast.error('Ошибка при загрузке фото');
                            console.error('Ошибка при загрузке фото:', error);
                        });
                }

                if (gatesChanged) {
                    toast.info('Доступ к зонам изменен. Необходимо перепечатать бейдж.');
                }
                setGatesChanged(false);
            })
            .catch(error => {
                toast.error('Ошибка при сохранении: ' + (error.response?.data || error.message));
            });
    };

    const toggleEventSelection = (eventId: any) => {
        setMember((prev: any) => {
            const events = prev.events.includes(eventId)
                ? prev.events.filter((id: any) => id !== eventId)
                : [...prev.events, eventId];
            return { ...prev, events };
        });
    };

    const toggleGateSelection = (gateId: any) => {
        setMember((prev: any) => {
            const gates = prev.gates.includes(gateId)
                ? prev.gates.filter((id: any) => id !== gateId)
                : [...prev.gates, gateId];
            setGatesChanged(true);
            return { ...prev, gates };
        });
    };

    const getEventLimit = (eventId: any) => {
        const event = availCompanyLimits.event_limits.find((e: any) => e.id === eventId);
        return event ? event.limit : 0;
    };

    const getGateLimit = (gateId: any) => {
        const gate = availCompanyLimits.gate_limits.find((g: any) => g.id === gateId);
        return gate ? gate.limit : 0;
    };

    const combinedEvents = () => {
        const limitsEvents = availCompanyLimits.event_limits || [];
        const selectedEvents = member.realEvents.filter((event: any) => !limitsEvents.some((limitEvent: any) => limitEvent.id === event.id));

        const allEvents = [
            ...selectedEvents.map((event: any) => ({
                ...event,
                isChecked: member.events.includes(event.id),
                isDisabled: !member.events.includes(event.id) && getEventLimit(event.id) === 0,
            })),
            ...limitsEvents
                .filter((event: any) => !selectedEvents.some((selEvent: any) => selEvent.id === event.id))
                .map((event: any) => ({
                    ...event,
                    isChecked: member.events.includes(event.id),
                    isDisabled: !member.events.includes(event.id) && getEventLimit(event.id) === 0,
                }))
        ];
        return allEvents.sort((a, b) => (b.position || 0) - (a.position || 0));
    };


    const getCombinedAdditionalGates = () => {
        const accreditationGateIds = new Set(
            member.accreditation?.gates?.map((g: any) => g.id) || []
        );

        const companyLimitedAdditionalGates = (availCompanyLimits.gate_limits || [])
            .filter((gate: any) => !accreditationGateIds.has(gate.id));

        const memberSelectedAdditionalGates = (member.realGates || [])
            .filter((gate: any) => !accreditationGateIds.has(gate.id));


        const allPossibleAdditionalGatesMap = new Map();

        companyLimitedAdditionalGates.forEach((gate: any) => {
            allPossibleAdditionalGatesMap.set(gate.id, {
                ...gate,
                isChecked: member.gates.includes(gate.id),
                isDisabled: !member.gates.includes(gate.id) && getGateLimit(gate.id) === 0,
            });
        });

        memberSelectedAdditionalGates.forEach((gate: any) => {
            allPossibleAdditionalGatesMap.set(gate.id, {
                ...gate,
                isChecked: member.gates.includes(gate.id),
                isDisabled: !member.gates.includes(gate.id) && getGateLimit(gate.id) === 0,
            });
        });

        const allGatesArray = Array.from(allPossibleAdditionalGatesMap.values());

        return allGatesArray.sort((a, b) => (b.position || 0) - (a.position || 0));
    };


    const getCombinedAccreditationOptions = () => {
        const limitOptions = availCompanyLimits.accred_limits || [];
        const optionsMap = new Map();
        limitOptions.forEach((opt: any) => {
            optionsMap.set(opt.id, {
                id: opt.id,
                name: opt.name,
            });
        });
        if (member.accreditation_id && member.accreditation?.name) {
            if (!optionsMap.has(member.accreditation_id)) {
                optionsMap.set(member.accreditation_id, {
                    id: member.accreditation_id,
                    name: member.accreditation.name,
                });
            }
        }
        return Array.from(optionsMap.values());
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar title="Участник" deleteHandler={() => handleDelete({ path: 'members', id: id, router: router })} saveHandler={handleAddMember} />
            {(member.accreditation?.require_photo ||
                member.accreditation?.gates?.some((gate: any) => gate.require_photo) ||
                member.realGates?.some((gate: any) => gate.require_photo)) && !imagePreview && (
                    <div className="mx-6 mb-4 p-4 rounded-xl shadow-md bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-lg font-semibold animate-pulse border border-white">
                        Участник не может быть напечатан: требуется фото для данной аккредитации или зоны доступа
                    </div>
                )}
            {isFrozen && (
                <div className="fixed bottom-0 right-0 m-4 p-4 bg-blue-500 text-white rounded-lg shadow-lg z-50">
                    Ваш аккаунт заморожен (только чтение)
                </div>
            )}
            {gatesChanged && (
                <div className="fixed top-0 right-0 m-4 p-4 bg-gradient-animated text-white rounded-lg shadow-lg z-50">
                    <div className="absolute top-0 right-0">
                        <button
                            className="close-button"
                            onClick={() => setGatesChanged(false)}
                        >
                            ×
                        </button>
                    </div>
                    Внимание: Доступ к зонам изменен. После сохранения необходимо будет перепечатать бейдж.
                </div>
            )}
            {role === "admin" && (
                <div className="px-6">
                    <Checkbox name="in_zone" isSelected={member.in_zone} onValueChange={handleInZone}>Участник внутри</Checkbox>
                    <Checkbox name="blocked" isSelected={member.blocked} className="ml-2" onValueChange={handleBlock}>Блок</Checkbox>
                </div>
            )}
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                <div className="flex flex-col items-center">
                    <div className="flex flex-wrap mx-auto gap-2 mb-4 items-center">
                        <div className="flex items-center space-x-2">
                            <label
                                htmlFor="file-upload"
                                className={buttonStyles({ color: "default", variant: "shadow" })}
                            >
                                Выбрать фото участника
                            </label>
                            <input
                                type="file"
                                accept=".jpg,.png"
                                onChange={handleFileChange}
                                id="file-upload"
                                className="hidden"
                            />
                        </div>
                    </div>
                    {imagePreview && (
                        <div className="flex justify-center mb-4">
                            <img src={imagePreview} alt="Выбранное изображение" className="max-w-full h-auto" style={{ maxHeight: '400px', width: 'auto' }} />
                        </div>
                    )}
                </div>
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
                    disabled={isFrozen}
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
                            isDisabled={isFrozen}
                        />
                    )}
                </InputMask>
                <Input
                    label="Компания"
                    value={member.company_name}
                    isReadOnly
                    fullWidth
                    size="lg"
                />
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
                        isDisabled={isFrozen}
                    />
                    <Switch isSelected={member.responsible} onValueChange={handleResponsibleSelection} isDisabled={isFrozen}>
                        Ответственный
                    </Switch>
                </div>
                {(() => {
                    const finalAccreditationOptions = getCombinedAccreditationOptions();
                    if (finalAccreditationOptions.length > 0) {
                        return (
                            <Select
                                isRequired
                                label="Аккредитация участника"
                                placeholder="Выберите аккредитацию участника"
                                fullWidth
                                size="lg"
                                name="accreditation"
                                selectionMode="single"
                                selectedKeys={member.accreditation_id ? [member.accreditation_id.toString()] : []}
                                onSelectionChange={handleAccreditationChange}
                                items={finalAccreditationOptions}
                                isDisabled={isFrozen}
                            >
                                {(acc) => (
                                    <SelectItem key={acc.id.toString()} textValue={acc.name}>
                                        {acc.name}
                                    </SelectItem>
                                )}
                            </Select>
                        );
                    } else {
                        return (
                            <Input
                                label="Аккредитация участника"
                                value={member.accreditation?.name || ''}
                                isReadOnly
                                fullWidth
                                size="lg"
                            />
                        );
                    }
                })()}

                <div>
                    <h3>Мероприятия:</h3>
                    <div className="flex flex-wrap gap-4 max-w-full">
                        {combinedEvents().map((event) => (
                            <div key={event.id} className="flex items-center">
                                <Checkbox
                                    value={event.id.toString()}
                                    isSelected={event.isChecked}
                                    isDisabled={event.isDisabled || isFrozen}
                                    onChange={() => !event.isDisabled && toggleEventSelection(event.id)}
                                >
                                    {event.name}
                                </Checkbox>
                            </div>
                        ))}
                    </div>
                </div>

                {member.accreditation && member.accreditation.gates && member.accreditation.gates.length > 0 && (
                    <>
                        Доступные зоны (в рамках аккредитации):
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {[...(member.accreditation.gates || [])] // Ensure array and sort
                                .sort((a, b) => (b.position || 0) - (a.position || 0))
                                .map((gate) => (
                                    <div key={gate.id} className="flex items-center">
                                        <Checkbox
                                            value={gate.id.toString()}
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

                <div>
                    <h3>Доп. зоны:</h3>
                    <div className="flex flex-wrap gap-4 max-w-full">
                        {getCombinedAdditionalGates().map((gate) => ( // Already sorted by the function
                            <div key={gate.id} className="flex items-center">
                                <Checkbox
                                    value={gate.id.toString()}
                                    isSelected={gate.isChecked}
                                    isDisabled={gate.isDisabled || isFrozen}
                                    onChange={() => !gate.isDisabled && toggleGateSelection(gate.id)}
                                >
                                    {gate.name}
                                </Checkbox>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Member;