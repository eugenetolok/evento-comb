'use client';

import React, { useMemo, useState, useEffect } from "react";
import { Button, Card, CardBody, CardHeader, Checkbox, Chip, Select, SelectItem, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Textarea } from "@heroui/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { axiosInstanceAuth } from "@/axiosConfig";

type OutputMode = "auto" | "table" | "xlsx";

type SchemaView = {
	name: string;
	description: string;
	columns: string[];
};

type SchemaResponse = {
	enabled: boolean;
	max_rows: number;
	views: SchemaView[];
};

type QueryResponse = {
	prompt: string;
	title: string;
	sql: string;
	output_mode: "table" | "xlsx";
	columns: string[];
	rows: Record<string, unknown>[];
	row_count: number;
	unlimited?: boolean;
	human_readable?: boolean;
	generated_at: string;
};

type HistoryItem = {
	id: string;
	prompt: string;
	status: "ok" | "error";
	outputMode: "table" | "xlsx";
	rowCount?: number;
	createdAt: string;
	error?: string;
};

type ResultTableRow = Record<string, unknown> & {
	__rowKey: string;
};

const outputModeOptions: { key: OutputMode; label: string }[] = [
	{ key: "auto", label: "Авто" },
	{ key: "table", label: "Таблица" },
	{ key: "xlsx", label: "XLSX" },
];

const suggestedPrompts = [
	"Покажи топ-10 компаний по числу участников",
	"Сколько участников заблокировано по каждой компании",
	"Сделай выгрузку xlsx по автомобилям без пропуска",
	"Покажи количество проходов по зонам за последние сутки",
];

function generateClientId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function decodeArrayBufferToText(payload: ArrayBuffer): string {
	return new TextDecoder("utf-8").decode(payload);
}

function extractErrorMessage(raw: string): string {
	try {
		const parsed = JSON.parse(raw) as { error?: unknown };
		if (typeof parsed.error === "string" && parsed.error.trim() !== "") {
			return parsed.error;
		}
	} catch (error) {
		// Ignore parse errors and return raw body.
	}
	return raw;
}

function parseFilenameFromDisposition(disposition: string | undefined): string {
	if (!disposition) {
		return `ai_query_${Date.now()}.xlsx`;
	}
	const match = disposition.match(/filename="?([^"]+)"?/i);
	return match?.[1] || `ai_query_${Date.now()}.xlsx`;
}

