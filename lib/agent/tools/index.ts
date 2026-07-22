import { tool } from "ai";
import { extractVisionData } from "@/lib/vision";
import { suggestForItem } from "@/lib/match-service";
import {
  getFoundItemByIdServer,
  getLostItemByIdServer,
  getLostItemByTrackingCodeServer,
  getUserFoundItemsServer,
  getUserLostItemsServer,
  searchItemsServer,
} from "@/lib/agent/item-queries-server";
import {
  reportFoundItemServer,
  reportLostItemServer,
} from "@/lib/agent/item-actions-server";
import {
  logPrivacyAction,
  serializeFoundForViewer,
  serializeLostForLookup,
  serializeLostForViewer,
  type ViewerContext,
} from "@/lib/agent/item-privacy";
import {
  serializeFoundItem,
  serializeLostItem,
} from "@/lib/agent/row-mappers";
import type { AppSettings, LocationCoords } from "@/lib/types";
import {
  analyzeImageToolSchema,
  findMatchesToolSchema,
  getUserItemsToolSchema,
  lookupTrackingCodeToolSchema,
  reportFoundItemToolSchema,
  reportLostItemToolSchema,
  searchItemsToolSchema,
  type AgentToolEnvelope,
} from "@/lib/agent/validations/agent-tools";

function buildViewer(userId: string | null, isAdmin: boolean): ViewerContext {
  return { userId, isAdmin };
}

function isItemOwner(
  itemUserId: string | undefined | null,
  viewerUserId: string | null
): boolean {
  return Boolean(viewerUserId && itemUserId && itemUserId === viewerUserId);
}

