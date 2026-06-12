import { z } from "zod";

const contactInfoSchema = z.object({
  type: z.enum(["phone", "line", "instagram", "facebook", "email"]),
  value: z.string().min(1),
});

const locationCoordsSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  source: z.enum(["gps", "map", "manual"]).optional(),
});

const itemStatusSchema = z.enum(["searching", "pending_room_confirm", "found", "claimed", "expired"]);

const dateLikeSchema = z.union([z.date(), z.string(), z.number()]).transform((value) => new Date(value));

export const createLostItemSchema = z.object({
  trackingCode: z.string().min(1),
  itemName: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  locationLost: z.string().min(1),
  locationPlaceName: z.string().optional(),
  locationCoords: locationCoordsSchema.optional(),
  dateLost: dateLikeSchema,
  contacts: z.array(contactInfoSchema).default([]),
  userId: z.string().optional(),
  status: itemStatusSchema,
  matchedFoundId: z.string().optional(),
});

export const createFoundItemSchema = z.object({
  trackingCode: z.string().min(1),
  photoUrl: z.string().optional(),
  itemName: z.string().optional(),
  category: z.string().optional(),
  color: z.union([z.string(), z.null()]).optional(),
  brand: z.union([z.string(), z.null()]).optional(),
  description: z.string().min(1),
  locationFound: z.string().min(1),
  locationPlaceName: z.string().optional(),
  locationCoords: locationCoordsSchema.optional(),
  dateFound: dateLikeSchema,
  dropOffLocation: z.string().min(1),
  finderContacts: z.array(contactInfoSchema).optional(),
  userId: z.string().optional(),
  status: itemStatusSchema,
  roomHandoverConfirmed: z.boolean().optional(),
  roomHandoverConfirmedAt: dateLikeSchema.optional(),
  roomHandoverConfirmedBy: z.string().optional(),
  roomHandoverConfirmedByName: z.string().optional(),
  handoverDeadlineAt: dateLikeSchema.optional(),
  expiredAt: dateLikeSchema.optional(),
  matchedLostId: z.string().optional(),
});
