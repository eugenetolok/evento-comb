'use client';

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, CardFooter, CardHeader, Spinner } from "@heroui/react";
import { button as buttonStyles } from "@heroui/theme";
import ReactECharts from "echarts-for-react";
import { axiosInstanceAuth } from "@/axiosConfig";

type NamedCount = {
  name: string;
  count: number;
};

type DashboardConfig = {
  passWindowMinutes: number;
  topItemsLimit: number;
  anomalyThreshold: number;
  overloadPercentRed: number;
  overloadPercentYellow: number;
};

type DashboardSummary = {
  membersTotal: number;
  membersPrinted: number;
  membersBangleGiven: number;
  membersBlocked: number;
  membersWaiting: number;
  autosTotal: number;
  autosPassMount: number;
  autosPassUnmount: number;
  autosWaiting: number;
};

type CompanyByLimits = {
  companyId: string;
  companyName: string;
  membersLimit: number;
  membersCount: number;
  membersWaiting: number;
  membersOverLimit: number;
  membersUsagePct: number;
  autosLimit: number;
  autosCount: number;
  autosWaiting: number;
  autosOverLimit: number;
  autosUsagePct: number;
  highestUsageLevel: number;
};

type TopPassActivity = {
  memberId: string;
  memberName: string;
  company: string;
  gate: string;
  passes: number;
  lastPassAt: string;
};

type DashboardResponse = {
  generatedAt: string;
  passesWindowStarted: string;
  config: DashboardConfig;
  summary: DashboardSummary;
  membersByAccreditation: NamedCount[];
  passesByGate: NamedCount[];
  companiesByLimits: CompanyByLimits[];
  topPassActivity: TopPassActivity[];
};

const emptyDashboardResponse: DashboardResponse = {
  generatedAt: "",
  passesWindowStarted: "",
  config: {
    passWindowMinutes: 120,
    topItemsLimit: 15,
    anomalyThreshold: 5,
    overloadPercentRed: 100,
    overloadPercentYellow: 85,
  },
  summary: {
    membersTotal: 0,
    membersPrinted: 0,
    membersBangleGiven: 0,
    membersBlocked: 0,
    membersWaiting: 0,
    autosTotal: 0,
    autosPassMount: 0,
    autosPassUnmount: 0,
    autosWaiting: 0,
  },
  membersByAccreditation: [],
  passesByGate: [],
  companiesByLimits: [],
  topPassActivity: [],
};

function normalizeDashboardResponse(payload: Partial<DashboardResponse> | null | undefined): DashboardResponse {
  const source = payload ?? {};
  return {
    ...emptyDashboardResponse,
    ...source,
    config: {
      ...emptyDashboardResponse.config,
      ...(source.config ?? {}),
    },
    summary: {
      ...emptyDashboardResponse.summary,
      ...(source.summary ?? {}),
    },
    membersByAccreditation: Array.isArray(source.membersByAccreditation) ? source.membersByAccreditation : [],
    passesByGate: Array.isArray(source.passesByGate) ? source.passesByGate : [],
    companiesByLimits: Array.isArray(source.companiesByLimits) ? source.companiesByLimits : [],
    topPassActivity: Array.isArray(source.topPassActivity) ? source.topPassActivity : [],
  };
}

