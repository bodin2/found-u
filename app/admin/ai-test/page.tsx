"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Activity,
    CheckCircle2,
    XCircle,
    Loader2,
    Clock,
    Zap,
    RefreshCw,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

interface PingResult {
    success: boolean;
    responseTime: number;
    timestamp: Date;
    message?: string;
    error?: string;
    jsonData?: any;
}

export default function AITestPage() {
    const [isPinging, setIsPinging] = useState(false);
    const [results, setResults] = useState<PingResult[]>([]);
    const [testText, setTestText] = useState("ตามหาพวงกุญแจซันซู หายตอนวันสอบธรรมะ น่าจะแถวสนามกีฬากับสหกรณ์ ใครเจอเอามาฝากห้องปกครองรี1/11(3604)หน่อย");
    const [showJson, setShowJson] = useState<{ [key: number]: boolean }>({});

    const pingAI = async () => {
        setIsPinging(true);
        const startTime = Date.now();

        try {
            const response = await fetch("/api/ner", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: testText,
                    type: "lost",
                }),
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (response.ok) {
                const data = await response.json();
                setResults((prev) => [
                    {
                        success: true,
                        responseTime,
                        timestamp: new Date(),
                        message: `Item: ${data.item || "N/A"} | Location: ${data.location || "N/A"} | Target: ${data.target || "N/A"}`,
                        jsonData: data,
                    },
                    ...prev.slice(0, 9),
                ]);
            } else {
                const errorText = await response.text();
                setResults((prev) => [
                    {
                        success: false,
                        responseTime,
                        timestamp: new Date(),
                        error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
                    },
                    ...prev.slice(0, 9),
                ]);
            }
        } catch (error) {
            const endTime = Date.now();
            setResults((prev) => [
                {
                    success: false,
                    responseTime: endTime - startTime,
                    timestamp: new Date(),
                    error: error instanceof Error ? error.message : "Unknown error",
                },
                ...prev.slice(0, 9),
            ]);
        } finally {
            setIsPinging(false);
        }
    };

    const getAverageResponseTime = () => {
        const successfulResults = results.filter((r) => r.success);
        if (successfulResults.length === 0) return 0;
        return Math.round(
            successfulResults.reduce((sum, r) => sum + r.responseTime, 0) /
            successfulResults.length
        );
    };

    const getSuccessRate = () => {
        if (results.length === 0) return 0;
        return Math.round(
            (results.filter((r) => r.success).length / results.length) * 100
        );
    };

    const getMinResponseTime = () => {
        const successfulResults = results.filter((r) => r.success);
        if (successfulResults.length === 0) return 0;
        return Math.min(...successfulResults.map(r => r.responseTime));
    };

    const getMaxResponseTime = () => {
        const successfulResults = results.filter((r) => r.success);
        if (successfulResults.length === 0) return 0;
        return Math.max(...successfulResults.map(r => r.responseTime));
    };

    const getResponseTimeDistribution = () => {
        const successfulResults = results.filter((r) => r.success);
        if (successfulResults.length === 0) return { fast: 0, medium: 0, slow: 0 };
        
        const fast = successfulResults.filter(r => r.responseTime < 1000).length;
        const medium = successfulResults.filter(r => r.responseTime >= 1000 && r.responseTime < 3000).length;
        const slow = successfulResults.filter(r => r.responseTime >= 3000).length;
        
        return { fast, medium, slow };
    };

    const toggleJson = (index: number) => {
        setShowJson(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <div className="min-h-screen bg-bg-secondary dark:bg-gray-900">
            {/* Header */}
            <header className="bg-bg-primary dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="px-4 h-16 flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-text-primary dark:text-white" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Activity className="w-6 h-6 text-line-green" />
                        <h1 className="text-lg font-semibold text-text-primary dark:text-white">
                            AI Ping Test
                        </h1>
                    </div>
                </div>
            </header>

            <main className="p-4 max-w-2xl mx-auto space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-bg-primary dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-text-primary dark:text-white">
                            {results.length}
                        </div>
                        <div className="text-xs text-text-secondary dark:text-gray-400">
                            Total Pings
                        </div>
                    </div>
                    <div className="bg-bg-primary dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-line-green">
                            {getSuccessRate()}%
                        </div>
                        <div className="text-xs text-text-secondary dark:text-gray-400">
                            Success Rate
                        </div>
                    </div>
                    <div className="bg-bg-primary dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-blue-500">
                            {getAverageResponseTime()}ms
                        </div>
                        <div className="text-xs text-text-secondary dark:text-gray-400">
                            Avg Response
                        </div>
                    </div>
                    <div className="bg-bg-primary dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl font-bold text-purple-500">
                            {getMinResponseTime()}-{getMaxResponseTime()}ms
                        </div>
                        <div className="text-xs text-text-secondary dark:text-gray-400">
                            Min-Max Range
                        </div>
                    </div>
                </div>

                {/* Response Time Distribution */}
                {results.length > 0 && (
                    <div className="bg-bg-primary dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
                            ⚡ Response Time Distribution
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <div className="text-lg font-bold text-green-500">
                                    {getResponseTimeDistribution().fast}
                                </div>
                                <div className="text-xs text-text-secondary dark:text-gray-400">
                                    Fast (&lt;1s)
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-yellow-500">
                                    {getResponseTimeDistribution().medium}
                                </div>
                                <div className="text-xs text-text-secondary dark:text-gray-400">
                                    Medium (1-3s)
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-red-500">
                                    {getResponseTimeDistribution().slow}
                                </div>
                                <div className="text-xs text-text-secondary dark:text-gray-400">
                                    Slow (&gt;3s)
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Test Text */}
                <div className="bg-bg-primary dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                        ข้อความทดสอบ
                    </label>
                    <textarea
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none text-text-primary dark:text-white focus:ring-2 focus:ring-line-green"
                    />
                </div>

                {/* Ping Button */}
                <button
                    onClick={pingAI}
                    disabled={isPinging}
                    className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                    {isPinging ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Pinging AI...
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5" />
                            🏓 Ping AI
                        </>
                    )}
                </button>

                {/* Clear Button */}
                {results.length > 0 && (
                    <button
                        onClick={() => setResults([])}
                        className="w-full py-3 rounded-xl font-medium text-text-secondary dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Clear Results
                    </button>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div className="bg-bg-primary dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">
                            📊 Results
                        </h3>
                        <div className="space-y-3">
                            {results.map((result, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-xl border ${result.success
                                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {result.success ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        <span
                                            className={`font-medium ${result.success
                                                    ? "text-green-700 dark:text-green-400"
                                                    : "text-red-700 dark:text-red-400"
                                                }`}
                                        >
                                            {result.success ? "Success" : "Failed"}
                                        </span>
                                        <span className="ml-auto flex items-center gap-1 text-sm text-text-secondary dark:text-gray-400">
                                            <Clock className="w-4 h-4" />
                                            {result.responseTime}ms
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                                        {result.message || result.error}
                                    </p>
                                    
                                    {/* JSON Response Toggle */}
                                    {result.success && result.jsonData && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => toggleJson(index)}
                                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                                            >
                                                {showJson[index] ? (
                                                    <><ChevronDown className="w-3 h-3" /> 📦 Hide JSON</>
                                                ) : (
                                                    <><ChevronRight className="w-3 h-3" /> 📦 Show JSON</>
                                                )}
                                            </button>
                                            {showJson[index] && (
                                                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                    <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                                        {JSON.stringify(result.jsonData, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <p className="text-xs text-text-tertiary dark:text-gray-500 mt-2">
                                        {result.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                        ℹ️ วิธีใช้งาน
                    </h4>
                    <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                        <li>• กดปุ่ม Ping AI เพื่อทดสอบการเชื่อมต่อกับ Gemini API</li>
                        <li>• ระบบจะส่งข้อความทดสอบและวัดเวลาตอบสนอง</li>
                        <li>• สามารถแก้ไขข้อความทดสอบได้ตามต้องการ</li>
                        <li>• ถ้า Success Rate ต่ำ แสดงว่า API อาจมีปัญหา</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
