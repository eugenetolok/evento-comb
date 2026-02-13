'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Spinner, Tab, Tabs, Textarea } from "@heroui/react";
import { ToastContainer, toast } from "react-toastify";

import { axiosInstanceAuth } from "@/axiosConfig";

type EmailTemplate = {
	key: string;
	name: string;
	description: string;
	subject: string;
	body: string;
	variables: string[];
};

type TemplateDraft = {
	subject: string;
	body: string;
};

export default function AdminEmailTemplatesPage() {
	const [templates, setTemplates] = useState<EmailTemplate[]>([]);
	const [activeKey, setActiveKey] = useState<string>("");
	const [drafts, setDrafts] = useState<Record<string, TemplateDraft>>({});
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isResetting, setIsResetting] = useState<boolean>(false);

	const activeTemplate = useMemo(
		() => templates.find((item) => item.key === activeKey) ?? null,
		[templates, activeKey],
	);

	const activeDraft = activeKey ? drafts[activeKey] : undefined;

	const loadTemplates = async () => {
		setIsLoading(true);
		try {
			const response = await axiosInstanceAuth.get<EmailTemplate[]>("/api/email-templates");
			const items = Array.isArray(response.data) ? response.data : [];
			setTemplates(items);

			const nextDrafts: Record<string, TemplateDraft> = {};
			for (const item of items) {
				nextDrafts[item.key] = {
					subject: item.subject,
					body: item.body,
				};
			}
			setDrafts(nextDrafts);
			if (items.length > 0) {
				setActiveKey((prev) => (prev && nextDrafts[prev] ? prev : items[0].key));
			}
		} catch (error) {
			toast.error("Не удалось загрузить email-шаблоны");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadTemplates();
	}, []);

	const updateDraft = (key: string, patch: Partial<TemplateDraft>) => {
		setDrafts((prev) => ({
			...prev,
			[key]: {
				subject: prev[key]?.subject ?? "",
				body: prev[key]?.body ?? "",
				...patch,
			},
		}));
	};

	const handleSave = async () => {
		if (!activeTemplate || !activeDraft) {
			return;
		}
		if (activeDraft.subject.trim() === "" || activeDraft.body.trim() === "") {
			toast.error("Тема и HTML-шаблон обязательны");
			return;
		}

		setIsSaving(true);
		try {
			const response = await axiosInstanceAuth.put<EmailTemplate>(`/api/email-templates/${activeTemplate.key}`, {
				subject: activeDraft.subject,
				body: activeDraft.body,
			});

			setTemplates((prev) =>
				prev.map((item) => (item.key === activeTemplate.key ? response.data : item)),
			);
			setDrafts((prev) => ({
				...prev,
				[activeTemplate.key]: {
					subject: response.data.subject,
					body: response.data.body,
				},
			}));
			toast.success("Шаблон сохранён");
		} catch (error) {
			toast.error("Не удалось сохранить шаблон");
		} finally {
			setIsSaving(false);
		}
	};

	const handleReset = async () => {
		if (!activeTemplate) {
			return;
		}
		setIsResetting(true);
		try {
			const response = await axiosInstanceAuth.post<EmailTemplate>(`/api/email-templates/${activeTemplate.key}/reset`);
			setTemplates((prev) =>
				prev.map((item) => (item.key === activeTemplate.key ? response.data : item)),
			);
			setDrafts((prev) => ({
				...prev,
				[activeTemplate.key]: {
					subject: response.data.subject,
					body: response.data.body,
				},
			}));
			toast.success("Шаблон сброшен к значению по умолчанию");
		} catch (error) {
			toast.error("Не удалось сбросить шаблон");
		} finally {
			setIsResetting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="w-full h-[60vh] flex items-center justify-center">
				<Spinner label="Загрузка email-шаблонов..." />
			</div>
		);
	}

	return (
		<div className="px-4 py-2">
			<h1 className="text-3xl font-bold mb-2">Email-шаблоны</h1>
			<p className="text-default-500 mb-4">
				Здесь можно изменить тему и HTML писем. Доступные плейсхолдеры указываются для каждого шаблона.
			</p>

			<Tabs
				selectedKey={activeKey}
				onSelectionChange={(key) => setActiveKey(String(key))}
				variant="solid"
				color="primary"
				className="mb-4"
			>
				{templates.map((item) => (
					<Tab key={item.key} title={item.name} />
				))}
			</Tabs>

			{activeTemplate && activeDraft && (
				<Card className="border border-default-200">
					<CardHeader className="flex flex-col items-start gap-1">
						<div className="text-xl font-semibold">{activeTemplate.name}</div>
						<div className="text-sm text-default-500">{activeTemplate.description}</div>
						<div className="text-sm text-default-600 mt-1">
							Плейсхолдеры:{" "}
							{activeTemplate.variables.length > 0
								? activeTemplate.variables.map((variable) => `{{ .${variable} }}`).join(", ")
								: "нет"}
						</div>
					</CardHeader>
					<CardBody className="flex flex-col gap-4">
						<Input
							label="Тема письма"
							value={activeDraft.subject}
							onChange={(event) => updateDraft(activeTemplate.key, { subject: event.target.value })}
						/>
						<Textarea
							label="HTML-шаблон"
							value={activeDraft.body}
							onChange={(event) => updateDraft(activeTemplate.key, { body: event.target.value })}
							minRows={18}
							maxRows={36}
							className="font-mono"
						/>
						<div className="flex gap-2">
							<Button color="primary" onClick={handleSave} isLoading={isSaving}>
								Сохранить
							</Button>
							<Button variant="flat" color="warning" onClick={handleReset} isLoading={isResetting}>
								Сбросить к умолчанию
							</Button>
							<Button variant="light" onClick={loadTemplates}>
								Обновить
							</Button>
						</div>
					</CardBody>
				</Card>
			)}
			<ToastContainer theme="dark" />
		</div>
	);
}
