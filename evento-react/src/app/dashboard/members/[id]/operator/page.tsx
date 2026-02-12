'use client';
import React, { useState, useEffect, useMemo } from "react";
import { Input, Switch, Checkbox, Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Spinner } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from '@/shared/router';

// Import the shared logic from the central utility file
import { generateBadgePayload, getPrintValidationStatus } from "@/components/print/badge"; // Adjust the path if necessary

const Member = ({ params }: any) => {
    const { id } = params;
    const url = `/api/members/${id}`;
    const urlBangle = `/api/members/giveBangle/${id}`;
    const urlPrint = `/api/members/print/${id}`;
    const urlNewBarcode = `/api/members/${id}/regenerate-barcode`;
    const router = useRouter();

    // State and modal hooks
    const { isOpen: isBarcodeModalOpen, onOpen: onBarcodeModalOpen, onOpenChange: onBarcodeModalOpenChange } = useDisclosure();
    const { isOpen: isPassesModalOpen, onOpen: onPassesModalOpen, onOpenChange: onPassesModalOpenChange } = useDisclosure();
    const [memberPasses, setMemberPasses] = useState<any>([]);
    const [isLoadingPasses, setIsLoadingPasses] = useState<any>(false);
    const [printerUrl, setPrinterUrl] = useState<any>('http://localhost:8434');
    const [tempPrinterUrl, setTempPrinterUrl] = useState<any>('');
    const [imagePreview, setImagePreview] = useState<any>(null);
    const [member, setMember] = useState<any>(null); // Initialize as null to show loading state
    const [printLimit, setPrintLimit] = useState<any>({
        limit: 0,
        printed: 0,
        isLoading: true,
    });

    useEffect(() => {
        const savedUrl = localStorage.getItem('printerApiUrl');
        setPrinterUrl(savedUrl || 'http://localhost:8434');
        setTempPrinterUrl(savedUrl || 'http://localhost:8434');
    }, []);

    // Effect to fetch the main member data
    useEffect(() => {
        if (!id) return;

        axiosInstanceAuth.get(url)
            .then(response => {
                const dateObject = new Date(response.data.birth);
                setMember({
                    ...response.data,
                    birth: `${dateObject.getUTCDate().toString().padStart(2, '0')}.${(dateObject.getUTCMonth() + 1).toString().padStart(2, '0')}.${dateObject.getUTCFullYear()}`,
                });
            }).catch(err => {
                console.error("Error fetching member:", err);
                toast.error("Не удалось загрузить данные участника.");
            });

        axiosInstanceAuth.get(`/api/members/${id}/photo`, { responseType: 'blob' })
            .then((photoResponse) => {
                const imageUrl = URL.createObjectURL(photoResponse.data);
                setImagePreview(imageUrl);
            })
            .catch((error) => {
                if (error.response?.status !== 404) {
                    console.error('Error fetching image:', error);
                }
            });
    }, [id, url]);

    // Function to fetch print limits
    const fetchPrintLimit = async (companyId: any) => {
        if (!companyId) return;
        setPrintLimit((prev: any) => ({ ...prev, isLoading: true }));
        try {
            const response = await axiosInstanceAuth.get(`/api/companies/${companyId}/printlimit`);
            setPrintLimit({
                limit: response.data.in_event_members_limit,
                printed: response.data.company_printed,
                isLoading: false,
            });
        } catch (error: any) {
            console.error("Error fetching print limit:", error);
            toast.error("Не удалось загрузить лимиты печати компании.");
            setPrintLimit({ limit: 0, printed: 0, isLoading: false });
        }
    };

    // Effect to fetch print limits when member data is available
    useEffect(() => {
        if (member?.company_id) {
            fetchPrintLimit(member.company_id);
        } else if (member) {
            setPrintLimit((prev: any) => ({ ...prev, isLoading: false }));
        }
    }, [member]);

    // Use the centralized validation function with useMemo for efficiency
    const { isValid: isPrintable, reasons: printBlockReasons } = useMemo(() => {
        if (!member) {
            return { isValid: false, reasons: ['Загрузка данных участника...'] };
        }
        return getPrintValidationStatus(member, printLimit);
    }, [member, printLimit]);

    const handlePrintBadge = async () => {
        if (!isPrintable) {
            toast.warn(`Печать невозможна: ${printBlockReasons.join(', ')}`);
            return;
        }

        try {
            const payloadResponse = await axiosInstanceAuth.get(`/api/members/${member.id}/badge-payload`);
            const badgeRequest = payloadResponse.data;

            if (!badgeRequest || Object.keys(badgeRequest).length === 0) {
                toast.error("Не удалось получить данные для печати с сервера.");
                return;
            }

            axios.post(`${printerUrl}/api/generate/badge?direct=true`, badgeRequest)
                .then(printResponse => {
                    axiosInstanceAuth.get(urlPrint)
                        .then(response => {
                            setMember((prevState: any) => ({
                                ...prevState,
                                print_count: prevState.print_count + 1
                            }));
                            toast.success(`Бейдж отправлен на печать`);
                            if (member.company_id) {
                                fetchPrintLimit(member.company_id);
                            }
                        })
                        .catch(error => {
                            toast.error("Бейдж напечатан, но не удалось обновить счетчик");
                        });
                })
                .catch(printError => {
                    console.error("Print Error:", printError.response?.data || printError.message);
                    const errorMessage = printError.response?.data?.message || "Ошибка печати бейджа";
                    toast.error(errorMessage);
                });

        } catch (error: any) {
            console.error("Error fetching badge payload:", error);
            toast.error(error.response?.data?.message || "Ошибка при получении данных для печати.");
        }
    };

    const fetchMemberPasses = async () => {
        if (!id) return;
        setIsLoadingPasses(true);
        try {
            const [passesResponse, gatesResponse] = await Promise.all([
                axiosInstanceAuth.get(`/api/members/${id}/memberPasses`),
                axiosInstanceAuth.get('/api/gates')
            ]);
            const passes = passesResponse.data || [];
            const gates = gatesResponse.data || [];
            const gateNameMap = new Map(gates.map((gate: any) => [gate.id, gate.name]));
            const enrichedPasses = passes.map((pass: any) => ({
                ...pass,
                gateName: gateNameMap.get(pass.gate_id) || `Неизвестная зона`,
                timestamp: new Date(pass.created_at).toLocaleString('ru-RU')
            }));
            setMemberPasses(enrichedPasses);
        } catch (error: any) {
            console.error("Error fetching pass history:", error);
            toast.error("Не удалось загрузить историю проходов.");
        } finally {
            setIsLoadingPasses(false);
        }
    };

    useEffect(() => {
        if (isPassesModalOpen) {
            fetchMemberPasses();
        }
    }, [isPassesModalOpen]);

    const handleRegenerateBarcode = () => {
        axiosInstanceAuth.post(urlNewBarcode)
            .then(response => {
                setMember((prevState: any) => ({
                    ...prevState,
                    barcode: response.data.barcode
                }));
                toast.success("Новый QR-код успешно сгенерирован!");
            })
            .catch(error => {
                toast.error("Ошибка при генерации нового QR-кода.");
                console.error("Barcode regeneration error:", error);
            });
    };

    const handleGiveBangle = () => {
        axiosInstanceAuth.get(urlBangle)
            .then(response => {
                setMember((prevState: any) => ({
                    ...prevState,
                    given_bangle: !prevState.given_bangle,
                    given_bangle_count: prevState.given_bangle_count + 1
                }));
                toast.success("Браслет выдан");
            })
            .catch(error => {
                toast.error("Ошибка выдачи браслета");
            });
    };

    if (!member) {
        return <div className="flex justify-center items-center h-screen"><Spinner label="Загрузка участника..." /></div>;
    }

    return (
        <>
            {!isPrintable && !printLimit.isLoading && (
                <div className="p-4 mx-6 mb-4 text-yellow-800 rounded-lg bg-yellow-100 dark:bg-gray-800 dark:text-yellow-300" role="alert">
                    <span className="font-bold">Печать заблокирована:</span> {printBlockReasons.join('; ')}
                </div>
            )}
            <ToastContainer theme="dark" position="bottom-right" />
            <Navbar position="static">
                <NavbarBrand>
                    <Button onClick={() => router.back()} variant="flat">Назад</Button>
                </NavbarBrand>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button color="primary" variant="flat" className='mr-1' onClick={handleGiveBangle}>
                            Браслет выдан {member.given_bangle_count} раз
                        </Button>
                        <Button
                            color="success"
                            variant="flat"
                            onClick={handlePrintBadge}
                            isDisabled={!isPrintable || printLimit.isLoading}
                            isLoading={printLimit.isLoading}
                        >
                            {printLimit.isLoading ? "Проверка..." : `Печать (${member.print_count})`}
                        </Button>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>
            <div className="flex w-full flex-wrap flex-1 flex-col gap-3 px-6 py-2">
                {imagePreview && (
                    <div className="flex justify-center mb-4">
                        <img src={imagePreview} alt="Фото участника" className="max-w-full h-auto rounded-lg shadow-md" style={{ maxHeight: '400px', width: 'auto' }} />
                    </div>
                )}
                <div className="flex flex-row w-full gap-3">
                    <Input isReadOnly size="lg" label="Фамилия" value={member.surname} />
                    <Input isReadOnly size="lg" label="Имя" value={member.name} />
                    <Input isReadOnly size="lg" label="Отчество" value={member.middlename} />
                </div>
                <Input label="Компания" value={member.company_name} isReadOnly fullWidth size="lg" />
                <div className="flex flex-row w-full gap-3 items-center">
                    <Input isReadOnly fullWidth size="lg" label="Серия и номер паспорта" value={member.document} />
                    <Input isReadOnly fullWidth size="lg" value={member.birth} label="Дата рождения" name="birth" />
                    <Switch isSelected={member.responsible} isReadOnly>Ответственный</Switch>
                </div>
                {member.accreditation && <Input label="Аккредитация участника" value={member.accreditation.name || ''} isReadOnly fullWidth size="lg" />}

                {member.events?.length > 0 && (
                    <>
                        Мероприятия:
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {member.events.map((event: any) => (
                                <Checkbox key={event.id} isReadOnly isSelected defaultSelected>{event.name}</Checkbox>
                            ))}
                        </div>
                    </>
                )}

                {member.accreditation?.gates?.length > 0 && (
                    <>
                        Доступные зоны (по аккредитации):
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {member.accreditation.gates.map((gate: any) => (
                                <Checkbox key={gate.id} isReadOnly isSelected defaultSelected>{gate.name}</Checkbox>
                            ))}
                        </div>
                    </>
                )}
                {member.gates?.length > 0 && (
                    <>
                        Дополнительные зоны:
                        <div className="flex flex-wrap gap-4 max-w-full">
                            {member.gates.map((gate: any) => (
                                <Checkbox key={gate.id} isReadOnly isSelected defaultSelected>{gate.name}</Checkbox>
                            ))}
                        </div>
                    </>
                )}
                <div className="flex flex-row w-full gap-3 items-center mt-4">
                    <Button color="warning" variant="flat" onClick={onBarcodeModalOpen}>Новый QR</Button>
                    <Button color="secondary" variant="flat" onPress={onPassesModalOpen}>Проходы</Button>
                    <div className="flex flex-row items-center gap-2 ml-auto">
                        <Input label="Printer API URL" value={tempPrinterUrl} onValueChange={setTempPrinterUrl} size="sm" />
                        <Button isIconOnly color="primary" onPress={() => {
                            localStorage.setItem('printerApiUrl', tempPrinterUrl);
                            setPrinterUrl(tempPrinterUrl);
                            toast.success(`Printer URL сохранен`);
                        }}>
                            ✓
                        </Button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isBarcodeModalOpen} onOpenChange={onBarcodeModalOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Сгенерировать новый QR-код?</ModalHeader>
                            <ModalBody>
                                <p>Вы уверены, что хотите сгенерировать новый QR-код для участника? Старый QR-код перестанет действовать.</p>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>Нет</Button>
                                <Button color="primary" onPress={() => { handleRegenerateBarcode(); onClose(); }}>Да</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal isOpen={isPassesModalOpen} onOpenChange={onPassesModalOpenChange} scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">История проходов</ModalHeader>
                            <ModalBody>
                                {isLoadingPasses ? (
                                    <div className="flex justify-center items-center h-40"><Spinner label="Загрузка..." /></div>
                                ) : memberPasses.length > 0 ? (
                                    <ul className="list-none p-0 m-0">
                                        {memberPasses.map((pass: any) => (
                                            <li key={pass.id} className="flex justify-between items-center py-3 border-b border-default-200 last:border-b-0">
                                                <span className="font-semibold">{pass.gateName}</span>
                                                <span className="text-sm text-default-500">{pass.timestamp}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>Проходов еще не было.</p>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>Закрыть</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};

export default Member;