"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Types
export interface Category {
    id: string;
    value: string;
    label: string;
    icon: string;
    order: number;
}

export interface Location {
    id: string;
    value: string;
    label: string;
    order: number;
}

export interface ContactType {
    id: string;
    value: string;
    label: string;
    icon: string;
    placeholder: string;
    order: number;
}

// Default fallback data
const DEFAULT_CATEGORIES: Category[] = [
    { id: "d-1", value: "wallet", label: "กระเป๋าสตางค์", icon: "💰", order: 1 },
    { id: "d-2", value: "phone", label: "โทรศัพท์", icon: "📱", order: 2 },
    { id: "d-3", value: "keys", label: "กุญแจ", icon: "🔑", order: 3 },
    { id: "d-4", value: "bag", label: "กระเป๋า", icon: "👜", order: 4 },
    { id: "d-5", value: "electronics", label: "อิเล็กทรอนิกส์", icon: "💻", order: 5 },
    { id: "d-6", value: "documents", label: "เอกสาร", icon: "📄", order: 6 },
    { id: "d-7", value: "clothing", label: "เสื้อผ้า", icon: "👕", order: 7 },
    { id: "d-8", value: "accessories", label: "เครื่องประดับ", icon: "💍", order: 8 },
    { id: "d-9", value: "other", label: "อื่นๆ", icon: "📦", order: 9 },
];

const DEFAULT_LOCATIONS: Location[] = [
    { id: "d-1", value: "admin_office", label: "ห้องธุรการ", order: 1 },
    { id: "d-2", value: "canteen", label: "โรงอาหาร", order: 2 },
    { id: "d-3", value: "library", label: "ห้องสมุด", order: 3 },
    { id: "d-4", value: "security", label: "ห้องรปภ.", order: 4 },
    { id: "d-5", value: "building_1", label: "ตึก 1", order: 5 },
    { id: "d-6", value: "building_2", label: "ตึก 2", order: 6 },
    { id: "d-7", value: "field", label: "สนามกีฬา", order: 7 },
    { id: "d-8", value: "parking", label: "ลานจอดรถ", order: 8 },
    { id: "d-9", value: "other", label: "อื่นๆ", order: 9 },
];

const DEFAULT_CONTACT_TYPES: ContactType[] = [
    { id: "d-1", value: "phone", label: "เบอร์โทรศัพท์", icon: "📞", placeholder: "0812345678", order: 1 },
    { id: "d-2", value: "line", label: "LINE ID", icon: "💬", placeholder: "@lineid", order: 2 },
    { id: "d-3", value: "instagram", label: "Instagram", icon: "📷", placeholder: "@username", order: 3 },
    { id: "d-4", value: "facebook", label: "Facebook", icon: "📘", placeholder: "ชื่อ Facebook", order: 4 },
    { id: "d-5", value: "email", label: "Email", icon: "📧", placeholder: "email@example.com", order: 5 },
];

// Context types
interface DataContextType {
    categories: Category[];
    locations: Location[];
    contactTypes: ContactType[];
    loading: boolean;
    getCategoryByValue: (value: string) => Category | undefined;
    getLocationByValue: (value: string) => Location | undefined;
    getContactTypeByValue: (value: string) => ContactType | undefined;
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export function DataProvider({ children }: { children: ReactNode }) {
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);
    const [contactTypes, setContactTypes] = useState<ContactType[]>(DEFAULT_CONTACT_TYPES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let loadedCount = 0;
        const checkLoaded = () => {
            loadedCount++;
            if (loadedCount >= 3 && isMounted) setLoading(false);
        };

        // Subscribe to categories
        const unsubCategories = onSnapshot(
            query(collection(db, "categories"), orderBy("order", "asc")),
            (snapshot) => {
                if (!isMounted) return;
                if (!snapshot.empty) {
                    setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category)));
                }
                checkLoaded();
            },
            (error) => {
                console.error("Error fetching categories:", error);
                if (isMounted) checkLoaded();
            }
        );

        // Subscribe to locations (global) - use getDocs for legacy fallback to avoid nested listeners
        const unsubLocations = onSnapshot(
            query(collection(db, "locations"), orderBy("order", "asc")),
            async (snapshot) => {
                if (!isMounted) return;
                if (!snapshot.empty) {
                    setLocations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Location)));
                }
                // Note: Legacy fallback removed to prevent nested listener issues
                // Use admin page to initialize data if empty
                checkLoaded();
            },
            (error) => {
                console.error("Error fetching locations:", error);
                if (isMounted) checkLoaded();
            }
        );

        // Subscribe to contact types
        const unsubContactTypes = onSnapshot(
            query(collection(db, "contactTypes"), orderBy("order", "asc")),
            (snapshot) => {
                if (!isMounted) return;
                if (!snapshot.empty) {
                    setContactTypes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ContactType)));
                }
                checkLoaded();
            },
            (error) => {
                console.error("Error fetching contact types:", error);
                if (isMounted) checkLoaded();
            }
        );

        return () => {
            isMounted = false;
            unsubCategories();
            unsubLocations();
            unsubContactTypes();
        };
    }, []);

    // Helper functions
    const getCategoryByValue = (value: string) => categories.find((c) => c.value === value);
    const getLocationByValue = (value: string) => locations.find((l) => l.value === value);
    const getContactTypeByValue = (value: string) => contactTypes.find((c) => c.value === value);

    return (
        <DataContext.Provider
            value={{
                categories,
                locations,
                contactTypes,
                loading,
                getCategoryByValue,
                getLocationByValue,
                getContactTypeByValue,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

// Hooks
export function useCategories() {
    const context = useContext(DataContext);
    if (!context) throw new Error("useCategories must be used within DataProvider");
    return {
        categories: context.categories,
        loading: context.loading,
        getCategoryByValue: context.getCategoryByValue,
    };
}

export function useLocations() {
    const context = useContext(DataContext);
    if (!context) throw new Error("useLocations must be used within DataProvider");
    return {
        locations: context.locations,
        loading: context.loading,
        getLocationByValue: context.getLocationByValue,
    };
}

export function useContactTypes() {
    const context = useContext(DataContext);
    if (!context) throw new Error("useContactTypes must be used within DataProvider");
    return {
        contactTypes: context.contactTypes,
        loading: context.loading,
        getContactTypeByValue: context.getContactTypeByValue,
    };
}

// Combined hook
export function useAppData() {
    const context = useContext(DataContext);
    if (!context) throw new Error("useAppData must be used within DataProvider");
    return context;
}