export function createAgentTools(options: {
  userId: string | null;
  isAdmin: boolean;
  settings: AppSettings;
  /** Client-verified GPS from chat body — never from LLM. */
  clientLocation?: LocationCoords | null;
  /**
   * Explicit admin UI bypass only — never auto-bypass just because isAdmin
   * (admins testing from outside campus would otherwise skip geofence).
   */
  adminLocationBypass?: boolean;
}) {
  const {
    userId,
    isAdmin,
    settings,
    clientLocation,
    adminLocationBypass = false,
  } = options;
  const viewer = buildViewer(userId, isAdmin);

  return {
    searchItems: tool({
      description:
        "Search the public lost-item catalog — returns public-safe fields for other users' items; location must match the user query. Never guess from general knowledge.",
      inputSchema: searchItemsToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        try {
          const searchType =
            !isAdmin && input.type === "found" ? "lost" : input.type ?? "lost";
          const status = input.status ?? "searching";

          const { lost, found, filteredCount = 0 } = await searchItemsServer({
            query: input.query,
            type: searchType,
            category: input.category,
            status,
            limit: input.limit,
            mode: "agent",
          });

          const visibleFound = isAdmin
            ? found
            : found.filter((item) => isItemOwner(item.userId, userId));

          if (!isAdmin && found.length > visibleFound.length) {
            logPrivacyAction("searchItems_redact_found", userId, "non_admin");
          }
          if (filteredCount > 0) {
            logPrivacyAction("searchItems_location_filter", userId, "location_mismatch", {
              filteredCount,
            });
          }

          const serializedLost = lost.map((item) =>
            serializeLostForViewer(item, viewer)
          );
          const serializedFound = visibleFound.map((item) =>
            serializeFoundForViewer(item, viewer)
          );
          const total = serializedLost.length + serializedFound.length;

          return {
            ok: true,
            resultType: "items",
            data: {
              lost: serializedLost,
              found: serializedFound,
              total,
              exactMatch: total > 0 && filteredCount === 0,
              filteredCount,
            },
          };
        } catch (error) {
          console.error("[searchItems]", error);
          return {
            ok: false,
            resultType: "items",
            data: { lost: [], found: [], total: 0, exactMatch: false, filteredCount: 0 },
            message: "ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง",
          };
        }
      },
    }),

    lookupTrackingCode: tool({
      description:
        "Look up an item by exact tracking code the user provided — never invent codes.",
      inputSchema: lookupTrackingCodeToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        try {
          const item = await getLostItemByTrackingCodeServer(input.trackingCode);
          return {
            ok: Boolean(item),
            resultType: "tracking",
            data: item ? serializeLostForLookup(item, viewer) : null,
            message: item ? undefined : "ไม่พบรหัสติดตามนี้",
          };
        } catch (error) {
          console.error("[lookupTrackingCode]", error);
          return {
            ok: false,
            resultType: "tracking",
            data: null,
            message: "ค้นหารหัสไม่สำเร็จ ลองใหม่อีกครั้ง",
          };
        }
      },
    }),

    analyzeImage: tool({
      description:
        "Analyze an item photo for name, category, color, brand — use when an image is provided.",
      inputSchema: analyzeImageToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        try {
          let base64 = input.imageBase64;
          let mimeType = "image/jpeg";

          if (input.imageUrl?.startsWith("data:")) {
            const match = input.imageUrl.match(/^data:(.+);base64,(.*)$/);
            if (match) {
              mimeType = match[1];
              base64 = match[2];
            }
          } else if (input.imageUrl) {
            const res = await fetch(input.imageUrl);
            if (!res.ok) {
              return {
                ok: false,
                resultType: "vision",
                data: null,
                message: "โหลดรูปภาพไม่สำเร็จ",
              };
            }
            const buf = await res.arrayBuffer();
            base64 = Buffer.from(buf).toString("base64");
            mimeType = res.headers.get("content-type") || mimeType;
          }

          if (!base64) {
            return {
              ok: false,
              resultType: "vision",
              data: null,
              message: "ต้องระบุ imageUrl หรือ imageBase64",
            };
          }

          const result = await extractVisionData(base64, mimeType, {
            model: settings.aiVisionModel,
            temperature: settings.aiVisionTemperature,
            topP: settings.aiVisionTopP,
            maxOutputTokens: settings.aiVisionMaxOutputTokens,
          });
          const data =
            result && typeof result === "object" && "data" in result
              ? (result as { data: unknown }).data
              : result;
          return {
            ok: Boolean(data),
            resultType: "vision",
            data: data ?? null,
          };
        } catch (error) {
          console.error("[analyzeImage]", error);
          return {
            ok: false,
            resultType: "vision",
            data: null,
            message: "วิเคราะห์รูปไม่สำเร็จ",
          };
        }
      },
    }),

    findMatches: tool({
      description:
        "Find likely matches for a lost/found item the caller owns. Compares against the campus catalog; contacts of other users stay privacy-redacted.",
      inputSchema: findMatchesToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        try {
          if (input.type === "lost") {
            const lostItem = await getLostItemByIdServer(input.itemId);
            if (!lostItem) {
              return {
                ok: false,
                resultType: "match",
                data: [],
                message: "ไม่พบรายการของหาย",
              };
            }
            if (!isAdmin && !isItemOwner(lostItem.userId, userId)) {
              logPrivacyAction("findMatches_forbidden", userId, "not_owner", {
                itemId: input.itemId,
              });
              return {
                ok: false,
                resultType: "match",
                data: [],
                message: "ไม่มีสิทธิ์จับคู่รายการนี้",
              };
            }
          } else {
            const foundItem = await getFoundItemByIdServer(input.itemId);
            if (!foundItem) {
              return {
                ok: false,
                resultType: "match",
                data: [],
                message: "ไม่พบรายการของเจอ",
              };
            }
            if (!isAdmin && !isItemOwner(foundItem.userId, userId)) {
              logPrivacyAction("findMatches_forbidden", userId, "not_owner", {
                itemId: input.itemId,
              });
              return {
                ok: false,
                resultType: "match",
                data: [],
                message: "ไม่มีสิทธิ์จับคู่รายการนี้",
              };
            }
          }

          // Cross-user catalog matching via shared match service; serialize for privacy.
          const matches = await suggestForItem({
            type: input.type,
            itemId: input.itemId,
            useAI: Boolean(input.useAI),
            settings,
          });

          return {
            ok: true,
            resultType: "match",
            data: matches.map((m) => ({
              score: m.score,
              confidence: m.confidence,
              scorePercentage: m.scorePercentage,
              reasons: m.reasons,
              lostItem: serializeLostForViewer(m.lostItem, viewer),
              foundItem: serializeFoundForViewer(m.foundItem, viewer),
            })),
          };
        } catch (error) {
          console.error("[findMatches]", error);
          return {
            ok: false,
            resultType: "match",
            data: [],
            message: "จับคู่ไม่สำเร็จ ลองใหม่อีกครั้ง",
          };
        }
      },
    }),

    getUserItems: tool({
      description:
        "List lost and found items reported by the current user — use when the user asks about their own items.",
      inputSchema: getUserItemsToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        if (!userId) {
          return {
            ok: false,
            resultType: "items",
            data: { lost: [], found: [], total: 0 },
            message: "ต้องเข้าสู่ระบบก่อน",
          };
        }
        try {
          const [lostItems, foundItems] = await Promise.all([
            getUserLostItemsServer(userId, input.limit),
            getUserFoundItemsServer(userId, input.limit),
          ]);
          return {
            ok: true,
            resultType: "items",
            data: {
              lost: lostItems.map(serializeLostItem),
              found: foundItems.map(serializeFoundItem),
              total: lostItems.length + foundItems.length,
            },
          };
        } catch (error) {
          console.error("[getUserItems]", error);
          return {
            ok: false,
            resultType: "items",
            data: { lost: [], found: [], total: 0 },
            message: "ดึงรายการไม่สำเร็จ",
          };
        }
      },
    }),

    reportLostItem: tool({
      description:
        "Report a lost item immediately — extract fields from the user message and call directly (do not use extractItemInfo).",
      inputSchema: reportLostItemToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        if (!userId) {
          return {
            ok: false,
            resultType: "report",
            data: null,
            message: "ต้องเข้าสู่ระบบก่อนแจ้งของหาย",
          };
        }
        try {
          const result = await reportLostItemServer({
            userId,
            ...input,
          });
          if (!result.ok) {
            return {
              ok: false,
              resultType: "report",
              data: null,
              message: result.message,
            };
          }
          const { item, matches } = result;
          return {
            ok: true,
            resultType: "report",
            data: {
              type: "lost" as const,
              item: serializeLostItem(item),
              matches: matches.map((m) => ({
                ...m,
                lostItem: serializeLostForViewer(m.lostItem, viewer),
                foundItem: serializeFoundForViewer(m.foundItem, viewer),
              })),
            },
          };
        } catch (error) {
          console.error("[reportLostItem]", error);
          return {
            ok: false,
            resultType: "report",
            data: null,
            message: "บันทึกรายการไม่สำเร็จ กรุณาตรวจสอบชื่อของและสถานที่แล้วลองใหม่",
          };
        }
      },
    }),

    reportFoundItem: tool({
      description:
        "Report a found item immediately — extract fields from the user message and call directly (do not use extractItemInfo).",
      inputSchema: reportFoundItemToolSchema,
      execute: async (input): Promise<AgentToolEnvelope> => {
        if (!userId) {
          return {
            ok: false,
            resultType: "report",
            data: null,
            message: "ต้องเข้าสู่ระบบก่อนแจ้งเจอของ",
          };
        }
        try {
          const result = await reportFoundItemServer(
            {
              userId,
              ...input,
              locationCoords: clientLocation ?? null,
              bypassLocationCheck: Boolean(isAdmin && adminLocationBypass),
            },
            settings
          );
          if (!result.ok) {
            return {
              ok: false,
              resultType: "report",
              data: {
                locationBlocked: Boolean(result.locationCode),
                locationCode: result.locationCode ?? null,
              },
              message: result.message,
            };
          }
          const { item, matches } = result;
          return {
            ok: true,
            resultType: "report",
            data: {
              type: "found" as const,
              item: serializeFoundItem(item),
              matches: matches.map((m) => ({
                ...m,
                lostItem: serializeLostForViewer(m.lostItem, viewer),
                foundItem: serializeFoundForViewer(m.foundItem, viewer),
              })),
            },
          };
        } catch (error) {
          console.error("[reportFoundItem]", error);
          return {
            ok: false,
            resultType: "report",
            data: null,
            message: "บันทึกรายการไม่สำเร็จ กรุณาตรวจสอบรายละเอียดและสถานที่แล้วลองใหม่",
          };
        }
      },
    }),
  };
}

export type FoundUAgentTools = ReturnType<typeof createAgentTools>;