export default function ReportsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse>(emptyDashboardResponse);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosInstanceAuth.get<DashboardResponse>("/api/reports/dashboard");
      setDashboardData(normalizeDashboardResponse(response.data));
    } catch (loadError) {
      console.error("Error loading reports dashboard:", loadError);
      setError("Не удалось загрузить данные дашборда");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleDownloadReport = async (reportName: "companies" | "members" | "autos" | "users") => {
    setIsDownloading(true);
    try {
      const response = await axiosInstanceAuth({
        url: `/api/reports/${reportName}`,
        method: "GET",
        responseType: "arraybuffer",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Error downloading the file:", downloadError);
    } finally {
      setIsDownloading(false);
    }
  };

  const membersByAccreditation = Array.isArray(dashboardData.membersByAccreditation)
    ? dashboardData.membersByAccreditation
    : [];
  const passesByGate = Array.isArray(dashboardData.passesByGate) ? dashboardData.passesByGate : [];
  const companiesByLimits = Array.isArray(dashboardData.companiesByLimits) ? dashboardData.companiesByLimits : [];
  const topPassActivity = Array.isArray(dashboardData.topPassActivity) ? dashboardData.topPassActivity : [];

  const accreditationChartOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: membersByAccreditation.map((item) => item.name),
        axisLabel: { interval: 0, rotate: 30 },
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          data: membersByAccreditation.map((item) => item.count),
          barMaxWidth: 36,
        },
      ],
      grid: { left: 32, right: 16, top: 24, bottom: 78 },
    };
  }, [membersByAccreditation]);

  const passesByGateChartOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: passesByGate.map((item) => item.name),
        axisLabel: { interval: 0, rotate: 20 },
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "line",
          smooth: true,
          areaStyle: {},
          data: passesByGate.map((item) => item.count),
        },
      ],
      grid: { left: 32, right: 16, top: 24, bottom: 60 },
    };
  }, [passesByGate]);

  const downloadCards = [
    { title: "Все компании", reportName: "companies" as const },
    { title: "Все участники", reportName: "members" as const },
    { title: "Все автомобили", reportName: "autos" as const },
    { title: "Все пользователи", reportName: "users" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {downloadCards.map((card) => (
          <Card key={card.reportName} className="bg-gradient-to-tr from-red-600 to-yellow-600">
            <CardHeader className="pb-0">
              <h4 className="text-white font-medium text-xl">{card.title}</h4>
            </CardHeader>
            <CardBody />
            <CardFooter className="pt-0">
              <Button
                isDisabled={isDownloading}
                onClick={() => {
                  handleDownloadReport(card.reportName);
                }}
                className={buttonStyles({ color: "warning", variant: "shadow" })}
              >
                Скачать отчёт
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="border border-divider">
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Оперативная статистика площадки</h3>
            <p className="text-small text-default-500">
              Актуально на {dashboardData.generatedAt ? new Date(dashboardData.generatedAt).toLocaleString("ru-RU") : "—"}
            </p>
          </div>
          <Button variant="flat" onClick={loadDashboard} isDisabled={isLoading}>
            Обновить
          </Button>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Spinner label="Загрузка статистики..." />
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-danger">{error}</div>
          ) : null}

          {!isLoading && !error ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <MetricCard title="Участники" value={dashboardData.summary.membersTotal} />
                <MetricCard title="Распечатаны" value={dashboardData.summary.membersPrinted} />
                <MetricCard title="Браслеты" value={dashboardData.summary.membersBangleGiven} />
                <MetricCard title="Блок" value={dashboardData.summary.membersBlocked} />
                <MetricCard title="Автомобили" value={dashboardData.summary.autosTotal} />
                <MetricCard title="Авто в ожидании" value={dashboardData.summary.autosWaiting} />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="border border-divider">
                  <CardHeader className="pb-0">Участники по аккредитациям</CardHeader>
                  <CardBody className="pt-2">
                    <ReactECharts option={accreditationChartOption} style={{ height: 320 }} />
                  </CardBody>
                </Card>
                <Card className="border border-divider">
                  <CardHeader className="pb-0">
                    Проходы по зонам за последние {dashboardData.config.passWindowMinutes} минут
                  </CardHeader>
                  <CardBody className="pt-2">
                    <ReactECharts option={passesByGateChartOption} style={{ height: 320 }} />
                  </CardBody>
                </Card>
              </div>

              <Card className="border border-divider">
                <CardHeader className="pb-1">Компании под риском лимитов</CardHeader>
                <CardBody className="pt-0 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-default-500 border-b border-divider">
                        <th className="py-2 pr-3">Компания</th>
                        <th className="py-2 pr-3">Участники</th>
                        <th className="py-2 pr-3">Авто</th>
                        <th className="py-2 pr-3">Ожидают</th>
                        <th className="py-2 pr-3">Нагрузка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companiesByLimits.map((row) => {
                        const overloadClassName =
                          row.highestUsageLevel >= dashboardData.config.overloadPercentRed
                            ? "text-danger"
                            : row.highestUsageLevel >= dashboardData.config.overloadPercentYellow
                            ? "text-warning"
                            : "text-success";

                        return (
                          <tr key={row.companyId} className="border-b border-divider/60">
                            <td className="py-2 pr-3">{row.companyName}</td>
                            <td className="py-2 pr-3">
                              {row.membersCount}/{row.membersLimit || "∞"}
                              {row.membersOverLimit > 0 ? ` (+${row.membersOverLimit})` : ""}
                            </td>
                            <td className="py-2 pr-3">
                              {row.autosCount}/{row.autosLimit || "∞"}
                              {row.autosOverLimit > 0 ? ` (+${row.autosOverLimit})` : ""}
                            </td>
                            <td className="py-2 pr-3">
                              Участники: {row.membersWaiting}, авто: {row.autosWaiting}
                            </td>
                            <td className={`py-2 pr-3 font-semibold ${overloadClassName}`}>
                              {row.highestUsageLevel}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardBody>
              </Card>

              <Card className="border border-divider">
                <CardHeader className="pb-1">
                  Пиковая активность по проходам (порог: {dashboardData.config.anomalyThreshold}+ за окно)
                </CardHeader>
                <CardBody className="pt-0 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-default-500 border-b border-divider">
                        <th className="py-2 pr-3">Участник</th>
                        <th className="py-2 pr-3">Компания</th>
                        <th className="py-2 pr-3">Зона</th>
                        <th className="py-2 pr-3">Проходы</th>
                        <th className="py-2 pr-3">Последний проход</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPassActivity.map((row, index) => (
                        <tr key={`${row.memberId}-${row.gate}-${index}`} className="border-b border-divider/60">
                          <td className="py-2 pr-3">{row.memberName}</td>
                          <td className="py-2 pr-3">{row.company}</td>
                          <td className="py-2 pr-3">{row.gate}</td>
                          <td className="py-2 pr-3 font-semibold">{row.passes}</td>
                          <td className="py-2 pr-3">
                            {row.lastPassAt ? new Date(row.lastPassAt).toLocaleString("ru-RU") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: number;
};

function MetricCard({ title, value }: MetricCardProps) {
  return (
    <Card className="border border-divider bg-content2/50">
      <CardBody className="py-3">
        <p className="text-xs uppercase tracking-wide text-default-500">{title}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardBody>
    </Card>
  );
}
