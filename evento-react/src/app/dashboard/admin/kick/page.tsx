'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader, Checkbox, Chip, Input, Pagination, Spinner, Tab, Tabs } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import { Link as RouterLink } from "react-router-dom";

type SmartMode = "gates" | "events";

type SmartManagementMember = {
  id: string;
  full_name: string;
  document: string;
  company_name: string;
  accreditation_name: string;
  accreditation_id: string;
  event_ids: string[];
  gate_ids: string[];
};

type SmartManagementEvent = {
  id: string;
  name: string;
  position: number;
  time_start?: string | null;
  time_end?: string | null;
};

type SmartManagementGate = {
  id: string;
  name: string;
  position: number;
};

type SmartManagementData = {
  members: SmartManagementMember[];
  events: SmartManagementEvent[];
  gates: SmartManagementGate[];
  companies: string[];
  accreditations: string[];
  total_members: number;
  page: number;
  page_size: number;
  total_pages: number;
};

type MemberAssignment = {
  eventIds: string[];
  gateIds: string[];
};

type SmartManagementUpdatePayload = {
  updates: Array<{
    member_id: string;
    event_ids: string[];
    gate_ids: string[];
  }>;
};

type SmartManagementUpdateResponse = {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    member_id: string;
    success: boolean;
    error?: string;
  }>;
};

type Feedback = {
  type: "success" | "danger";
  message: string;
};

type SmartColumn = {
  id: string;
  title: string;
  subtitle?: string;
};

const defaultPageSize = 100;
const pageSizeOptions = [50, 100, 200, 300];

const emptyData: SmartManagementData = {
  members: [],
  events: [],
  gates: [],
  companies: [],
  accreditations: [],
  total_members: 0,
  page: 1,
  page_size: defaultPageSize,
  total_pages: 0,
};

const emptyAssignment: MemberAssignment = {
  eventIds: [],
  gateIds: [],
};

const uniqueIDs = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of ids) {
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
  }

  return result;
};

const normalizeAssignment = (assignment: MemberAssignment): MemberAssignment => ({
  eventIds: uniqueIDs(assignment.eventIds),
  gateIds: uniqueIDs(assignment.gateIds),
});

const toMemberAssignment = (member: SmartManagementMember): MemberAssignment => ({
  eventIds: uniqueIDs(member.event_ids),
  gateIds: uniqueIDs(member.gate_ids),
});

const sameSet = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  for (const value of left) {
    if (!rightSet.has(value)) {
      return false;
    }
  }
  return true;
};

const sameAssignment = (left: MemberAssignment, right: MemberAssignment): boolean => {
  return sameSet(left.eventIds, right.eventIds) && sameSet(left.gateIds, right.gateIds);
};

