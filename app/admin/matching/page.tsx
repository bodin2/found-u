"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react";
import {
    Search,
    CheckCircle,
    XCircle,
    Loader2,
    Package,
    MapPin,
    Calendar,
    ArrowRight,
    Sparkles,
    AlertCircle,
    Eye,
    Zap,
    RefreshCw,
} from "lucide-react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn, formatThaiDate } from "@/lib/utils";
import { findMatchesForLostItem, findMatchesForFoundItem, MatchScore, getMatchConfidence } from "@/lib/matching";
import { logItemMatched } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";
import { useCategories } from "@/contexts/DataContext";
import type { LostItem, FoundItem } from "@/lib/types";

// Confidence colors
const CONFIDENCE_COLORS = {
    high: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", label: "สูง" },
    medium: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600 dark:text-yellow-400", label: "ปานกลาง" },
    low: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-400", label: "ต่ำ" },
};

// Extended match with display info
interface DisplayMatch extends MatchScore {
    key: string;
}

export default function AdminMatchingPage() {
    const { user } = useAuth();
    const { categories, getCategoryByValue } = useCategories();
    const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
    const [lostItems, setLostItems] = useState<LostItem[]>([]);
    const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // View mode: 'select' (old) or 'auto' (new auto-matching)
    const [viewMode, setViewMode] = useState<"select" | "auto">("auto");

    // Auto-matching state
    const [allMatches, setAllMatches] = useState<DisplayMatch[]>([]);
    const [loadingAutoMatch, setLoadingAutoMatch] = useState(false);
    const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all");

    // Selected item for matching (select mode)
    const [selectedItem, setSelectedItem] = useState<LostItem | FoundItem | null>(null);
    const [matches, setMatches] = useState<MatchScore[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [confirmingMatch, setConfirmingMatch] = useState<string | null>(null);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Load items
    useEffect(() => {
        let loadedCount = 0;
        const checkLoaded = () => {
            loadedCount++;
            if (loadedCount >= 2) {
                setLoading(false);
            }
        };

        // Lost items (searching only)
        const unsubLost = onSnapshot(
            query(collection(db, "lostItems"), where("status", "==", "searching")),
            (snapshot) => {
                const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LostItem));
                setLostItems(items);
                checkLoaded();
            },
            () => checkLoaded()
        );

        // Found items (found status only)
        const unsubFound = onSnapshot(
            query(collection(db, "foundItems"), where("status", "==", "found")),
            (snapshot) => {
                const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FoundItem));
                setFoundItems(items);
                checkLoaded();
            },
            () => checkLoaded()
        );

        return () => {
            unsubLost();
            unsubFound();
        };
    }, []);

    // Auto-match all items when data changes
    const runAutoMatch = () => {
        if (allMatches.length === 0) setLoadingAutoMatch(true);

        // Run matching in next tick for better UX
        setTimeout(() => {
            const matchResults: DisplayMatch[] = [];
            const seenPairs = new Set<string>();

            // Find matches for all lost items
            for (const lostItem of lostItems) {
                const itemMatches = findMatchesForLostItem(lostItem, foundItems);
                for (const match of itemMatches) {
                    const key = `${match.lostItem.id}_${match.foundItem.id}`;
                    if (!seenPairs.has(key)) {
                        seenPairs.add(key);
                        matchResults.push({ ...match, key });
                    }
                }
            }

            // Sort by score descending
            matchResults.sort((a, b) => b.score - a.score);
            setAllMatches(matchResults);
            setLoadingAutoMatch(false);
        }, 100);
    };

    // Run auto-match when items change
    useEffect(() => {
        if (!loading && lostItems.length > 0 && foundItems.length > 0) {
            runAutoMatch();
        } else if (!loading) {
            setAllMatches([]);
            setLoadingAutoMatch(false);
        }
    }, [loading, lostItems.length, foundItems.length]);

    // Filter matches by confidence
    const filteredAutoMatches = useMemo(() => {
        if (confidenceFilter === "all") return allMatches;
        return allMatches.filter(m => m.confidence === confidenceFilter);
    }, [allMatches, confidenceFilter]);

    // Find matches when item is selected
    const handleSelectItem = (item: LostItem | FoundItem) => {
        setSelectedItem(item);
        setLoadingMatches(true);

        // Run matching algorithm
        setTimeout(() => {
            if (activeTab === "lost") {
                const lostItem = item as LostItem;
                const matchResults = findMatchesForLostItem(lostItem, foundItems);
                setMatches(matchResults);
            } else {
                const foundItem = item as FoundItem;
                const matchResults = findMatchesForFoundItem(foundItem, lostItems);
                setMatches(matchResults);
            }
            setLoadingMatches(false);
        }, 100); // Small delay for UX
    };

    // Confirm match
    const handleConfirmMatch = async (matchScore: MatchScore) => {

        const lostId = matchScore.lostItem.id;
        const foundId = matchScore.foundItem.id;

        // Prevent double matching
        if (processingIds.has(lostId) || processingIds.has(foundId)) return;

        setConfirmingMatch(`${lostId}_${foundId}`);
        setProcessingIds(prev => new Set(prev).add(lostId).add(foundId));

        try {
            // Update both items with matched IDs
            await updateDoc(doc(db, "lostItems", lostId), {
                matchedFoundId: foundId,
                status: "found",
            });

            await updateDoc(doc(db, "foundItems", foundId), {
                matchedLostId: lostId,
                status: "claimed",
            });

            // Log the match
            await logItemMatched(
                lostId,
                matchScore.lostItem.itemName,
                foundId,
                matchScore.foundItem.description.substring(0, 50),
                user?.email || undefined
            );

            // Reset selection
            setSelectedItem(null);
            setMatches([]);
            alert("จับคู่สำเร็จ!");
        } catch (error) {
            console.error("Error confirming match:", error);
            alert("เกิดข้อผิดพลาด");
            // Clear processing IDs on error
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(lostId);
                next.delete(foundId);
                return next;
            });
        } finally {
            setConfirmingMatch(null);
            // We don't remove from processingIds immediately if successful because they will be removed from the list anyway
            // But if error, we must remove them to allow retry
            if (activeTab) { // Just a dummy check, we want to clear on error mostly, but clearing always is safer if list doesn't update fast enough?
                // Actually, if we clear immediately, user might click again before list update.
                // Better to clear only on error, OR let the list update clear them?
                // Since they vanish from list, clearing isn't strictly necessary for success case.
                // But let's clear on error.
            }
        }
    };

    // Filter items by search
    const filteredItems = (activeTab === "lost" ? lostItems : foundItems).filter((item: any) => {
        const searchLower = searchQuery.toLowerCase();
        if (!searchLower) return true;
        return (
            item.trackingCode?.toLowerCase().includes(searchLower) ||
            item.itemName?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            (item.locationLost || item.locationFound)?.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-[#06C755]" />
                        Matching
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        จับคู่ของหายกับของเจอ ด้วย AI-assisted matching
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode("auto")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                            viewMode === "auto"
                                ? "bg-[#06C755] text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                    >
                        <Zap className="w-4 h-4" />
                        Auto Match
                    </button>
                    <button
                        onClick={() => setViewMode("select")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            viewMode === "select"
                                ? "bg-[#06C755] text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        )}
                    >
                        เลือกเอง
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">ของหายรอจับคู่</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{lostItems.length}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <p className="text-sm text-green-600 dark:text-green-400">ของเจอรอจับคู่</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{foundItems.length}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <p className="text-sm text-purple-600 dark:text-purple-400">คู่ที่อาจตรงกัน</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{allMatches.length}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">ความมั่นใจสูง</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {allMatches.filter(m => m.confidence === "high").length}
                    </p>
                </div>
            </div>

            {/* Auto Match View */}
            {viewMode === "auto" && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header with filters */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-purple-500" />
                                คู่ที่อาจตรงกันทั้งหมด
                            </h2>
                            <div className="flex gap-1">
                                {(["all", "high", "medium", "low"] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setConfidenceFilter(level)}
                                        className={cn(
                                            "px-2 py-1 rounded text-xs font-medium transition-colors",
                                            confidenceFilter === level
                                                ? level === "high" ? "bg-green-500 text-white"
                                                    : level === "medium" ? "bg-yellow-500 text-white"
                                                        : level === "low" ? "bg-gray-500 text-white"
                                                            : "bg-[#06C755] text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        )}
                                    >
                                        {level === "all" ? "ทั้งหมด" : level === "high" ? "สูง" : level === "medium" ? "กลาง" : "ต่ำ"}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={runAutoMatch}
                            disabled={loadingAutoMatch}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-4 h-4", loadingAutoMatch && "animate-spin")} />
                            รีเฟรช
                        </button>
                    </div>

                    {/* Match List */}
                    <div className="max-h-[600px] overflow-y-auto">
                        {loadingAutoMatch ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                                <p className="text-gray-500">กำลังค้นหาการจับคู่...</p>
                            </div>
                        ) : filteredAutoMatches.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>ไม่พบรายการที่ตรงกัน</p>
                                <p className="text-xs mt-1">ระบบจะแสดงเมื่อมีรายการที่คล้ายกัน</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredAutoMatches.map((match) => {
                                    const confidenceConfig = CONFIDENCE_COLORS[match.confidence];
                                    const isConfirming = confirmingMatch === match.key;
                                    const isLocked = processingIds.has(match.lostItem.id) || processingIds.has(match.foundItem.id);

                                    return (
                                        <div key={match.key} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            {/* Match pair header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", confidenceConfig.bg, confidenceConfig.text)}>
                                                    {Math.round(match.score * 100)}% {confidenceConfig.label}
                                                </span>
                                                <button
                                                    onClick={() => handleConfirmMatch(match)}
                                                    disabled={isConfirming || isLocked}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                        isLocked && !isConfirming ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500" : "bg-[#06C755] text-white hover:bg-[#05b34d]"
                                                    )}
                                                >
                                                    {isConfirming ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    ยืนยันจับคู่
                                                </button>
                                            </div>

                                            {/* Two items side by side */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Lost Item */}
                                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">{getCategoryByValue(match.lostItem.category)?.icon || "📦"}</span>
                                                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">ของหาย</span>
                                                    </div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                        {match.lostItem.itemName}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{match.lostItem.locationLost}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">{match.lostItem.trackingCode}</p>
                                                </div>

                                                {/* Found Item */}
                                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">📦</span>
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">ของเจอ</span>
                                                    </div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                        {match.foundItem.description?.substring(0, 30)}...
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{match.foundItem.locationFound}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">{match.foundItem.trackingCode}</p>
                                                </div>
                                            </div>

                                            {/* Match reasons */}
                                            {match.reasons.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1">
                                                    {match.reasons.map((reason, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Select Mode - Main Content */}
            {viewMode === "select" && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left: Item List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => { setActiveTab("lost"); setSelectedItem(null); setMatches([]); }}
                                className={cn(
                                    "flex-1 py-3 px-4 text-sm font-medium transition-colors",
                                    activeTab === "lost"
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b-2 border-red-500"
                                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                🔴 ของหาย ({lostItems.length})
                            </button>
                            <button
                                onClick={() => { setActiveTab("found"); setSelectedItem(null); setMatches([]); }}
                                className={cn(
                                    "flex-1 py-3 px-4 text-sm font-medium transition-colors",
                                    activeTab === "found"
                                        ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-b-2 border-green-500"
                                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                🟢 ของเจอ ({foundItems.length})
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="ค้นหา..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] text-sm text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Item List */}
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>ไม่พบรายการ</p>
                                </div>
                            ) : (
                                filteredItems.map((item: any) => {
                                    const isLost = activeTab === "lost";
                                    const isSelected = selectedItem?.id === item.id;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectItem(item)}
                                            className={cn(
                                                "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                                isSelected && "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0",
                                                    isLost ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"
                                                )}>
                                                    {isLost ? (getCategoryByValue(item.category)?.icon || "📦") : "📦"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                        {isLost ? item.itemName : item.description?.substring(0, 30) + "..."}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{isLost ? item.locationLost : item.locationFound}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">{item.trackingCode}</p>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Match Results */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                ผลการจับคู่
                            </h2>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto">
                            {!selectedItem ? (
                                <div className="p-8 text-center text-gray-500">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>เลือกรายการจากทางซ้ายเพื่อดูการจับคู่</p>
                                </div>
                            ) : loadingMatches ? (
                                <div className="p-8 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                                    <p className="text-gray-500">กำลังค้นหาการจับคู่...</p>
                                </div>
                            ) : matches.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>ไม่พบรายการที่ตรงกัน</p>
                                    <p className="text-xs mt-1">ระบบจะแสดงเมื่อมีรายการที่คล้ายกัน</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {matches.map((match, index) => {
                                        const isLostTab = activeTab === "lost";
                                        const displayItem = isLostTab ? match.foundItem : match.lostItem;
                                        const confidenceConfig = CONFIDENCE_COLORS[match.confidence];
                                        const matchKey = `${match.lostItem.id}_${match.foundItem.id}`;
                                        const isConfirming = confirmingMatch === matchKey;

                                        return (
                                            <div key={index} className="p-4">
                                                {/* Match Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", confidenceConfig.bg, confidenceConfig.text)}>
                                                            {Math.round(match.score * 100)}% {confidenceConfig.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Match Item */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0",
                                                        isLostTab ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                                                    )}>
                                                        {isLostTab ? "📦" : (getCategoryByValue((displayItem as LostItem).category)?.icon || "📦")}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {isLostTab ? (displayItem as FoundItem).description?.substring(0, 40) : (displayItem as LostItem).itemName}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            <MapPin className="w-3 h-3" />
                                                            <span>{isLostTab ? (displayItem as FoundItem).locationFound : (displayItem as LostItem).locationLost}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>{formatThaiDate(new Date(isLostTab ? (displayItem as FoundItem).dateFound : (displayItem as LostItem).dateLost))}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Match Reasons */}
                                                {match.reasons.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-xs text-gray-500 mb-1">เหตุผล:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {match.reasons.map((reason, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                                                                    {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Score Bar */}
                                                <div className="mb-3">
                                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                match.confidence === "high" ? "bg-green-500" : match.confidence === "medium" ? "bg-yellow-500" : "bg-gray-400"
                                                            )}
                                                            style={{ width: `${match.score * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleConfirmMatch(match)}
                                                        disabled={isConfirming}
                                                        className="flex-1 py-2 px-4 bg-[#06C755] text-white rounded-lg font-medium hover:bg-[#05b34d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isConfirming ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="w-4 h-4" />
                                                        )}
                                                        ยืนยันจับคู่
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
