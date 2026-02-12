'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Table as NextUITable,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
import debounce from "lodash.debounce";

import FilterBar from "./filterBar";
import TableFooter from "./tableFooter";

type UniversalTableProps = {
    tableItems?: any[];
    columns?: any[];
    INITIAL_VISIBLE_COLUMNS?: any[];
    renderCell?: (item: any, columnKey: any) => React.ReactNode;
    CustomAddComponent?: React.ComponentType<any>;
    customAddComponentAction?: (...args: any[]) => void;
    searchColumns?: string[];
    selectionMode?: any;
    onRowClick?: (item: any) => void;
    controlledSelectedKeys?: Iterable<any> | "all";
    onSelectedKeysChange?: (keys: any[]) => void;
    onFilteredItemsChange?: (items: any[]) => void;
    tableHeight?: string;
};

const Table = React.memo((props: UniversalTableProps) => {
    const {
        tableItems = [],
        columns = [],
        INITIAL_VISIBLE_COLUMNS = [],
        renderCell = () => null,
        CustomAddComponent = () => <></>,
        customAddComponentAction = () => undefined,
        searchColumns = ["name"],
        selectionMode = "none",
        onRowClick,
        controlledSelectedKeys,
        onSelectedKeysChange,
        onFilteredItemsChange,
    } = props;

    const path = typeof window !== "undefined" ? window.location.pathname : "";

    const getInitialRowsPerPage = useCallback(() => {
        if (typeof window !== "undefined") {
            const savedRowsPerPage = localStorage.getItem(`${path}_rowsPerPage`);
            return savedRowsPerPage ? Number(savedRowsPerPage) : 10;
        }
        return 10;
    }, [path]);

    const [filterValue, setFilterValue] = useState<string>("");
    const [selectedKeys, setSelectedKeys] = useState<Set<any>>(new Set(Array.from(controlledSelectedKeys || [])));
    const [visibleColumns, setVisibleColumns] = useState<any>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [rowsPerPage, setRowsPerPage] = useState<number>(getInitialRowsPerPage);
    const [sortDescriptor, setSortDescriptor] = useState<any>({});
    const [page, setPage] = useState<number>(1);

    const hasSearchFilter = Boolean(filterValue);

    useEffect(() => {
        setRowsPerPage(getInitialRowsPerPage());
    }, [path, getInitialRowsPerPage]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(`${path}_rowsPerPage`, String(rowsPerPage));
        }
    }, [rowsPerPage, path]);

    useEffect(() => {
        if (controlledSelectedKeys) {
            setSelectedKeys(new Set(Array.from(controlledSelectedKeys)));
        }
    }, [controlledSelectedKeys]);

    useEffect(() => {
        if (onSelectedKeysChange && selectedKeys.size > 0) {
            onSelectedKeysChange(Array.from(selectedKeys));
        }
    }, [selectedKeys, onSelectedKeysChange]);

    const handleSelectionChange = useCallback(
        (keys: any) => {
            const normalizedKeys = keys === "all" ? new Set(tableItems.map((item) => item?.key)) : new Set(keys);
            setSelectedKeys(normalizedKeys);
            if (onSelectedKeysChange) {
                onSelectedKeysChange(Array.from(normalizedKeys));
            }
        },
        [onSelectedKeysChange, tableItems],
    );

    const headerColumns = useMemo(() => {
        if (visibleColumns === "all") return columns;
        return columns.filter((column: any) => visibleColumns.has(column.uid));
    }, [visibleColumns, columns]);

    const filteredItems = useMemo(() => {
        let filteredTableItems = [...tableItems];
        if (hasSearchFilter) {
            const searchWords = filterValue.toLowerCase().split(" ");
            filteredTableItems = filteredTableItems.filter((item: any) =>
                searchWords.every((word) =>
                    searchColumns.some((column) => String(item?.[column] ?? "").toLowerCase().includes(word)),
                ),
            );
        }
        return filteredTableItems;
    }, [tableItems, filterValue, searchColumns, hasSearchFilter]);

    const filteredItemsRef = useRef<any[]>([]);

    useEffect(() => {
        filteredItemsRef.current = filteredItems;
    }, [filteredItems]);

    useEffect(() => {
        const debouncedSendFilteredItems = debounce(() => {
            if (onFilteredItemsChange) {
                onFilteredItemsChange(filteredItemsRef.current);
            }
        }, 500);

        debouncedSendFilteredItems();

        return () => {
            debouncedSendFilteredItems.cancel();
        };
    }, [onFilteredItemsChange, filteredItems]);

    const pages = rowsPerPage === -1 ? 1 : Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));

    const items = useMemo(() => {
        if (rowsPerPage === -1) {
            return filteredItems;
        }
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);

    const sortedItems = useMemo(() => {
        if (!sortDescriptor?.column) {
            return items;
        }
        return [...items].sort((a: any, b: any) => {
            const first = a?.[sortDescriptor.column];
            const second = b?.[sortDescriptor.column];
            const cmp = first < second ? -1 : first > second ? 1 : 0;
            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);

    const onNextPage = useCallback(() => {
        if (page < pages) {
            setPage(page + 1);
        }
    }, [page, pages]);

    const onPreviousPage = useCallback(() => {
        if (page > 1) {
            setPage(page - 1);
        }
    }, [page]);

    const onRowsPerPageChange = useCallback((e: any) => {
        setRowsPerPage(Number(e.target.value));
        setPage(1);
    }, []);

    const onSearchChange = useCallback((value: any) => {
        setFilterValue(value || "");
        setPage(1);
    }, []);

    const onClear = useCallback(() => {
        setFilterValue("");
        setPage(1);
    }, []);

    return (
        <NextUITable
            aria-label="Universal table"
            isHeaderSticky
            bottomContent={
                <TableFooter
                    selectedKeys={selectedKeys}
                    filteredItems={filteredItems}
                    pages={pages}
                    page={page}
                    setPage={setPage}
                    onPreviousPage={onPreviousPage}
                    onNextPage={onNextPage}
                />
            }
            bottomContentPlacement="outside"
            classNames={{
                wrapper: "max-h-full",
            }}
            selectedKeys={selectedKeys}
            selectionMode={selectionMode}
            sortDescriptor={sortDescriptor}
            topContent={
                <FilterBar
                    filterValue={filterValue}
                    visibleColumns={visibleColumns}
                    onRowsPerPageChange={onRowsPerPageChange}
                    onSearchChange={onSearchChange}
                    onClear={onClear}
                    setVisibleColumns={setVisibleColumns}
                    columns={columns}
                    tableItems={tableItems}
                    CustomAddComponent={CustomAddComponent}
                    customAddComponentAction={customAddComponentAction}
                    rowsPerPage={rowsPerPage}
                />
            }
            topContentPlacement="outside"
            onSelectionChange={handleSelectionChange}
            onSortChange={setSortDescriptor}
        >
            <TableHeader columns={headerColumns}>
                {(column: any) => (
                    <TableColumn
                        key={column.uid}
                        align={column.uid === "actions" ? "center" : "start"}
                        allowsSorting={column.sortable}
                    >
                        {column.name}
                    </TableColumn>
                )}
            </TableHeader>
            <TableBody emptyContent={"Ничего не найдено"} items={sortedItems}>
                {(item: any) => (
                    <TableRow key={item.key} className={onRowClick ? "cursor-pointer" : ""}>
                        {(columnKey: any) => (
                            <TableCell onClick={() => (onRowClick ? onRowClick(item) : undefined)}>
                                {renderCell(item, columnKey)}
                            </TableCell>
                        )}
                    </TableRow>
                )}
            </TableBody>
        </NextUITable>
    );
});

Table.displayName = "Table";

export default Table;

