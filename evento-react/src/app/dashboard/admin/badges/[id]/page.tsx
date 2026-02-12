'use client';
import React, { useState, useEffect } from "react";
import { Input, Switch, Textarea } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import SimpleNavbar from '@/components/toolbars/simple';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from "@/shared/router";
import { handleDelete } from "@/components/utils/delete";

const EditBadgeTemplate = ({ params }: any) => {
    const { id } = params;
    const router = useRouter();
    const [template, setTemplate] = useState<any>({
        name: "",
        template_json: "",
        is_default: false,
    });

    useEffect(() => {
        if (id) {
            axiosInstanceAuth.get(`/api/badges/${id}`)
                .then(response => {
                    setTemplate(response.data);
                })
                .catch(error => {
                    console.error("Error fetching template:", error);
                    toast.error("Не удалось загрузить шаблон");
                    router.back();
                });
        }
    }, [id, router]);

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setTemplate((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleDefaultChange = (isSelected: any) => {
        setTemplate((prev: any) => ({ ...prev, is_default: isSelected }));
    };

    const handleSave = () => {
        try {
            // Basic JSON validation before sending
            JSON.parse(template.template_json);
        } catch (e) {
            toast.error("Ошибка: Неверный формат JSON.");
            return;
        }

        axiosInstanceAuth.put(`/api/badges/${id}`, template)
            .then(response => {
                toast.success('Шаблон успешно сохранен');
            })
            .catch(error => {
                toast.error('Ошибка при сохранении шаблона');
                console.log(error);
            });
    };

    return (
        <>
            <ToastContainer theme="dark" />
            <SimpleNavbar
                title="Редактирование шаблона бейджа"
                deleteHandler={() => handleDelete({ path: 'badges', id: id, router: router })}
                saveHandler={handleSave}
            />
            <div className="flex flex-wrap flex-1 flex-col gap-4 px-6 py-2">
                <Input
                    clearable
                    bordered
                    fullWidth
                    size="lg"
                    label="Название шаблона"
                    isRequired
                    name="name"
                    value={template.name}
                    onChange={handleInputChange}
                />
                <Textarea
                    label="JSON шаблона"
                    name="template_json"
                    value={template.template_json}
                    onChange={handleInputChange}
                    minRows={20}
                    maxRows={40}
                    placeholder="Введите JSON..."
                    className="font-mono"
                />
                <Switch
                    isSelected={template.is_default}
                    onValueChange={handleDefaultChange}
                >
                    Использовать по-умолчанию
                </Switch>
            </div>
        </>
    );
};

export default EditBadgeTemplate;