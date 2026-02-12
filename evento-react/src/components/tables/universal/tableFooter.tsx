'use client';
import React from "react";
import { Button, Pagination } from "@heroui/react";

type TableFooterProps = {
    selectedKeys: any;
    filteredItems: any[];
    pages: number;
    page: number;
    setPage: (page: number) => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
};

export default function TableFooter({
    selectedKeys,
    filteredItems,
    pages,
    page,
    setPage,
    onPreviousPage,
    onNextPage,
}: TableFooterProps) {
    return (
        <div className="py-2 px-2 flex justify-between items-center">
            <span className="w-[30%] text-small text-default-400">
                {selectedKeys === "all"
                    ? "Все объекты выделены"
                    : `${selectedKeys.size} из ${filteredItems.length} выделены`}
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
                <Button isDisabled={pages === 1} size="sm" variant="flat" onPress={onPreviousPage}>
                    Назад
                </Button>
                <Button isDisabled={pages === 1} size="sm" variant="flat" onPress={onNextPage}>
                    Вперёд
                </Button>
            </div>
        </div>
    );
}
