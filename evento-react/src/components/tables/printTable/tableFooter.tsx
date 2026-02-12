'use client';
import React from "react";
import { Button, Pagination } from "@heroui/react";

type TableFooterProps = {
    selectedKeys: any;
    filteredItemsLength: number;
    pages: number;
    page: number;
    setPage: (page: number) => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
};

export default function TableFooter({
    selectedKeys, // This is a Set
    filteredItemsLength, // Total items after filtering, before pagination
    pages,
    page,
    setPage,
    onPreviousPage,
    onNextPage,
}: TableFooterProps) {
    const selectedCount = selectedKeys instanceof Set ? selectedKeys.size : 0;

    return (
        <div className="py-2 px-2 flex justify-between items-center">
            <span className="w-[30%] text-small text-default-400">
                {selectedKeys === "all" // This case should not happen if universal table translates "all"
                    ? "Все объекты выделены" // This string indicates an issue if it appears
                    : `${selectedCount} из ${filteredItemsLength} выделены`}
            </span>
            {pages > 1 && (
                <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={page}
                    total={pages}
                    onChange={setPage}
                />
            )}
            <div className="hidden sm:flex w-[30%] justify-end gap-2">
                <Button isDisabled={pages === 1 || page === 1} size="sm" variant="flat" onPress={onPreviousPage}>
                    Назад
                </Button>
                <Button isDisabled={pages === 1 || page === pages} size="sm" variant="flat" onPress={onNextPage}>
                    Вперёд
                </Button>
            </div>
        </div>
    );
}
