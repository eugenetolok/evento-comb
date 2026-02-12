import React, { useState, useEffect } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input } from "@heroui/react";

const columns = [
    { key: "name", label: "Название" },
    { key: "amount", label: "Количество" }
];

type SelectItemsTableProps = {
    items: any[];
    onInputChange: (values: Record<string, number | "">) => void;
    initialValues?: Record<string, number | "">;
    isReadOnly?: boolean;
};

const SelectItemsTable = ({ items, onInputChange, initialValues = {}, isReadOnly = false }: SelectItemsTableProps) => {
    // Convert initial values to a local state that can be controlled
    const [values, setValues] = useState<any>(initialValues || {});

    // Effect to update local state when initial values change externally
    useEffect(() => {
        setValues(initialValues || {});
    }, [initialValues]);

    // const handleInputChange = (e, item) => {
    //     const { value } = e.target;
    //     const newValue = value === '' ? '' : parseInt(value, 10);
    //     const updatedValues = { ...values, [item.id]: newValue };
    //     setValues(updatedValues);
    //     onInputChange(updatedValues);
    // };

    const handleInputChange = (e: any, item: any) => {
        const { value } = e.target;
        const newValue = value === '' ? '' : parseInt(value, 10);
        const updatedValues = { ...values, [item.id]: newValue };
        setValues(updatedValues);
        onInputChange(updatedValues);
    };

    const handleKeyDown = (e: any) => {
        if (!/[0-9]/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
            e.preventDefault();
        }
    };

    return (
        <Table aria-label="Selectable Items Table">
            <TableHeader>
                {columns.map(column => (
                    <TableColumn key={column.key}>{column.label}</TableColumn>
                ))}
            </TableHeader>
            <TableBody>
                {items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                            <Input
                                isReadOnly={isReadOnly}
                                type="text" // type="number" could also work but it can be problematic for control
                                value={(values || {})[item.id] || ''}
                                onChange={e => handleInputChange(e, item)}
                                onKeyDown={handleKeyDown}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default SelectItemsTable;
