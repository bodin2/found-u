"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react";
import {
  Package,
  Search,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  ArrowUpRight,
  Activity,
  Users,
  BarChart3,
} from "lucide-react";
import {
  subscribeToLostItems,
  subscribeToFoundItems,
  timestampToDate,
  getAIUsageStats,
  subscribeToAIUsage,
  getAllUsers,
} from "@/lib/firestore";
import { CATEGORIES, STATUS_CONFIG, type LostItem, type FoundItem, type AIUsageRecord, type AppUser } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";

// Tab type
type DashboardTab = "stats" | "api-requests";
type ChartSource = "global" | "user";
type TimeRange = "1h" | "1d" | "3d" | "7d";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("stats");
  const [chartSource, setChartSource] = useState<ChartSource>("global");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [aiUsageRecords, setAiUsageRecords] = useState<AIUsageRecord[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    const unsubLost = subscribeToLostItems((items) => {
      setLostItems(items);
      setLoading(false);
    });

    const unsubFound = subscribeToFoundItems((items) => {
      setFoundItems(items);
    });

    // Subscribe to AI usage records
    const unsubAI = subscribeToAIUsage((records) => {
      setAiUsageRecords(records);
      setAiLoading(false);
    });

    // Load users for email mapping
    getAllUsers().then((users) => {
      const map: Record<string, AppUser> = {};
      users.forEach((user) => {
        map[user.uid] = user;
      });
      setUsersMap(map);
    });

    return () => {
      unsubLost();
      unsubFound();
      unsubAI();
    };
  }, []);

  // Calculate stats
  const stats = {
    totalLost: lostItems.length,
    totalFound: foundItems.length,
    searching: lostItems.filter((i) => i.status === "searching").length,
    found: [...lostItems, ...foundItems].filter((i) => i.status === "found").length,
    claimed: [...lostItems, ...foundItems].filter((i) => i.status === "claimed").length,
    thisWeek: [...lostItems, ...foundItems].filter((item) => {
      if (!item.createdAt) return false;
      const date = timestampToDate(item.createdAt as any);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date > weekAgo;
    }).length,
  };

  // Recent activity (last 8 items)
  const recentActivity = [...lostItems, ...foundItems]
    .sort((a, b) => {
      const dateA = a.createdAt ? timestampToDate(a.createdAt as any).getTime() : 0;
      const dateB = b.createdAt ? timestampToDate(b.createdAt as any).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 8);

  // Category breakdown
  const categoryBreakdown = CATEGORIES.map((cat) => ({
    ...cat,
    count: lostItems.filter((item) => item.category === cat.value).length,
  })).sort((a, b) => b.count - a.count);

  // AI Usage Stats
  const aiStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayCount = aiUsageRecords.filter(r => new Date(r.timestamp) >= today).length;
    const weekCount = aiUsageRecords.filter(r => new Date(r.timestamp) >= weekAgo).length;
    const monthCount = aiUsageRecords.filter(r => new Date(r.timestamp) >= monthAgo).length;

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    aiUsageRecords.forEach(r => {
      byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + 1;
    });

    // Group by user
    const byUser: Record<string, { count: number; userId: string }> = {};
    aiUsageRecords.forEach(r => {
      if (!byUser[r.userId]) {
        byUser[r.userId] = { count: 0, userId: r.userId };
      }
      byUser[r.userId].count++;
    });

    // Daily data for chart (last 7 days)
    const dailyData: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const count = aiUsageRecords.filter(r => {
        const t = new Date(r.timestamp);
        return t >= date && t < nextDate;
      }).length;
      dailyData.push({
        date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        count,
      });
    }

    // Hourly data for today
    const hourlyData: { hour: string; count: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(today.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const count = aiUsageRecords.filter(r => {
        const t = new Date(r.timestamp);
        return t >= hourStart && t < hourEnd;
      }).length;
      hourlyData.push({
        hour: `${i.toString().padStart(2, '0')}:00`,
        count,
      });
    }

    // Per user daily data (last 7 days, top 5 users)
    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const userDailyData: { userId: string; data: { date: string; count: number }[] }[] = topUsers.map(([userId]) => {
      const data: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const count = aiUsageRecords.filter(r => {
          const t = new Date(r.timestamp);
          return r.userId === userId && t >= date && t < nextDate;
        }).length;
        data.push({
          date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
          count,
        });
      }
      return { userId, data };
    });

    // Generate data for specific time range and optional userId
    const getChartData = (range: TimeRange, userId?: string) => {
      const records = userId 
        ? aiUsageRecords.filter(r => r.userId === userId)
        : aiUsageRecords;
      
      if (range === "1h") {
        // Last 1 hour - per minute
        const data: { label: string; count: number }[] = [];
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        for (let i = 0; i < 12; i++) {
          const start = new Date(oneHourAgo.getTime() + i * 5 * 60 * 1000);
          const end = new Date(start.getTime() + 5 * 60 * 1000);
          const count = records.filter(r => {
            const t = new Date(r.timestamp);
            return t >= start && t < end;
          }).length;
          data.push({
            label: start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            count,
          });
        }
        return data;
      } else if (range === "1d") {
        // Last 24 hours - per hour
        const data: { label: string; count: number }[] = [];
        for (let i = 23; i >= 0; i--) {
          const start = new Date(now.getTime() - i * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          const count = records.filter(r => {
            const t = new Date(r.timestamp);
            return t >= start && t < end;
          }).length;
          data.push({
            label: start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            count,
          });
        }
        return data;
      } else if (range === "3d") {
        // Last 3 days - per 6 hours
        const data: { label: string; count: number }[] = [];
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        for (let i = 0; i < 12; i++) {
          const start = new Date(threeDaysAgo.getTime() + i * 6 * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
          const count = records.filter(r => {
            const t = new Date(r.timestamp);
            return t >= start && t < end;
          }).length;
          data.push({
            label: start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + 
                   start.toLocaleTimeString('th-TH', { hour: '2-digit' }) + ':00',
            count,
          });
        }
        return data;
      } else {
        // 7 days - per day
        const data: { label: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
          const count = records.filter(r => {
            const t = new Date(r.timestamp);
            return t >= date && t < nextDate;
          }).length;
          data.push({
            label: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
            count,
          });
        }
        return data;
      }
    };

    return {
      total: aiUsageRecords.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      byEndpoint,
      byUser: Object.values(byUser).sort((a, b) => b.count - a.count),
      dailyData,
      hourlyData,
      userDailyData,
      getChartData,
    };
  }, [aiUsageRecords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  // Simple Line Chart Component - Fixed aspect ratio with Y-axis labels
  const LineChart = ({ data, color = "#06C755" }: { 
    data: { label: string; value: number }[]; 
    color?: string;
  }) => {
    const rawMax = Math.max(...data.map(d => d.value), 1);
    // Add 20% padding so max value doesn't touch the top
    const maxValue = Math.ceil(rawMax * 1.2);
    
    // Calculate nice round numbers for Y-axis
    const getYAxisTicks = (max: number) => {
      if (max <= 5) return [0, 1, 2, 3, 4, 5].filter(v => v <= max + 1);
      if (max <= 10) return [0, 2, 4, 6, 8, 10].filter(v => v <= max + 2);
      if (max <= 20) return [0, 5, 10, 15, 20].filter(v => v <= max + 5);
      if (max <= 50) return [0, 10, 20, 30, 40, 50].filter(v => v <= max + 10);
      if (max <= 100) return [0, 25, 50, 75, 100].filter(v => v <= max + 25);
      const step = Math.ceil(max / 5 / 10) * 10;
      return [0, step, step * 2, step * 3, step * 4, step * 5].filter(v => v <= max + step);
    };
    
    const yTicks = getYAxisTicks(maxValue);
    const yAxisMax = yTicks[yTicks.length - 1] || maxValue;
    
    // Chart area: x starts at 12 to leave room for Y-axis labels
    const chartLeft = 12;
    const chartWidth = 100 - chartLeft;
    const chartHeight = 65; // Leave room at bottom for padding
    
    const points = data.map((d, i) => ({
      x: chartLeft + (i / (data.length - 1 || 1)) * chartWidth,
      y: chartHeight - (d.value / yAxisMax) * chartHeight,
    }));

    // Show only some labels to avoid crowding
    const showLabelEvery = data.length > 10 ? Math.ceil(data.length / 7) : 1;

    return (
      <div className="relative w-full">
        {/* SVG with fixed aspect ratio */}
        <div className="relative w-full" style={{ paddingBottom: '70%' }}>
          <svg
            viewBox="0 0 100 75"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full"
          >
            {/* Background */}
            <rect x="0" y="0" width="100" height="75" fill="transparent" />
            
            {/* Y-axis labels */}
            {yTicks.map((tick) => {
              const y = chartHeight - (tick / yAxisMax) * chartHeight;
              return (
                <g key={tick}>
                  {/* Horizontal grid line */}
                  <line
                    x1={chartLeft}
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.15"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {/* Y-axis label */}
                  <text
                    x={chartLeft - 1.5}
                    y={y + 1}
                    textAnchor="end"
                    className="text-gray-400 dark:text-gray-500"
                    style={{ fontSize: '3px' }}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}
            
            {/* Vertical grid lines */}
            {data.map((_, i) => (
              <line
                key={i}
                x1={chartLeft + (i / (data.length - 1 || 1)) * chartWidth}
                y1="0"
                x2={chartLeft + (i / (data.length - 1 || 1)) * chartWidth}
                y2={chartHeight}
                stroke="currentColor"
                strokeWidth="0.1"
                className="text-gray-100 dark:text-gray-800"
              />
            ))}
            
            {/* Area fill */}
            {points.length > 1 && (
              <path
                d={`M ${points[0].x} ${chartHeight} L ${points[0].x} ${points[0].y} ` + 
                   points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + 
                   ` L ${points[points.length - 1].x} ${chartHeight} Z`}
                fill={color}
                fillOpacity="0.15"
              />
            )}
            
            {/* Line */}
            {points.length > 1 && (
              <path
                d={`M ${points[0].x} ${points[0].y} ` + 
                   points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="0.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            
            {/* Points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="1"
                fill={color}
              />
            ))}
          </svg>
        </div>
        
        {/* X-axis Labels */}
        <div className="flex justify-between text-[10px] text-gray-400 mt-2" style={{ marginLeft: '12%' }}>
          {data.map((d, i) => (
            i % showLabelEvery === 0 || i === data.length - 1 ? (
              <span key={i} className="text-center" style={{ minWidth: 0 }}>
                {d.label}
              </span>
            ) : <span key={i} />
          ))}
        </div>
      </div>
    );
  };

  // Get current chart data based on source, user, and time range
  const getCurrentChartData = () => {
    const timeRangeLabels: Record<TimeRange, string> = {
      "1h": "1 ชั่วโมงล่าสุด",
      "1d": "24 ชั่วโมงล่าสุด",
      "3d": "3 วันล่าสุด",
      "7d": "7 วันล่าสุด",
    };

    if (chartSource === "global") {
      const data = aiStats.getChartData(timeRange);
      return {
        data: data.map(d => ({ label: d.label, value: d.count })),
        color: "#06C755",
        title: `Global - ${timeRangeLabels[timeRange]}`,
      };
    } else {
      // User specific
      const userId = selectedUserId || aiStats.byUser[0]?.userId;
      if (!userId) {
        return {
          data: [],
          color: "#F59E0B",
          title: "ไม่พบข้อมูลผู้ใช้",
        };
      }
      const userInfo = usersMap[userId];
      const displayName = userInfo?.email || userInfo?.displayName || userId;
      const data = aiStats.getChartData(timeRange, userId);
      return {
        data: data.map(d => ({ label: d.label, value: d.count })),
        color: "#F59E0B",
        title: `${displayName} - ${timeRangeLabels[timeRange]}`,
      };
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ภาพรวม</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          สถิติและข้อมูลทั่วไปของระบบ BD2Fondue
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("stats")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
            activeTab === "stats"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          สถิติ
        </button>
        <button
          onClick={() => setActiveTab("api-requests")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
            activeTab === "api-requests"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Activity className="w-4 h-4" />
          API Requests
        </button>
      </div>

      {activeTab === "stats" && (
        <>
          {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Search className="w-6 h-6 text-red-500" />
            </div>
            <span className="flex items-center text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              {stats.thisWeek} สัปดาห์นี้
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {stats.totalLost}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">ของหายทั้งหมด</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {stats.totalFound}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">ของเจอทั้งหมด</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {stats.searching}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">กำลังตามหา</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {stats.claimed}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">รับคืนแล้ว</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              กิจกรรมล่าสุด
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ยังไม่มีกิจกรรม
              </div>
            ) : (
              recentActivity.map((item) => {
                const isLost = "itemName" in item;
                return (
                  <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isLost
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-green-100 dark:bg-green-900/30"
                        )}
                      >
                        {isLost ? (
                          <Search className="w-5 h-5 text-red-500" />
                        ) : (
                          <Package className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {isLost ? (item as LostItem).itemName : (item as FoundItem).description}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {isLost ? "แจ้งของหาย" : "แจ้งเจอของ"} •{" "}
                          <span className="font-mono text-[#06C755]">{item.trackingCode}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "inline-block px-2.5 py-1 rounded-full text-xs font-medium",
                            STATUS_CONFIG[item.status].bgColor,
                            STATUS_CONFIG[item.status].color
                          )}
                        >
                          {STATUS_CONFIG[item.status].label}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {item.createdAt
                            ? formatThaiDate(timestampToDate(item.createdAt as any))
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              หมวดหมู่ที่หายบ่อย
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.value} className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cat.label}
                    </span>
                    <span className="text-sm text-gray-500">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#06C755] rounded-full transition-all"
                      style={{
                        width: `${stats.totalLost > 0 ? (cat.count / stats.totalLost) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {categoryBreakdown.every((cat) => cat.count === 0) && (
              <p className="text-center text-gray-500 py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-gradient-to-r from-[#06C755] to-[#05a647] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">สรุปภาพรวม</h3>
            <p className="text-white/80 text-sm">อัตราการส่งคืนของ</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">
              {stats.totalLost > 0
                ? Math.round((stats.claimed / stats.totalLost) * 100)
                : 0}%
            </p>
            <p className="text-sm text-white/80">อัตราส่งคืน</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.found}</p>
            <p className="text-sm text-white/80">รอรับคืน</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.totalLost + stats.totalFound}</p>
            <p className="text-sm text-white/80">รายการทั้งหมด</p>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === "api-requests" && (
        <>
          {aiLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
            </div>
          ) : (
            <>
              {/* API Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                    {aiStats.total}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ทั้งหมด</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                    {aiStats.today}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">วันนี้</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                    {aiStats.week}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">7 วันล่าสุด</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Users className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                    {aiStats.byUser.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ผู้ใช้</p>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Chart Section - Takes 2 columns */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                  <div className="flex flex-col gap-4 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      📊 API Usage Chart
                    </h3>
                    
                    {/* 3 Dropdowns */}
                    <div className="flex flex-wrap gap-3">
                      {/* Dropdown 1: Source (Global / User) */}
                      <select
                        value={chartSource}
                        onChange={(e) => {
                          setChartSource(e.target.value as ChartSource);
                          if (e.target.value === "user" && !selectedUserId && aiStats.byUser.length > 0) {
                            setSelectedUserId(aiStats.byUser[0].userId);
                          }
                        }}
                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06C755]"
                      >
                        <option value="global">🌐 Global</option>
                        <option value="user">👤 User</option>
                      </select>

                      {/* Dropdown 2: User Selector (only show when source is "user") */}
                      {chartSource === "user" && (
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06C755] max-w-[200px]"
                        >
                          {aiStats.byUser.map((user) => {
                            const userInfo = usersMap[user.userId];
                            const displayName = userInfo?.email || userInfo?.displayName || user.userId.slice(0, 12) + '...';
                            return (
                              <option key={user.userId} value={user.userId}>
                                {displayName} ({user.count})
                              </option>
                            );
                          })}
                        </select>
                      )}

                      {/* Dropdown 3: Time Range */}
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#06C755]"
                      >
                        <option value="1h">⏱️ 1 ชั่วโมง</option>
                        <option value="1d">📅 1 วัน</option>
                        <option value="3d">📆 3 วัน</option>
                        <option value="7d">🗓️ 7 วัน</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Square Chart Container */}
                  <div className="w-full max-w-lg mx-auto">
                    <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                      <div className="absolute inset-0">
                        {(() => {
                          const chartData = getCurrentChartData();
                          return (
                            <LineChart 
                              data={chartData.data}
                              color={chartData.color}
                            />
                          );
                        })()}
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                      {getCurrentChartData().title}
                    </p>
                  </div>
                </div>

                {/* Sidebar - Stats & User List */}
                <div className="space-y-4">
                  {/* Endpoint Breakdown */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
                      🔗 Endpoints
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(aiStats.byEndpoint).map(([endpoint, count]) => (
                        <div key={endpoint} className="flex items-center justify-between">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate flex-1">
                            {endpoint}
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white ml-2">
                            {count}
                          </span>
                        </div>
                      ))}
                      {Object.keys(aiStats.byEndpoint).length === 0 && (
                        <p className="text-center text-gray-500 text-sm">ไม่มีข้อมูล</p>
                      )}
                    </div>
                  </div>

                  {/* Top Users */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
                      👥 Top Users
                    </h4>
                    <div className="space-y-2">
                      {aiStats.byUser.slice(0, 5).map((user, index) => {
                        const userInfo = usersMap[user.userId];
                        const displayName = userInfo?.email || userInfo?.displayName || user.userId.slice(0, 12) + '...';
                        const isSelected = chartSource === "user" && selectedUserId === user.userId;
                        return (
                          <button
                            key={user.userId}
                            onClick={() => {
                              setChartSource("user");
                              setSelectedUserId(user.userId);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                              isSelected
                                ? "bg-[#06C755]/10 border border-[#06C755]"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                              index === 0 ? "bg-yellow-100 text-yellow-700" :
                              index === 1 ? "bg-gray-200 text-gray-700" :
                              index === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-gray-100 text-gray-600"
                            )}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-900 dark:text-white truncate">
                                {displayName}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#06C755]">
                              {user.count}
                            </span>
                          </button>
                        );
                      })}
                      {aiStats.byUser.length === 0 && (
                        <p className="text-center text-gray-500 text-sm py-2">ไม่มีข้อมูล</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
