'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input, Select, SelectItem, Spinner } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";

type FreezeAction = "freeze" | "unfreeze";

type FreezeStatus = {
  companies_total: number;
  frozen_companies: number;
  scheduled_companies: number;
  next_action?: string;
  next_scheduled_at?: string;
};

type FreezeActionResponse = {
  action: FreezeAction;
  affected_count: number;
  execute_at?: string;
};

type Feedback = {
  type: "success" | "danger";
  message: string;
};

const actionOptions: Array<{ key: FreezeAction; label: string }> = [
  { key: "freeze", label: "Заморозить" },
  { key: "unfreeze", label: "Разморозить" },
];

const emptyStatus: FreezeStatus = {
  companies_total: 0,
  frozen_companies: 0,
  scheduled_companies: 0,
};

function defaultScheduleDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setSeconds(0);
  now.setMilliseconds(0);
  const minutes = now.getMinutes();
  if (minutes % 5 !== 0) {
    now.setMinutes(minutes + (5 - (minutes % 5)));
  }
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatActionLabel(action?: string): string {
  if (action === "freeze") {
    return "Заморозка";
  }
  if (action === "unfreeze") {
    return "Разморозка";
  }
  return "Не задано";
}

export default function AdminCompanyFreezePage() {
  const [status, setStatus] = useState<FreezeStatus>(emptyStatus);
  const [scheduleAction, setScheduleAction] = useState<FreezeAction>("freeze");
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(defaultScheduleDateTime());

  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [isApplyingNow, setIsApplyingNow] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const nextScheduledLabel = useMemo(() => {
    if (!status.next_scheduled_at) {
      return "Нет отложенного действия";
    }
    const parsed = new Date(status.next_scheduled_at);
    if (Number.isNaN(parsed.getTime())) {
      return "Некорректное время";
    }
    return `${formatActionLabel(status.next_action)}: ${parsed.toLocaleString("ru-RU")}`;
  }, [status.next_action, status.next_scheduled_at]);

  const loadStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const response = await axiosInstanceAuth.get<FreezeStatus>("/api/companies/freeze/status");
      setStatus(response.data);
    } catch (error) {
      console.error("Unable to load freeze status:", error);
      setFeedback({ type: "danger", message: "Не удалось загрузить статус заморозки" });
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const scheduleForAll = useCallback(async () => {
    if (!scheduleDateTime) {
      setFeedback({ type: "danger", message: "Укажите дату и время" });
      return;
    }

    setIsScheduling(true);
    setFeedback(null);
    try {
      const response = await axiosInstanceAuth.post<FreezeActionResponse>("/api/companies/freeze/schedule", {
        action: scheduleAction,
        execute_at: scheduleDateTime,
      });

      const executeAtText = response.data.execute_at
        ? new Date(response.data.execute_at).toLocaleString("ru-RU")
        : "указанное время";

      setFeedback({
        type: "success",
        message: `${formatActionLabel(scheduleAction)} запланирована на ${executeAtText}. Компаний: ${response.data.affected_count}`,
      });

      await loadStatus();
    } catch (error) {
      console.error("Unable to schedule company freeze:", error);
      setFeedback({ type: "danger", message: "Не удалось сохранить отложенную заморозку" });
    } finally {
      setIsScheduling(false);
    }
  }, [loadStatus, scheduleAction, scheduleDateTime]);

  const applyNowForAll = useCallback(
    async (action: FreezeAction) => {
      setIsApplyingNow(true);
      setFeedback(null);
      try {
        const response = await axiosInstanceAuth.post<FreezeActionResponse>("/api/companies/freeze/all", {
          action,
        });

        setFeedback({
          type: "success",
          message: `${formatActionLabel(action)} применена сразу. Компаний: ${response.data.affected_count}`,
        });

        await loadStatus();
      } catch (error) {
        console.error("Unable to apply freeze action for all companies:", error);
        setFeedback({ type: "danger", message: "Не удалось применить массовое действие" });
      } finally {
        setIsApplyingNow(false);
      }
    },
    [loadStatus],
  );

  return (
    <div className="space-y-4">
      <Card className="border border-divider">
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-2xl font-semibold">Заморозка компаний</h1>
          <p className="text-small text-default-500">Управление доступом на запись для всех компаний.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Chip color="primary" variant="flat">Всего компаний: {status.companies_total}</Chip>
            <Chip color="warning" variant="flat">Заморожено: {status.frozen_companies}</Chip>
            <Chip color="secondary" variant="flat">Отложено: {status.scheduled_companies}</Chip>
          </div>

          <div className="rounded-large border border-divider p-3">
            <h2 className="text-base font-semibold mb-3">Отложенное действие</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <span className="mb-1 block text-small font-semibold text-default-700">Что сделать</span>
                <Select
                  selectedKeys={[scheduleAction]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as FreezeAction | undefined;
                    if (selected) {
                      setScheduleAction(selected);
                    }
                  }}
                  size="sm"
                  disallowEmptySelection
                >
                  {actionOptions.map((option) => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="lg:col-span-2">
                <span className="mb-1 block text-small font-semibold text-default-700">Дата и время (24ч)</span>
                <Input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onValueChange={setScheduleDateTime}
                  size="sm"
                />
              </div>

              <div className="lg:col-span-1 flex items-end">
                <Button color="primary" className="w-full" onClick={scheduleForAll} isLoading={isScheduling}>
                  Сохранить отложенно
                </Button>
              </div>
            </div>

            <p className="mt-3 text-small text-default-500">{nextScheduledLabel}</p>
          </div>

          <div className="rounded-large border border-divider p-3">
            <h2 className="text-base font-semibold mb-3">Моментально для всех</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                color="danger"
                onClick={() => {
                  void applyNowForAll("freeze");
                }}
                isLoading={isApplyingNow}
              >
                Заморозить всех сейчас
              </Button>
              <Button
                color="success"
                onClick={() => {
                  void applyNowForAll("unfreeze");
                }}
                isLoading={isApplyingNow}
              >
                Разморозить всех сейчас
              </Button>
              <Button variant="bordered" onClick={() => { void loadStatus(); }} isDisabled={isLoadingStatus || isScheduling || isApplyingNow}>
                Обновить статус
              </Button>
            </div>
          </div>

          {isLoadingStatus ? (
            <div className="py-6 flex justify-center">
              <Spinner label="Загрузка статуса..." />
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`rounded-large border px-3 py-2 text-sm ${
                feedback.type === "success"
                  ? "border-success/40 bg-success/10 text-success-700"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
