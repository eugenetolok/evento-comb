'use client';
import React, { useEffect, useState, useCallback } from "react";
import Table from "@/components/tables/universal/table";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddBadgeTemplateModal from "@/components/popups/newBadgeTemplate";
import { useRouter } from '@/shared/router';
import { Switch } from "@heroui/react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const columns = [
    { name: "ID", uid: "id", sortable: true },
    { name: "Название шаблона", uid: "name", sortable: true },
    { name: "По-умолчанию", uid: "is_default" },
];

const INITIAL_VISIBLE_COLUMNS = ["name", "is_default"];

export default function App() {
    const router = useRouter();
    const [templates, setTemplates] = useState<any>([]);

    const fetchTemplates = useCallback(async () => {
        try {
            const response = await axiosInstanceAuth.get("/api/badges");
            setTemplates(response.data.map((item: any) => ({ ...item, key: item.id })));
        } catch (error: any) {
            console.error("Error fetching badge templates:", error);
            toast.error("Ошибка при загрузке шаблонов");
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleDefaultChange = async (template: any, isSelected: any) => {
        const originalTemplates = [...templates];
        // Optimistic update
        setTemplates((prev: any) => prev.map((t: any) => t.id === template.id ? { ...t, is_default: isSelected } : { ...t, is_default: false }));

        try {
            await axiosInstanceAuth.put(`/api/badges/${template.id}`, { ...template, is_default: isSelected });
            toast.success("Статус по-умолчанию обновлен");
            fetchTemplates(); // Re-fetch to confirm state
        } catch (error: any) {
            console.error("Error updating default status:", error);
            toast.error("Не удалось обновить статус");
            setTemplates(originalTemplates); // Revert on error
        }
    };

    const renderCell = useCallback((template: any, columnKey: any) => {
        const cellValue = template[columnKey];

        switch (columnKey) {
            case "is_default":
                return (
                    <Switch
                        isSelected={cellValue}
                        onValueChange={(isSelected) => handleDefaultChange(template, isSelected)}
                    />
                );
            default:
                return cellValue;
        }
    }, [templates]);

    return (
        <div>
            <h1 className="text-3xl mb-5">Шаблоны бейджей</h1>
            <Table
                tableItems={templates}
                columns={columns}
                INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
                renderCell={renderCell}
                CustomAddComponent={AddBadgeTemplateModal}
                customAddComponentAction={fetchTemplates}
                onRowClick={(item) => { router.push(`/dashboard/admin/badges/${item.id}`) }}
            />
        </div>
    );
}