const setModeIDs = (assignment: MemberAssignment, mode: SmartMode, ids: string[]): MemberAssignment => {
  if (mode === "events") {
    return normalizeAssignment({
      eventIds: ids,
      gateIds: assignment.gateIds,
    });
  }

  return normalizeAssignment({
    eventIds: assignment.eventIds,
    gateIds: ids,
  });
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatEventDate = (event: SmartManagementEvent): string => {
  const start = parseDate(event.time_start);
  if (!start) {
    return "Дата не задана";
  }

  const end = parseDate(event.time_end);
  const startDate = start.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  if (!end) {
    return startDate;
  }

  const endDate = end.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
};

const normalizeData = (payload: Partial<SmartManagementData> | null | undefined): SmartManagementData => {
  const source = payload ?? {};

  const members = Array.isArray(source.members)
    ? source.members.map((member) => ({
        ...member,
        event_ids: uniqueIDs(Array.isArray(member.event_ids) ? member.event_ids : []),
        gate_ids: uniqueIDs(Array.isArray(member.gate_ids) ? member.gate_ids : []),
      }))
    : [];

  return {
    members,
    events: Array.isArray(source.events) ? source.events : [],
    gates: Array.isArray(source.gates) ? source.gates : [],
    companies: Array.isArray(source.companies) ? source.companies : [],
    accreditations: Array.isArray(source.accreditations) ? source.accreditations : [],
    total_members: typeof source.total_members === "number" ? source.total_members : 0,
    page: typeof source.page === "number" && source.page > 0 ? source.page : 1,
    page_size: typeof source.page_size === "number" && source.page_size > 0 ? source.page_size : defaultPageSize,
    total_pages: typeof source.total_pages === "number" && source.total_pages >= 0 ? source.total_pages : 0,
  };
};

export default function SmartManagementPage() {
  const requestSeq = useRef<number>(0);

  const [data, setData] = useState<SmartManagementData>(emptyData);
  const [edits, setEdits] = useState<Record<string, MemberAssignment>>({});

  const [mode, setMode] = useState<SmartMode>("gates");
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [accreditationFilter, setAccreditationFilter] = useState<string>("");
  const [showChangedOnly, setShowChangedOnly] = useState<boolean>(false);
  const [bulkEntityID, setBulkEntityID] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const loadData = useCallback(async () => {
    const currentRequestID = requestSeq.current + 1;
    requestSeq.current = currentRequestID;

    setIsLoading(true);
    setError("");

    try {
      const response = await axiosInstanceAuth.get<SmartManagementData>("/api/members/smart-management", {
        params: {
          page,
          page_size: pageSize,
          search: search || undefined,
          company: companyFilter || undefined,
          accreditation: accreditationFilter || undefined,
        },
      });

      if (currentRequestID !== requestSeq.current) {
        return;
      }

      const normalized = normalizeData(response.data);
      setData(normalized);

      if (normalized.page !== page) {
        setPage(normalized.page);
      }
      if (normalized.page_size !== pageSize) {
        setPageSize(normalized.page_size);
      }
    } catch (loadError) {
      if (currentRequestID !== requestSeq.current) {
        return;
      }
      console.error("Unable to load smart management data:", loadError);
      setError("Не удалось загрузить данные SMART-менеджмента");
    } finally {
      if (currentRequestID === requestSeq.current) {
        setIsLoading(false);
      }
    }
  }, [accreditationFilter, companyFilter, page, pageSize, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const columns = useMemo<SmartColumn[]>(() => {
    if (mode === "events") {
      return data.events.map((event) => ({
        id: event.id,
        title: event.name,
        subtitle: formatEventDate(event),
      }));
    }

    return data.gates.map((gate) => ({
      id: gate.id,
      title: gate.name,
    }));
  }, [data.events, data.gates, mode]);

  useEffect(() => {
    if (columns.length === 0) {
      setBulkEntityID("");
      return;
    }

    if (!columns.some((column) => column.id === bulkEntityID)) {
      setBulkEntityID(columns[0].id);
    }
  }, [bulkEntityID, columns]);

  const baseAssignments = useMemo(() => {
    const map = new Map<string, MemberAssignment>();
    for (const member of data.members) {
      map.set(member.id, toMemberAssignment(member));
    }
    return map;
  }, [data.members]);

  const resolveAssignment = useCallback(
    (memberID: string): MemberAssignment => {
      const edited = edits[memberID];
      if (edited) {
        return edited;
      }
      return baseAssignments.get(memberID) ?? emptyAssignment;
    },
    [baseAssignments, edits],
  );

  const updateMemberAssignment = useCallback(
    (memberID: string, updater: (current: MemberAssignment) => MemberAssignment) => {
      setEdits((previous) => {
        const base = baseAssignments.get(memberID) ?? emptyAssignment;
        const current = previous[memberID] ?? base;
        const updated = normalizeAssignment(updater(current));

        const next = { ...previous };
        if (sameAssignment(updated, base)) {
          delete next[memberID];
        } else {
          next[memberID] = updated;
        }
        return next;
      });
    },
    [baseAssignments],
  );

  const visibleMembers = useMemo(() => {
    if (!showChangedOnly) {
      return data.members;
    }
    return data.members.filter((member) => Boolean(edits[member.id]));
  }, [data.members, edits, showChangedOnly]);

  const visibleMemberIDs = useMemo(() => visibleMembers.map((member) => member.id), [visibleMembers]);
  const changedCount = useMemo(() => Object.keys(edits).length, [edits]);

  const updateManyMembers = useCallback(
    (memberIDs: string[], entityID: string, enabled: boolean) => {
      if (!entityID || memberIDs.length === 0) {
        return;
      }

      setEdits((previous) => {
        const next = { ...previous };

        for (const memberID of memberIDs) {
          const base = baseAssignments.get(memberID) ?? emptyAssignment;
          const current = next[memberID] ?? previous[memberID] ?? base;
          const modeIDs = mode === "events" ? current.eventIds : current.gateIds;
          const hasEntity = modeIDs.includes(entityID);

          let updatedModeIDs = modeIDs;
          if (enabled && !hasEntity) {
            updatedModeIDs = [...modeIDs, entityID];
          }
          if (!enabled && hasEntity) {
            updatedModeIDs = modeIDs.filter((itemID) => itemID !== entityID);
          }

          const updated = setModeIDs(current, mode, updatedModeIDs);
          if (sameAssignment(updated, base)) {
            delete next[memberID];
          } else {
            next[memberID] = updated;
          }
        }

        return next;
      });
    },
    [baseAssignments, mode],
  );

  const onCellChange = useCallback(
    (memberID: string, entityID: string, enabled: boolean) => {
      updateMemberAssignment(memberID, (current) => {
        const modeIDs = mode === "events" ? current.eventIds : current.gateIds;
        const hasEntity = modeIDs.includes(entityID);

        let updatedModeIDs = modeIDs;
        if (enabled && !hasEntity) {
          updatedModeIDs = [...modeIDs, entityID];
        }
        if (!enabled && hasEntity) {
          updatedModeIDs = modeIDs.filter((itemID) => itemID !== entityID);
        }

        return setModeIDs(current, mode, updatedModeIDs);
      });
    },
    [mode, updateMemberAssignment],
  );

  const onSetRowAll = useCallback(
    (memberID: string, enabled: boolean) => {
      const targetIDs = enabled ? columns.map((column) => column.id) : [];
      updateMemberAssignment(memberID, (current) => setModeIDs(current, mode, targetIDs));
    },
    [columns, mode, updateMemberAssignment],
  );

  const isChecked = useCallback(
    (memberID: string, entityID: string): boolean => {
      const assignment = resolveAssignment(memberID);
      const modeIDs = mode === "events" ? assignment.eventIds : assignment.gateIds;
      return modeIDs.includes(entityID);
    },
    [mode, resolveAssignment],
  );

  const saveChanges = useCallback(async () => {
    const changedIDs = Object.keys(edits);
    if (changedIDs.length === 0) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const payload: SmartManagementUpdatePayload = {
      updates: changedIDs.map((memberID) => {
        const assignment = edits[memberID];
        return {
          member_id: memberID,
          event_ids: assignment.eventIds,
          gate_ids: assignment.gateIds,
        };
      }),
    };

    try {
      const response = await axiosInstanceAuth.post<SmartManagementUpdateResponse>("/api/members/smart-management", payload);
      const failedResults = response.data.results.filter((result) => !result.success);

      if (failedResults.length === 0) {
        setFeedback({
          type: "success",
          message: `Изменения сохранены: ${response.data.success} из ${response.data.total}`,
        });
        setEdits({});
        await loadData();
      } else {
        const failedIDs = new Set(failedResults.map((result) => result.member_id));
        const firstError = failedResults[0]?.error;

        setFeedback({
          type: "danger",
          message: `Сохранено: ${response.data.success}, ошибок: ${response.data.failed}${firstError ? `. Пример: ${firstError}` : ""}`,
        });

        setEdits((previous) => {
          const next: Record<string, MemberAssignment> = {};
          for (const [memberID, assignment] of Object.entries(previous)) {
            if (failedIDs.has(memberID)) {
              next[memberID] = assignment;
            }
          }
          return next;
        });

        await loadData();
      }
    } catch (saveError) {
      console.error("Unable to save smart management updates:", saveError);
      setFeedback({
        type: "danger",
        message: "Ошибка при сохранении. Попробуйте ещё раз.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [edits, loadData]);

  return (
    <div className="space-y-4">
      <Card className="border border-divider">
        <CardHeader className="flex flex-col items-start gap-2">
          <h1 className="text-2xl font-semibold">SMART-менеджмент участников</h1>
          <p className="text-small text-default-500">Управление доступом по зонам и датам мероприятий.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded-large border border-divider bg-default-50/40 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="min-w-0">
                <span className="mb-1 block text-small font-semibold text-default-700">Режим</span>
                <Tabs
                  fullWidth
                  selectedKey={mode}
                  onSelectionChange={(key) => {
                    setMode(key === "events" ? "events" : "gates");
                  }}
                  aria-label="Тип доступа"
                  color="primary"
                >
                  <Tab key="gates" title="Доп. зоны" />
                  <Tab key="events" title="Даты мероприятий" />
                </Tabs>
              </div>

              <div className="min-w-0">
                <span className="mb-1 block text-small font-semibold text-default-700">Поиск</span>
                <Input
                  value={searchInput}
                  onValueChange={setSearchInput}
                  placeholder="ФИО, документ"
                  size="sm"
                />
              </div>

              <label className="min-w-0 text-small text-default-600">
                <span className="mb-1 block font-semibold text-default-700">Компания</span>
                <select
                  className="h-10 w-full rounded-medium border border-divider bg-default-50 px-3 text-sm"
                  value={companyFilter}
                  onChange={(event) => {
                    setCompanyFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Все компании</option>
                  {data.companies.map((companyName) => (
                    <option key={companyName} value={companyName}>
                      {companyName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0 text-small text-default-600">
                <span className="mb-1 block font-semibold text-default-700">Аккредитация</span>
                <select
                  className="h-10 w-full rounded-medium border border-divider bg-default-50 px-3 text-sm"
                  value={accreditationFilter}
                  onChange={(event) => {
                    setAccreditationFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Все аккредитации</option>
                  {data.accreditations.map((accreditationName) => (
                    <option key={accreditationName} value={accreditationName}>
                      {accreditationName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="min-w-0">
                <span className="mb-1 block text-small font-semibold text-default-700">Фильтр</span>
                <div className="flex h-10 items-center rounded-medium border border-divider bg-default-50 px-3">
                  <Checkbox isSelected={showChangedOnly} onValueChange={setShowChangedOnly}>
                    Только изменённые
                  </Checkbox>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-large border border-divider p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip color="primary" variant="flat">Участников: {data.total_members}</Chip>
              <Chip color="secondary" variant="flat">В таблице: {visibleMembers.length}</Chip>
              <Chip color={changedCount > 0 ? "warning" : "default"} variant="flat">
                Несохранённых строк: {changedCount}
              </Chip>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-small text-default-600">
                Массовое изменение
                <select
                  className="ml-2 rounded-medium border border-divider bg-default-50 px-2 py-1 text-sm"
                  value={bulkEntityID}
                  onChange={(event) => {
                    setBulkEntityID(event.target.value);
                  }}
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                size="sm"
                variant="flat"
                color="success"
                isDisabled={!bulkEntityID || visibleMemberIDs.length === 0}
                onClick={() => {
                  updateManyMembers(visibleMemberIDs, bulkEntityID, true);
                }}
              >
                Выдать
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                isDisabled={!bulkEntityID || visibleMemberIDs.length === 0}
                onClick={() => {
                  updateManyMembers(visibleMemberIDs, bulkEntityID, false);
                }}
              >
                Снять
              </Button>

              <Button
                size="sm"
                variant="light"
                onClick={() => {
                  setEdits({});
                  setFeedback(null);
                }}
                isDisabled={changedCount === 0 || isSaving}
              >
                Сбросить правки
              </Button>

              <Button
                size="sm"
                color="primary"
                onClick={saveChanges}
                isDisabled={changedCount === 0 || isSaving}
                isLoading={isSaving}
              >
                Сохранить изменения
              </Button>

              <Button
                size="sm"
                variant="bordered"
                onClick={() => {
                  void loadData();
                }}
                isDisabled={isSaving}
              >
                Обновить
              </Button>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-small text-default-500">
                Страница {page} из {Math.max(data.total_pages, 1)}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-small text-default-600">
                  На странице
                  <select
                    className="ml-2 rounded-medium border border-divider bg-default-50 px-2 py-1 text-sm"
                    value={String(pageSize)}
                    onChange={(event) => {
                      const nextSize = Number(event.target.value);
                      setPageSize(Number.isFinite(nextSize) ? nextSize : defaultPageSize);
                      setPage(1);
                    }}
                  >
                    {pageSizeOptions.map((sizeOption) => (
                      <option key={sizeOption} value={sizeOption}>
                        {sizeOption}
                      </option>
                    ))}
                  </select>
                </label>

                <Pagination
                  page={page}
                  total={Math.max(data.total_pages, 1)}
                  showControls
                  onChange={(nextPage) => {
                    setPage(nextPage);
                  }}
                  isDisabled={isLoading}
                />
              </div>
            </div>
          </div>

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

          {error ? (
            <div className="rounded-large border border-danger/40 bg-danger/10 px-3 py-2 text-danger text-sm">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner label="Загрузка матрицы доступа..." />
            </div>
          ) : null}

          {!isLoading && columns.length === 0 ? (
            <div className="rounded-large border border-divider px-4 py-5 text-sm text-default-500">
              Нет доступных {mode === "events" ? "мероприятий" : "дополнительных зон"} для отображения.
            </div>
          ) : null}

          {!isLoading && columns.length > 0 ? (
            <div className="overflow-auto rounded-large border border-divider">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-default-100">
                  <tr>
                    <th className="sticky left-0 z-30 w-[340px] min-w-[340px] max-w-[340px] border-b border-r border-divider bg-default-100 px-4 py-3 text-left font-medium shadow-[6px_0_8px_-6px_rgba(15,23,42,0.35)]">
                      Участник
                    </th>
                    {columns.map((column) => (
                      <th key={column.id} className="min-w-[170px] border-b border-divider bg-default-100 px-3 py-2 text-center align-top">
                        <div className="font-medium">{column.title}</div>
                        {column.subtitle ? <div className="text-tiny text-default-500">{column.subtitle}</div> : null}
                        <div className="mt-2 flex justify-center gap-1">
                          <Button
                            size="sm"
                            variant="flat"
                            color="success"
                            onClick={() => {
                              updateManyMembers(visibleMemberIDs, column.id, true);
                            }}
                            isDisabled={visibleMemberIDs.length === 0}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            onClick={() => {
                              updateManyMembers(visibleMemberIDs, column.id, false);
                            }}
                            isDisabled={visibleMemberIDs.length === 0}
                          >
                            -
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleMembers.map((member, index) => {
                    const rowChanged = Boolean(edits[member.id]);
                    const rowBackgroundClass = index % 2 === 0 ? "bg-content1" : "bg-default-50";

                    return (
                      <tr key={member.id} className={`${rowBackgroundClass} border-b border-divider/60`}>
                        <td className={`sticky left-0 z-20 w-[340px] min-w-[340px] max-w-[340px] overflow-hidden border-r border-divider px-4 py-3 align-top shadow-[6px_0_8px_-6px_rgba(15,23,42,0.35)] ${rowBackgroundClass}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="break-words font-semibold leading-5">{member.full_name || member.document || member.id}</div>
                              <div className="break-words text-tiny text-default-500">{member.company_name}</div>
                              <div className="break-words text-tiny text-default-500">{member.accreditation_name}</div>
                            </div>
                            {rowChanged ? <Chip size="sm" color="warning" variant="flat">изменено</Chip> : null}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => {
                                onSetRowAll(member.id, true);
                              }}
                            >
                              Всё
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => {
                                onSetRowAll(member.id, false);
                              }}
                            >
                              Очистить
                            </Button>
                            <Button as={RouterLink} to={`/dashboard/members/${member.id}`} size="sm" variant="flat">
                              Карточка
                            </Button>
                          </div>
                        </td>

                        {columns.map((column) => (
                          <td key={`${member.id}-${column.id}`} className="px-3 py-2 text-center align-middle">
                            <div className="flex justify-center">
                              <Checkbox
                                isSelected={isChecked(member.id, column.id)}
                                onValueChange={(enabled) => {
                                  onCellChange(member.id, column.id, enabled);
                                }}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  {visibleMembers.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-default-500">
                        На текущей странице участников не найдено.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
