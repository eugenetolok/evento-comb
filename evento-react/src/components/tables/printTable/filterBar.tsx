'use client';
import React from "react";
import { Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem } from "@heroui/react";
import { SearchIcon, ChevronDownIcon } from "@/components/icons";
import { capitalize } from "./utils";

type FilterBarProps = {
    filterValue: string;
    visibleColumns: any;
    onRowsPerPageChange: (e: any) => void;
    onSearchChange: (value: any) => void;
    onClear: () => void;
    setVisibleColumns: (keys: any) => void;
    columns: any[];
    totalItems: number;
    CustomAddComponent: React.ComponentType<any>;
    customAddComponentAction: (...args: any[]) => void;
    rowsPerPage: number;
};

export default function FilterBar({
    filterValue,
    visibleColumns,
    onRowsPerPageChange,
    onSearchChange,
    onClear,
    setVisibleColumns,
    columns,
    totalItems, // <-- This prop is what we should use for the count
    CustomAddComponent,
    customAddComponentAction,
    rowsPerPage
}: FilterBarProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-3 items-end">
                <Input
                    autoFocus
                    isClearable
                    className="w-full sm:max-w-[44%]"
                    placeholder="Поиск..."
                    startContent={<SearchIcon />}
                    value={filterValue}
                    onClear={() => onClear()}
                    onValueChange={onSearchChange}
                />
                <div className="flex sm:flex-row flex-col gap-3 w-full sm:w-auto">
                    <Dropdown>
                        <DropdownTrigger>
                            <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                                Столбцы
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            disallowEmptySelection
                            aria-label="Table Columns"
                            closeOnSelect={false}
                            selectedKeys={visibleColumns}
                            selectionMode="multiple"
                            onSelectionChange={setVisibleColumns}
                        >
                            {columns.map((column: any) => (
                                <DropdownItem key={column.uid} className="capitalize">
                                    {capitalize(column.name)}
                                </DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>
                    <CustomAddComponent action={customAddComponentAction} />
                </div>
            </div>
            <div className="flex justify-between items-center">
                {/* Use totalItems here */}
                <span className="text-default-400 text-small">Всего объектов: {totalItems}</span>
                <label className="flex items-center text-default-400 text-small">
                    Строк на странице:
                    <select
                        className="bg-transparent outline-none text-default-400 text-small"
                        onChange={onRowsPerPageChange}
                        value={rowsPerPage}
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="250">250</option>
                        <option value="500">500</option>
                        {/* <option value="-1">Все</option> */}
                    </select>
                </label>
            </div>
        </div>
    );
}