function downloadBlob(bytes: ArrayBuffer, fileName: string) {
	const blob = new Blob([bytes], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
}

export default function AdminAIAssistantPage() {
	const [schema, setSchema] = useState<SchemaResponse | null>(null);
	const [prompt, setPrompt] = useState<string>("");
	const [outputMode, setOutputMode] = useState<OutputMode>("auto");
	const [humanReadable, setHumanReadable] = useState<boolean>(true);
	const [unlimited, setUnlimited] = useState<boolean>(false);
	const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(true);
	const [isRunning, setIsRunning] = useState<boolean>(false);
	const [isExporting, setIsExporting] = useState<boolean>(false);
	const [showSQL, setShowSQL] = useState<boolean>(false);
	const [lastResult, setLastResult] = useState<QueryResponse | null>(null);
	const [history, setHistory] = useState<HistoryItem[]>([]);

	useEffect(() => {
		const loadSchema = async () => {
			setIsLoadingSchema(true);
			try {
				const response = await axiosInstanceAuth.get<SchemaResponse>("/api/ai-assistant/schema");
				setSchema(response.data);
			} catch (error) {
				toast.error("Не удалось загрузить конфигурацию AI-ассистента");
			} finally {
				setIsLoadingSchema(false);
			}
		};
		loadSchema();
	}, []);

	const canRun = useMemo(() => {
		return prompt.trim().length > 0 && !isRunning && schema?.enabled === true;
	}, [prompt, isRunning, schema]);
	const tableRows = useMemo<ResultTableRow[]>(
		() =>
			(lastResult?.rows || []).map((row, index) => ({
				...row,
				__rowKey: `row-${index}`,
			}) as ResultTableRow),
		[lastResult],
	);

	const addHistory = (item: HistoryItem) => {
		setHistory((prev) => [item, ...prev].slice(0, 20));
	};

	const handleRunQuery = async () => {
		const promptValue = prompt.trim();
		if (!promptValue) {
			toast.error("Введите запрос для ассистента");
			return;
		}
		setIsRunning(true);
		try {
			const response = await axiosInstanceAuth.post<ArrayBuffer>(
				"/api/ai-assistant/query",
				{
					prompt: promptValue,
					output_mode: outputMode,
					unlimited,
					human_readable: humanReadable,
				},
				{
					responseType: "arraybuffer",
					validateStatus: () => true,
				},
			);

			const contentType = String(response.headers["content-type"] || "");
			const nowIso = new Date().toISOString();

			if (response.status >= 400) {
				const text = extractErrorMessage(decodeArrayBufferToText(response.data));
				addHistory({
					id: generateClientId(),
					prompt: promptValue,
					status: "error",
					outputMode: "table",
					createdAt: nowIso,
					error: text,
				});
				toast.error(text || "Запрос не выполнен");
				return;
			}

			if (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
				const fileName = parseFilenameFromDisposition(String(response.headers["content-disposition"] || ""));
				downloadBlob(response.data, fileName);
				addHistory({
					id: generateClientId(),
					prompt: promptValue,
					status: "ok",
					outputMode: "xlsx",
					createdAt: nowIso,
				});
				toast.success("XLSX выгрузка сформирована");
				return;
			}

			const text = decodeArrayBufferToText(response.data);
			const parsed = JSON.parse(text) as QueryResponse;
			setLastResult(parsed);
			setShowSQL(false);
			addHistory({
				id: generateClientId(),
				prompt: promptValue,
				status: "ok",
				outputMode: parsed.output_mode,
				rowCount: parsed.row_count,
				createdAt: nowIso,
			});
		} catch (error) {
			toast.error("Ошибка выполнения AI-запроса");
		} finally {
			setIsRunning(false);
		}
	};

	const handleExportLastResult = async () => {
		if (!lastResult) {
			return;
		}

		setIsExporting(true);
		try {
			const response = await axiosInstanceAuth.post<ArrayBuffer>(
				"/api/ai-assistant/export",
				{
					sql: lastResult.sql,
					title: lastResult.title || "ai_export",
					unlimited: Boolean(lastResult.unlimited ?? unlimited),
					human_readable: Boolean(lastResult.human_readable ?? humanReadable),
				},
				{
					responseType: "arraybuffer",
					validateStatus: () => true,
				},
			);

			if (response.status >= 400) {
				const text = extractErrorMessage(decodeArrayBufferToText(response.data));
				toast.error(text || "Не удалось сформировать XLSX");
				return;
			}

			const fileName = parseFilenameFromDisposition(String(response.headers["content-disposition"] || ""));
			downloadBlob(response.data, fileName);
			toast.success("XLSX выгрузка скачана");
		} catch (error) {
			toast.error("Ошибка при выгрузке XLSX");
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="space-y-4">
			<ToastContainer theme="dark" />
			<Card className="border border-divider">
				<CardHeader className="flex flex-col items-start gap-1">
					<h1 className="text-3xl font-bold">AI Assistant</h1>
					<p className="text-default-500 text-sm">
						Запрос к базе на естественном языке. Ассистент генерирует только SELECT SQL и выполняет его в read-only режиме.
					</p>
				</CardHeader>
				<CardBody className="space-y-4">
					{isLoadingSchema ? (
						<div className="py-3">
							<Spinner label="Загрузка конфигурации ассистента..." />
						</div>
					) : null}

					{!isLoadingSchema && schema ? (
						<div className="flex flex-wrap gap-2">
							<Chip color={schema.enabled ? "success" : "danger"} variant="flat">
								{schema.enabled ? "Включён" : "Выключен"}
							</Chip>
							<Chip variant="flat">Лимит по умолчанию: {schema.max_rows}</Chip>
						</div>
					) : null}

					<div className="flex flex-wrap gap-2">
						{suggestedPrompts.map((item) => (
							<Button key={item} size="sm" variant="flat" onClick={() => setPrompt(item)}>
								{item}
							</Button>
						))}
					</div>

					<Textarea
						label="Запрос к ассистенту"
						minRows={4}
						placeholder="Например: покажи топ-20 компаний по количеству автомобилей и выгрузи в xlsx"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
					/>

					<div className="flex flex-wrap gap-2 items-end">
						<div className="w-full sm:w-[220px]">
							<Select
								label="Формат ответа"
								selectedKeys={new Set([outputMode])}
								onSelectionChange={(keys) => {
									const value = Array.from(keys)[0];
									if (value === "auto" || value === "table" || value === "xlsx") {
										setOutputMode(value);
									}
								}}
							>
								{outputModeOptions.map((item) => (
									<SelectItem key={item.key}>{item.label}</SelectItem>
								))}
							</Select>
						</div>
						<div className="flex flex-col gap-2 pb-1">
							<Checkbox isSelected={humanReadable} onValueChange={setHumanReadable}>
								Человекочитаемый вывод
							</Checkbox>
							<Checkbox isSelected={unlimited} onValueChange={setUnlimited}>
								Без лимита строк (для больших отчётов)
							</Checkbox>
						</div>
						<Button color="primary" onClick={handleRunQuery} isLoading={isRunning} isDisabled={!canRun}>
							Выполнить
						</Button>
					</div>
				</CardBody>
			</Card>

			{lastResult ? (
				<Card className="border border-divider">
					<CardHeader className="flex flex-col items-start gap-1">
						<div className="w-full flex flex-wrap items-center justify-between gap-2">
							<div>
								<div className="text-lg font-semibold">Результат</div>
								<div className="text-sm text-default-500">Строк: {lastResult.row_count}</div>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="flat" onClick={handleExportLastResult} isLoading={isExporting}>
									Скачать XLSX
								</Button>
								<Button size="sm" variant="light" onClick={() => setShowSQL((value) => !value)}>
									{showSQL ? "Скрыть SQL" : "Показать SQL"}
								</Button>
							</div>
						</div>
						{showSQL ? (
							<code className="text-xs break-all bg-default-100 px-2 py-1 rounded-md">{lastResult.sql}</code>
						) : null}
					</CardHeader>
					<CardBody className="overflow-auto">
						<Table removeWrapper aria-label="AI SQL Result">
							<TableHeader columns={lastResult.columns.map((column) => ({ key: column, label: column }))}>
								{(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
							</TableHeader>
							<TableBody>
								{tableRows.map((row) => (
									<TableRow key={row.__rowKey}>
										{lastResult.columns.map((column) => (
											<TableCell key={column}>{String(row[column] ?? "")}</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardBody>
				</Card>
			) : null}

			<Card className="border border-divider">
				<CardHeader>История запросов</CardHeader>
				<CardBody className="space-y-2">
					{history.length === 0 ? (
						<div className="text-default-500 text-sm">Пока нет выполненных запросов.</div>
					) : (
						history.map((item) => (
							<div key={item.id} className="rounded-lg border border-divider px-3 py-2">
								<div className="flex flex-wrap gap-2 mb-1">
									<Chip size="sm" color={item.status === "ok" ? "success" : "danger"} variant="flat">
										{item.status === "ok" ? "OK" : "ERROR"}
									</Chip>
									<Chip size="sm" variant="flat">{item.outputMode.toUpperCase()}</Chip>
									{typeof item.rowCount === "number" ? <Chip size="sm" variant="flat">Rows: {item.rowCount}</Chip> : null}
									<Chip size="sm" variant="flat">{new Date(item.createdAt).toLocaleString("ru-RU")}</Chip>
								</div>
								<div className="text-sm font-medium">{item.prompt}</div>
								{item.error ? <div className="text-sm text-danger">{item.error}</div> : null}
							</div>
						))
					)}
				</CardBody>
			</Card>
		</div>
	);
}
