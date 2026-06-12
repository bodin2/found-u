"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  subscribeToCategories,
  subscribeToContactTypes,
  subscribeToLocations,
  type CategoryConfig,
  type ContactTypeConfig,
  type LocationConfig,
} from "@/lib/database";

export interface Category extends CategoryConfig {}
export interface Location extends LocationConfig {}
export interface ContactType extends ContactTypeConfig {}

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
  { id: "d-0", value: "personnel_office", label: "ห้องบุคคล (ห้องปกครอง)", order: 1 },
  { id: "d-1", value: "admin_office", label: "ห้องธุรการ", order: 2 },
  { id: "d-2", value: "canteen", label: "โรงอาหาร", order: 3 },
  { id: "d-3", value: "library", label: "ห้องสมุด", order: 4 },
  { id: "d-4", value: "security", label: "ห้องรปภ.", order: 5 },
  { id: "d-5", value: "other", label: "อื่นๆ", order: 6 },
];

const DEFAULT_CONTACT_TYPES: ContactType[] = [
  { id: "d-1", value: "phone", label: "เบอร์โทรศัพท์", icon: "📞", placeholder: "0812345678", order: 1 },
  { id: "d-2", value: "line", label: "LINE ID", icon: "💬", placeholder: "@lineid", order: 2 },
  { id: "d-3", value: "instagram", label: "Instagram", icon: "📷", placeholder: "@username", order: 3 },
  { id: "d-4", value: "facebook", label: "Facebook", icon: "📘", placeholder: "ชื่อ Facebook", order: 4 },
  { id: "d-5", value: "email", label: "Email", icon: "📧", placeholder: "email@example.com", order: 5 },
];

interface DataContextType {
  categories: Category[];
  locations: Location[];
  contactTypes: ContactType[];
  loading: boolean;
  getCategoryByValue: (value: string) => Category | undefined;
  getLocationByValue: (value: string) => Location | undefined;
  getContactTypeByValue: (value: string) => ContactType | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);
  const [contactTypes, setContactTypes] = useState<ContactType[]>(DEFAULT_CONTACT_TYPES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 3) setLoading(false);
    };

    const unsubCategories = subscribeToCategories((data) => {
      setCategories(data.length ? data : DEFAULT_CATEGORIES);
      checkLoaded();
    });

    const unsubLocations = subscribeToLocations((data) => {
      setLocations(data.length ? data : DEFAULT_LOCATIONS);
      checkLoaded();
    });

    const unsubContactTypes = subscribeToContactTypes((data) => {
      setContactTypes(data.length ? data : DEFAULT_CONTACT_TYPES);
      checkLoaded();
    });

    return () => {
      unsubCategories();
      unsubLocations();
      unsubContactTypes();
    };
  }, []);

  const getCategoryByValue = (value: string) => categories.find((item) => item.value === value);
  const getLocationByValue = (value: string) => locations.find((item) => item.value === value);
  const getContactTypeByValue = (value: string) => contactTypes.find((item) => item.value === value);

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

export function useAppData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useAppData must be used within DataProvider");
  return context;
}
