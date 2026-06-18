"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import LoginPrompt from "@/components/auth/login-prompt";
import { StudentAppShell } from "@/components/layout/student-app-shell";
import { PageHeader } from "@/components/layout/page-header";
import InfoTooltip from "@/components/ui/info-tooltip";
import CameraCapture from "@/components/ui/camera-capture";
import MapCanvasLazy from "@/components/ui/map-canvas-lazy";
import { FormStepper, FormStepperActions } from "@/components/ui/form-stepper";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { AnimatePresence, m } from "framer-motion";
import { slideUp } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  type ContactInfo,
  type ContactType,
  DEFAULT_FOUND_DROP_OFF_LOCATION,
  type ItemCategory,
  type LocationCoords,
  getDropOffLocationLabel,
} from "@/lib/types";
import {
  cn,
  generateTrackingCode,
  isPointInPolygon,
  STRICT_GPS_MAX_ACCURACY_METERS,
} from "@/lib/utils";
import {
  addFoundItem,
  subscribeToCategories,
  subscribeToContactTypes,
  type CategoryConfig,
  type ContactTypeConfig,
} from "@/lib/database";
import { uploadFoundItemImage } from "@/lib/storage";
import {
  getCompressionOptionsFromSettings,
  getMaxUploadBytes,
} from "@/lib/image-upload-settings";
import {
  getAccuratePosition,
  getMapDisplayPosition,
  isIOSDevice,
  queryGeolocationPermission,
  watchGeolocationPermission,
} from "@/lib/geolocation";
import { useAuth } from "@/contexts/auth-context";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { useMapView } from "@/hooks/use-map-view";
import { resolveMapView } from "@/lib/map-utils";
import { logItemCreated } from "@/lib/logger";
import {
  computeHandoverDeadlineFromNow,
  formatHandoverCountdown,
  formatHandoverDeadlineThai,
  getFoundHandoverDeadlineMinutes,
  isFoundHandoverDeadlineEnabled,
} from "@/lib/found-handover";
import { triggerFoundHandoverExpirySweep } from "@/lib/found-handover-client";

type ReportMode = "vision" | "manual";

const FOUND_FORM_STEPS = [
  { id: "details", label: "รายละเอียด" },
  { id: "location", label: "สถานที่" },
  { id: "handover", label: "ส่งห้องบุคคล" },
] as const;

const PERSONNEL_OFFICE_LABEL = getDropOffLocationLabel(DEFAULT_FOUND_DROP_OFF_LOCATION);

export default function ReportFoundPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading, appSettings, appSettingsReady, isAdmin } = useAuth();
  const { showAlert, dialog } = useAppDialog();
  const reduced = useReducedMotion();
  const [formStep, setFormStep] = useState(0);

  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactTypeConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [locationErrorType, setLocationErrorType] = useState<
    | "permission"
    | "timeout"
    | "position"
    | "outside"
    | "boundary_not_configured"
    | "low_accuracy"
    | null
  >(null);
  const [userCurrentCoords, setUserCurrentCoords] = useState<LocationCoords | null>(null);

  const [reportMode, setReportMode] = useState<ReportMode>("vision");
  const [visionQuota, setVisionQuota] = useState<{
    enabled: boolean;
    userRemainingMinute: number;
    userRemainingHour: number;
    userLimitPerMinute?: number;
    userLimitPerHour?: number;
  } | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    category: "" as ItemCategory | "",
    color: "",
    brand: "",
    description: "",
    locationFound: "",
  });

  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [submittedHandoverDeadline, setSubmittedHandoverDeadline] = useState<Date | null>(null);
  const [handoverCountdownMs, setHandoverCountdownMs] = useState<number | null>(null);

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) setConfigLoading(false);
    };

    const unsubCategories = subscribeToCategories((cats) => {
      setCategories(cats);
      checkLoaded();
    });

    const unsubContactTypes = subscribeToContactTypes((types) => {
      setContactTypes(types);
      checkLoaded();
    });

    return () => {
      unsubCategories();
      unsubContactTypes();
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(AUTH_ROUTES.hub);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      void triggerFoundHandoverExpirySweep();
    }
  }, [user]);

  useEffect(() => {
    if (!showSuccess || !submittedHandoverDeadline) {
      setHandoverCountdownMs(null);
      return;
    }
    const tick = () => {
      setHandoverCountdownMs(submittedHandoverDeadline.getTime() - Date.now());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [showSuccess, submittedHandoverDeadline]);

  useEffect(() => {
    const fetchQuota = async () => {
      if (!user?.uid || reportMode !== "vision") return;
      try {
        const response = await fetch(`/api/vision?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setVisionQuota(data);
        }
      } catch (error) {
        console.error("Error fetching vision quota:", error);
      }
    };

    fetchQuota();
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, [user?.uid, reportMode]);

  const enforcementRequired = appSettingsReady && !!appSettings.mapEnforceFoundInSchool;
  const waitingForSettings =
    !authLoading && !configLoading && !!user && !appSettingsReady;
  const showLocationGate = waitingForSettings || (enforcementRequired && locationVerified !== true);

  const mapFallbackCenter = appSettings.mapDefaultCenter || { lat: 13.7563, lng: 100.5018 };
  const mapFallbackZoom = appSettings.mapDefaultZoom ?? 17;
  const schoolPolygon = appSettings.mapSchoolBoundary || [];

  const {
    center: formMapCenter,
    zoom: formMapZoom,
    fitPoints: formFitPoints,
  } = useMapView({
    enabled: appSettings.mapsEnabled,
    fallbackCenter: mapFallbackCenter,
    fallbackZoom: mapFallbackZoom,
    polygon: schoolPolygon,
    marker: locationCoords,
    locateUser: true,
  });

  const gateMapView = useMemo(
    () =>
      resolveMapView({
        fallbackCenter: mapFallbackCenter,
        fallbackZoom: mapFallbackZoom,
        polygon: schoolPolygon,
        marker: userCurrentCoords,
        userLocation: userCurrentCoords,
      }),
    [mapFallbackCenter, mapFallbackZoom, schoolPolygon, userCurrentCoords]
  );

  const verifyLocation = async () => {
    const polygon = appSettings.mapSchoolBoundary || [];

    if (!appSettings.mapEnforceFoundInSchool) {
      setLocationVerified(true);
      setLocationErrorType(null);
      setGpsLoading(false);
      return;
    }

    setLocationVerified(null);
    setLocationErrorType(null);

    if (polygon.length < 3) {
      setLocationVerified(false);
      setLocationErrorType("boundary_not_configured");
      setGpsLoading(false);
      return;
    }

    setGpsLoading(true);

    if (!navigator.geolocation) {
      setLocationErrorType("position");
      setLocationVerified(false);
      setGpsLoading(false);
      return;
    }

    const permission = await queryGeolocationPermission();
    if (permission === "denied") {
      setLocationErrorType("permission");
      setLocationVerified(false);
      setGpsLoading(false);
      return;
    }

    const result = await getAccuratePosition({
      onProgress: (coords) => setUserCurrentCoords(coords),
    });

    if (!result.ok) {
      if (result.error === "permission") {
        setLocationErrorType("permission");
      } else if (result.error === "timeout") {
        setLocationErrorType("timeout");
      } else if (result.error === "low_accuracy") {
        setLocationErrorType("low_accuracy");
      } else {
        setLocationErrorType("position");
      }
      setLocationVerified(false);
      setGpsLoading(false);
      return;
    }

    const coords = result.coords;
    setUserCurrentCoords(coords);

    const inside = isPointInPolygon(coords, polygon);
    if (inside) {
      setLocationVerified(true);
      setLocationCoords(coords);
    } else {
      setLocationVerified(false);
      setLocationErrorType("outside");
    }
    setGpsLoading(false);
  };

  const boundaryString = JSON.stringify(appSettings?.mapSchoolBoundary || []);

  useEffect(() => {
    if (!authLoading && !configLoading && appSettingsReady && user) {
      void verifyLocation();
    }
  }, [
    authLoading,
    configLoading,
    appSettingsReady,
    user,
    appSettings.mapEnforceFoundInSchool,
    boundaryString,
  ]);

  useEffect(() => {
    if (!enforcementRequired) return;

    const unwatch = watchGeolocationPermission((state) => {
      if (state === "denied") {
        setLocationVerified(false);
        setLocationErrorType("permission");
        setGpsLoading(false);
      } else if (state === "granted" && locationVerified !== true) {
        void verifyLocation();
      }
    });

    return unwatch;
  }, [enforcementRequired]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (warnings[name]) {
      setWarnings((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleContactChange = (index: number, field: "type" | "value", value: string) => {
    const nextContacts = [...contacts];
    nextContacts[index] = { ...nextContacts[index], [field]: value };
    setContacts(nextContacts);
  };

  const addContact = () => {
    if (contacts.length < 3) {
      const defaultType = contactTypes[0]?.value as ContactType | undefined;
      setContacts([...contacts, { type: defaultType || "phone", value: "" }]);
    }
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = getMaxUploadBytes(appSettings);
    if (file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      void showAlert({
        title: "ไฟล์ใหญ่เกินไป",
        message: `กรุณาเลือกรูปที่มีขนาดไม่เกิน ${maxMb} MB`,
        variant: "warning",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      void showAlert({
        title: "ไฟล์ไม่ถูกต้อง",
        message: "กรุณาเลือกไฟล์รูปภาพ (PNG, JPG)",
        variant: "warning",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    if (errors.image) setErrors((prev) => ({ ...prev, image: "" }));
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyzeVision = async (dataUrl: string) => {
    if (!user?.uid) return;
    setIsAnalyzingVision(true);
    setVisionError(null);

    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          userId: user.uid,
        }),
      });

      const result = await response.json();

      if (response.status === 429) {
        setVisionError(result.message || "AI rate limit exceeded. Please try again shortly.");
        return;
      }

      if (!response.ok || !result.data) {
        setVisionError("ไม่สามารถวิเคราะห์รูปได้ในขณะนี้");
        return;
      }

      const data = result.data;
      setFormData((prev) => ({
        ...prev,
        itemName: data.itemName || prev.itemName,
        category: data.category || prev.category,
        color: data.color || prev.color,
        brand: data.brand || prev.brand,
        description: prev.description || data.details || "",
      }));
    } catch (error) {
      console.error("Vision error:", error);
      setVisionError("เกิดข้อผิดพลาดในการวิเคราะห์รูป");
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const handleCameraCapture = async (dataUrl: string, file: File) => {
    setImagePreview(dataUrl);
    setImageFile(file);
    if (reportMode === "vision") {
      await handleAnalyzeVision(dataUrl);
    }
  };

  const handleMapSelect = (coords: LocationCoords | null) => {
    if (!coords) return;
    setLocationCoords(coords);
    setErrors((prev) => ({ ...prev, locationCoords: "" }));
  };

  const handleUseCurrentLocation = () => {
    void getMapDisplayPosition((coords) => {
      setLocationCoords(coords);
    }).then((coords) => {
      if (!coords) {
        setErrors((prev) => ({ ...prev, locationCoords: "ไม่สามารถระบุตำแหน่งได้" }));
        return;
      }
      setLocationCoords(coords);
      setErrors((prev) => ({ ...prev, locationCoords: "" }));
    });
  };

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {};
    const nextWarnings: Record<string, string> = {};

    if (step === 0) {
      if (!imageFile) {
        nextErrors.image = "กรุณาถ่ายรูปสิ่งของ";
      }
      if (!formData.description.trim() && !formData.itemName.trim()) {
        nextErrors.description = "กรุณากรอกชื่อหรือรายละเอียดของที่เจอ";
      }
      if (!formData.itemName.trim()) {
        nextWarnings.itemName = "ยังไม่ได้กรอกชื่อ (ไม่บังคับ)";
      }
      if (!formData.category) {
        nextWarnings.category = "ยังไม่ได้เลือกหมวดหมู่ (ไม่บังคับ)";
      }
      if (!formData.color.trim()) {
        nextWarnings.color = "ยังไม่ได้กรอกสี (ไม่บังคับ)";
      }
      if (!formData.brand.trim()) {
        nextWarnings.brand = "ยังไม่ได้กรอกยี่ห้อ (ไม่บังคับ)";
      }
    }

    if (step === 1) {
      if (!formData.locationFound.trim()) {
        nextErrors.locationFound = "กรุณากรอกสถานที่เจอของ";
      }
      const polygon = appSettings.mapSchoolBoundary || [];
      if (appSettings.mapEnforceFoundInSchool && polygon.length >= 3) {
        if (!locationCoords) {
          nextErrors.locationCoords = "กรุณาปักพิกัดภายในโรงเรียน";
        } else if (!isPointInPolygon(locationCoords, polygon)) {
          nextErrors.locationCoords = "พิกัดอยู่นอกพื้นที่โรงเรียน";
        }
      }
    }

    if (step === 2) {
      if (contacts.length === 0) {
        nextWarnings.contacts = "ยังไม่ได้เพิ่มช่องทางติดต่อ (ไม่บังคับ)";
      }
    }

    setErrors(nextErrors);
    setWarnings(nextWarnings);
    return Object.keys(nextErrors).length === 0;
  };

  const goNextStep = () => {
    if (!validateStep(formStep)) return;
    setFormStep((s) => Math.min(s + 1, FOUND_FORM_STEPS.length - 1));
  };

  const goPrevStep = () => {
    setFormStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(FOUND_FORM_STEPS.length - 1)) return;

    setIsSubmitting(true);
    try {
      const newTrackingCode = generateTrackingCode("found");
      setTrackingCode(newTrackingCode);

      let photoUrl = "";
      if (imageFile) {
        photoUrl = await uploadFoundItemImage(
          imageFile,
          newTrackingCode,
          true,
          getCompressionOptionsFromSettings(appSettings)
        );
      }

      const validContacts = contacts.filter((c) => c.value.trim());
      const description =
        formData.description.trim() ||
        [formData.itemName, formData.color, formData.brand].filter(Boolean).join(" ");

      const handoverDeadlineAt = computeHandoverDeadlineFromNow(appSettings);
      if (handoverDeadlineAt) {
        setSubmittedHandoverDeadline(handoverDeadlineAt);
      } else {
        setSubmittedHandoverDeadline(null);
      }

      const itemId = await addFoundItem({
        description,
        locationFound: formData.locationFound,
        locationPlaceName: formData.locationFound,
        dropOffLocation: DEFAULT_FOUND_DROP_OFF_LOCATION,
        trackingCode: newTrackingCode,
        status: "pending_room_confirm",
        roomHandoverConfirmed: false,
        dateFound: new Date(),
        ...(handoverDeadlineAt ? { handoverDeadlineAt } : {}),
        ...(photoUrl ? { photoUrl } : {}),
        ...(formData.itemName.trim() ? { itemName: formData.itemName.trim() } : {}),
        ...(formData.category ? { category: formData.category as ItemCategory } : {}),
        ...(formData.color.trim() ? { color: formData.color.trim() } : {}),
        ...(formData.brand.trim() ? { brand: formData.brand.trim() } : {}),
        ...(locationCoords ? { locationCoords } : {}),
        ...(validContacts.length > 0 ? { finderContacts: validContacts } : {}),
        ...(user?.uid ? { userId: user.uid } : {}),
      });

      await logItemCreated(
        "found",
        itemId,
        description.substring(0, 50),
        newTrackingCode,
        user?.email || undefined,
        user?.displayName || undefined
      );

      try {
        const matchResponse = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "found", itemId }),
        });
        const matchData = await matchResponse.json();
        setMatches(matchData.matches || []);
        if (matchData.matches && matchData.matches.length > 0) {
          setShowMatches(true);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      }

      setShowSuccess(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      void showAlert({
        title: "ส่งข้อมูลไม่สำเร็จ",
        message: "เกิดข้อผิดพลาด กรุณาตรวจสอบข้อมูลที่จำเป็นแล้วลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  if (!user) {
    return (
      <StudentAppShell headerTitle="แจ้งเจอของ" headerBackHref="/home">
        <LoginPrompt
          title="เข้าสู่ระบบเพื่อแจ้งเจอของ"
          description="คุณต้องเข้าสู่ระบบเพื่อแจ้งเจอของ เพื่อให้เจ้าของติดต่อกลับได้"
          feature="ช่วยให้เจ้าของได้รับของคืนอย่างปลอดภัย!"
        />
      </StudentAppShell>
    );
  }



  if (showSuccess) {
    return (
      <StudentAppShell headerTitle="แจ้งเจอของสำเร็จ" showBottomNav maxWidth="lg">
          <div className="flex flex-col items-center justify-center py-4 md:py-8">
            <div className="w-full max-w-lg bg-bg-card rounded-2xl shadow-sm border border-border-light p-6 md:p-8 animate-fade-in text-center">
              <div className="w-20 h-20 rounded-full bg-[#e8f8ef] dark:bg-[#06C755]/20 flex items-center justify-center mb-6 mx-auto animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-[#06C755]" />
              </div>

              <h2 className="text-xl font-semibold text-text-primary mb-2">
                ขอบคุณที่ช่วยส่งคืน!
              </h2>
              <p className="text-text-secondary text-center mb-8">
                ข้อมูลของคุณจะช่วยให้เจ้าของได้รับของคืน
              </p>

              <div className="w-full bg-bg-secondary rounded-2xl p-6 mb-8 border border-border-light">
                <p className="text-sm text-text-secondary text-center mb-2">รหัสอ้างอิง</p>
                <p className="text-2xl font-bold text-[#06C755] text-center tracking-wider font-mono">
                  {trackingCode}
                </p>
                <p className="text-xs text-text-tertiary text-center mt-3">
                  ส่งรหัสนี้ให้เจ้าของเพื่อมารับของคืน
                </p>
              </div>

              <div className="w-full bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300 text-center font-medium">
                  ขั้นตอนถัดไป: นำของไปส่งที่ {PERSONNEL_OFFICE_LABEL}
                </p>
                {isFoundHandoverDeadlineEnabled(appSettings) && submittedHandoverDeadline && (
                  <div className="mt-3 rounded-lg bg-white/70 dark:bg-black/20 px-3 py-2 text-center">
                    <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                      ภายใน {getFoundHandoverDeadlineMinutes(appSettings)} นาที (
                      {formatHandoverDeadlineThai(submittedHandoverDeadline)})
                    </p>
                    {handoverCountdownMs !== null && (
                      <p
                        className={cn(
                          "text-sm font-semibold mt-1",
                          handoverCountdownMs <= 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-800 dark:text-amber-300"
                        )}
                      >
                        {handoverCountdownMs <= 0
                          ? "หมดเวลาแล้ว — คำขอจะถูกยกเลิกอัตโนมัติ"
                          : `เหลือเวลาอีก ${formatHandoverCountdown(handoverCountdownMs)}`}
                      </p>
                    )}
                    <p className="text-xs text-amber-700/90 dark:text-amber-400/80 mt-2">
                      หากไม่นำของถึงห้องบุคคลภายในเวลาที่กำหนด คำขอแจ้งเจอของจะหมดอายุทันที
                    </p>
                  </div>
                )}
                <p className="text-xs text-amber-700/90 dark:text-amber-400/90 text-center mt-2 leading-relaxed">
                  เจ้าหน้าที่ห้องบุคคลจะยืนยันเมื่อรับของแล้ว จากนั้นเจ้าของจึงจะมารับคืนได้อย่างปลอดภัย
                </p>
              </div>

              <div className="w-full bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-8">
                <p className="text-sm text-blue-700 dark:text-blue-400 text-center">
                  สถานะปัจจุบัน: <span className="font-semibold">รอส่งห้องบุคคล</span>
                </p>
              </div>

              {showMatches && matches.length > 0 && (
                <div className="mt-6 text-left">
                  <div className="bg-[#e8f8ef] dark:bg-[#06C755]/10 rounded-xl p-4 border border-[#06C755]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-5 h-5 text-[#06C755]" />
                      <h3 className="font-semibold text-text-primary">
                        พบของหายที่อาจตรงกัน ({matches.length} รายการ)
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {matches.slice(0, 3).map((match: any) => (
                        <div
                          key={match.lostItem.id}
                          className="bg-bg-card rounded-lg p-3 border border-border-light shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary text-sm truncate">
                                {match.lostItem.itemName}
                              </p>
                              <p className="text-xs text-text-secondary mt-1 truncate">
                                📍 {match.lostItem.locationLost}
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    match.confidence === "high"
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : match.confidence === "medium"
                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                                  )}
                                >
                                  ความน่าจะเป็น {match.scorePercentage}%
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                router.push(`/tracking?code=${match.lostItem.trackingCode}`)
                              }
                              className="ml-3 px-3 py-1.5 bg-[#06C755] text-white text-xs rounded-lg hover:bg-[#05b34d] transition-colors flex-shrink-0"
                            >
                              ดู
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push(`/tracking?code=${trackingCode}`)}
                      className="w-full mt-3 py-2 text-sm text-[#06C755] hover:text-[#05b34d] font-medium"
                    >
                      ดูทั้งหมด →
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full space-y-3 mt-8">
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setFormData({
                      itemName: "",
                      category: "",
                      color: "",
                      brand: "",
                      description: "",
                      locationFound: "",
                    });
                    setFormStep(0);
                    setSubmittedHandoverDeadline(null);
                    setContacts([]);
                    setImagePreview(null);
                    setImageFile(null);
                    setLocationCoords(null);
                    setShowMatches(false);
                    setMatches([]);
                    setErrors({});
                    setWarnings({});
                  }}
                  className="w-full py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors shadow-sm"
                >
                  แจ้งเจอของอีกชิ้น
                </button>
                <button
                  onClick={() => router.push("/home")}
                  className="w-full py-3 bg-bg-secondary text-text-secondary rounded-xl font-medium hover:bg-bg-tertiary transition-colors border border-border-light"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          </div>
      </StudentAppShell>
    );
  }

  return (
    <StudentAppShell headerTitle="แจ้งเจอของ" headerBackHref="/home" showBottomNav maxWidth="lg">
      <div className={cn(showLocationGate && "blur-sm pointer-events-none select-none")}>
        <PageHeader
          title="แจ้งเจอของ"
          subtitle="กรอกข้อมูลให้ละเอียดเพื่อให้เจ้าของตามหาของได้ง่ายขึ้น"
          className="hidden md:flex mb-6"
        />

        <FormStepper steps={[...FOUND_FORM_STEPS]} currentStep={formStep} className="mb-6" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (formStep < FOUND_FORM_STEPS.length - 1) goNextStep();
            else void handleSubmit();
          }}
          className="pb-4"
        >
          <AnimatePresence mode="wait">
            <m.div
              key={formStep}
              initial={reduced ? false : slideUp.initial}
              animate={slideUp.animate}
              exit={slideUp.exit}
              transition={slideUp.transition}
              className="space-y-5"
            >
          {formStep === 0 && (
          <>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setReportMode("vision")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                reportMode === "vision"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              <Camera className="w-4 h-4" />
              ถ่ายรูปด้วย AI
            </button>
            <button
              type="button"
              onClick={() => setReportMode("manual")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                reportMode === "manual"
                  ? "bg-[#06C755] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              ✍️ กรอกเอง
            </button>
          </div>

          {reportMode === "vision" && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-4 mb-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">ถ่ายรูปสิ่งของ</h3>
                <InfoTooltip
                  content="ระบบจะวิเคราะห์รูปเพื่อเดาชื่อของ หมวดหมู่ สี และยี่ห้อ"
                  position="bottom"
                />
              </div>
              <CameraCapture
                previewUrl={imagePreview}
                onCapture={handleCameraCapture}
                onClear={clearImage}
                labels={{
                  start: "เปิดกล้อง",
                  capture: "ถ่ายรูป",
                  retake: "ถ่ายใหม่",
                  unavailable: "ไม่พบกล้องในอุปกรณ์นี้",
                  idle: "กล้องยังไม่ถูกเปิด",
                }}
              />
              {errors.image && (
                <div className="mt-2 text-xs text-red-500">{errors.image}</div>
              )}
              {visionQuota && visionQuota.enabled && (
                <div className="mt-3 text-xs text-green-700 dark:text-green-300">
                  เหลือ {visionQuota.userRemainingMinute}/{visionQuota.userLimitPerMinute || 5} ครั้ง/นาที
                </div>
              )}
              {isAnalyzingVision && (
                <div className="mt-3 text-sm text-green-700">กำลังวิเคราะห์รูป...</div>
              )}
              {visionError && (
                <div className="mt-3 text-sm text-red-500">{visionError}</div>
              )}
            </div>
          )}

          {reportMode === "manual" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                รูปถ่ายสิ่งของ <span className="text-red-500">*</span>
              </label>

              {errors.image && (
                <p className="text-xs text-red-500 mb-2">{errors.image}</p>
              )}

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center gap-3 hover:border-[#06C755] hover:bg-[#e8f8ef]/30 dark:hover:bg-[#06C755]/10 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-600 flex items-center justify-center shadow-sm">
                    <ImagePlus className="w-7 h-7 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      แตะเพื่ออัปโหลดรูป
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG สูงสุด 5MB</p>
                  </div>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ชื่อของที่เจอ
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleFormChange}
                placeholder="เช่น กระเป๋าสตางค์"
                className={cn("input-line", warnings.itemName && "ring-1 ring-amber-300")}
              />
              {warnings.itemName && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{warnings.itemName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                หมวดหมู่
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className={cn(
                    "input-line appearance-none pr-10",
                    !formData.category && "text-gray-400",
                    warnings.category && "ring-1 ring-amber-300"
                  )}
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {warnings.category && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{warnings.category}</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  สี
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleFormChange}
                  placeholder="เช่น ดำ"
                  className={cn("input-line", warnings.color && "ring-1 ring-amber-300")}
                />
                {warnings.color && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{warnings.color}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ยี่ห้อ
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleFormChange}
                  placeholder="เช่น Apple"
                  className={cn("input-line", warnings.brand && "ring-1 ring-amber-300")}
                />
                {warnings.brand && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{warnings.brand}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                รายละเอียดของที่เจอ <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="เช่น มีเคสสีดำ มีรอยสติกเกอร์"
                rows={3}
                className={cn(
                  "input-line resize-none",
                  errors.description && "ring-2 ring-red-200 bg-red-50"
                )}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1.5">{errors.description}</p>
              )}
            </div>
          </>
          )}

          {formStep === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                สถานที่เจอ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="locationFound"
                value={formData.locationFound}
                onChange={handleFormChange}
                placeholder="เช่น ม้านั่งหน้าห้องสมุด"
                className={cn(
                  "input-line",
                  errors.locationFound && "ring-2 ring-red-200 bg-red-50"
                )}
              />
              {errors.locationFound && (
                <p className="text-xs text-red-500 mt-1.5">{errors.locationFound}</p>
              )}
            </div>

            {appSettings.mapsEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ปักพิกัดบนแผนที่
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="text-xs text-[#06C755] hover:text-[#05b34d] flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    ใช้ตำแหน่งปัจจุบัน
                  </button>
                </div>
                <MapCanvasLazy
                  center={formMapCenter}
                  zoom={formMapZoom}
                  fitPoints={formFitPoints}
                  tileUrl={appSettings.mapTileUrl || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
                  attribution={appSettings.mapAttribution || ""}
                  mode="marker"
                  marker={locationCoords}
                  onMarkerChange={handleMapSelect}
                  polygon={schoolPolygon}
                  showPolygonVertices={false}
                  className="h-[200px] sm:h-[240px] rounded-xl overflow-hidden"
                />
                {errors.locationCoords && (
                  <p className="text-xs text-red-500">{errors.locationCoords}</p>
                )}
              </div>
            )}
          </>
          )}

          {formStep === 2 && (
          <>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                ส่งมอบที่ {PERSONNEL_OFFICE_LABEL}
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-2 leading-relaxed">
                หลังส่งแบบฟอร์ม กรุณานำของไปส่งที่ห้องบุคคลโดยตรง เจ้าหน้าที่จะยืนยันในระบบเมื่อรับของแล้ว
                เพื่อให้เจ้าของมารับคืนได้อย่างปลอดภัย
              </p>
              {isFoundHandoverDeadlineEnabled(appSettings) && (
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-3 pt-3 border-t border-amber-200/80 dark:border-amber-700/50">
                  ต้องนำของถึงห้องบุคคลภายใน {getFoundHandoverDeadlineMinutes(appSettings)} นาที
                  มิฉะนั้นคำขอแจ้งเจอของจะหมดอายุทันที
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border-light bg-bg-secondary p-4 text-sm space-y-2">
              <p className="font-medium text-text-primary">สรุปก่อนส่ง</p>
              <p className="text-text-secondary">
                ของ: {formData.itemName.trim() || formData.description.trim() || "—"}
              </p>
              <p className="text-text-secondary">เจอที่: {formData.locationFound || "—"}</p>
              <p className="text-text-secondary">ส่งมอบ: {PERSONNEL_OFFICE_LABEL}</p>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">ข้อมูลติดต่อผู้เจอ</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ไม่บังคับ - สำหรับติดต่อกลับหากต้องการข้อมูลเพิ่ม
                  </p>
                  {warnings.contacts && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{warnings.contacts}</p>
                  )}
                </div>
                {contacts.length < 3 && (
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center gap-1 text-sm text-[#06C755] font-medium hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่ม
                  </button>
                )}
              </div>
            </div>

            {contacts.length > 0 && (
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative w-36 flex-shrink-0">
                      <select
                        value={contact.type}
                        onChange={(e) => handleContactChange(index, "type", e.target.value)}
                        className="w-full h-12 px-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[#06C755] border border-gray-100 dark:border-gray-600"
                      >
                        {contactTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    <input
                      type="text"
                      value={contact.value}
                      onChange={(e) => handleContactChange(index, "value", e.target.value)}
                      placeholder={
                        contactTypes.find((t) => t.value === contact.type)?.placeholder || ""
                      }
                      className="flex-1 h-12 px-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06C755] border border-gray-100 dark:border-gray-600"
                    />

                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
          )}
            </m.div>
          </AnimatePresence>

          <FormStepperActions
            currentStep={formStep}
            totalSteps={FOUND_FORM_STEPS.length}
            onBack={goPrevStep}
            onNext={goNextStep}
            onSubmit={() => void handleSubmit()}
            submitLabel="ส่งแจ้งเจอของ"
            isSubmitting={isSubmitting}
            nextDisabled={showLocationGate}
            className="mt-6"
          />
        </form>
      </div>

      <ResponsiveModal
        open={showLocationGate}
        onClose={() => router.push("/home")}
        size="md"
        showCloseButton={false}
        closeOnBackdrop={false}
      >
          <div className="flex flex-col items-center text-center">
            {waitingForSettings ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6 border border-green-100 dark:border-green-900/30">
                  <Loader2 className="w-10 h-10 text-[#06C755] animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">กำลังโหลดการตั้งค่า</h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  ระบบกำลังดึงขอบเขตพื้นที่และกฎ GPS จากเซิร์ฟเวอร์
                </p>
              </>
            ) : gpsLoading || locationVerified === null ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6 border border-green-100 dark:border-green-900/30">
                  <MapPin className="w-10 h-10 text-[#06C755] animate-bounce" />
                </div>
                <h2 className="text-xl font-bold text-text-primary mb-2">กำลังยืนยันตำแหน่งของคุณ</h2>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                  เพื่อความปลอดภัยและป้องกันข้อมูลเท็จ ระบบกำลังตรวจสอบว่าตำแหน่งอุปกรณ์ของคุณอยู่ภายในขอบเขตสถาบันการศึกษาหรือไม่
                </p>
                <div className="flex items-center gap-2 text-xs text-text-tertiary justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-[#06C755]" />
                  <span>
                    {userCurrentCoords?.accuracy != null
                      ? `กำลังปรับความแม่นยำ GPS… (±${Math.round(userCurrentCoords.accuracy)} ม.)`
                      : "กำลังเรียกพิกัดจาก GPS…"}
                  </span>
                </div>
                {isIOSDevice() && (
                  <p className="text-xs text-text-tertiary mt-3 leading-relaxed max-w-sm mx-auto">
                    บน iPhone/iPad อาจใช้เวลา 10–25 วินาที กรุณาอยู่กลางแจ้ง เปิด Location Services และเปิด Precise Location สำหรับเบราว์เซอร์
                  </p>
                )}
              </>
            ) : (
              <>
                {locationErrorType === "outside" || locationErrorType === "low_accuracy" ? (
                  <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-6 border border-amber-100 dark:border-amber-900/30">
                    <MapPin className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-6 border border-red-100 dark:border-red-900/30">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                )}

                {locationErrorType === "boundary_not_configured" ? (
                  <>
                    <h2 className="text-xl font-bold text-text-primary mb-2">
                      ยังไม่ได้ตั้งค่าขอบเขตพื้นที่
                    </h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-8">
                      ผู้ดูแลระบบเปิดบังคับตรวจ GPS แล้ว แต่ยังไม่ได้วาด Polygon ขอบเขตใน Admin → แผนที่และ GPS
                      (ต้องมีอย่างน้อย 3 จุด) กรุณาติดต่อผู้ดูแลระบบ
                    </p>
                  </>
                ) : locationErrorType === "outside" ? (
                  <>
                    <h2 className="text-xl font-bold text-text-primary mb-2">อยู่นอกพื้นที่ขอบเขตที่กำหนด</h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-6">
                      ขออภัยด้วยครับ ระบบแจ้งเจอของได้รับการกำหนดให้ใช้ได้เฉพาะภายในพื้นที่ที่กำหนดเท่านั้น (เช่น บริเวณโรงเรียน/มหาวิทยาลัย) เพื่อให้ของที่เจอได้รับการคืนสู่เจ้าของอย่างรวดเร็วและถูกต้อง
                    </p>
                    
                    {appSettings.mapsEnabled && appSettings.mapSchoolBoundary && (
                      <div className="w-full mb-6 relative overflow-hidden rounded-2xl border border-border-light shadow-sm">
                        <MapCanvasLazy
                          center={gateMapView.center}
                          zoom={gateMapView.zoom}
                          fitPoints={gateMapView.fitPoints}
                          tileUrl={appSettings.mapTileUrl || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
                          attribution={appSettings.mapAttribution || ""}
                          mode="view"
                          marker={userCurrentCoords}
                          polygon={schoolPolygon}
                          showPolygonVertices={false}
                          className="h-[200px] sm:h-[240px] rounded-xl overflow-hidden"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2 py-1 rounded">
                          🔵 ตำแหน่งของคุณอยู่นอกขอบเขตสีเขียว
                        </div>
                      </div>
                    )}
                  </>
                ) : locationErrorType === "low_accuracy" ? (
                  <>
                    <h2 className="text-xl font-bold text-text-primary mb-2">
                      ตำแหน่งไม่แม่นยำพอ (ไม่ใช่ GPS จริง)
                    </h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-8">
                      ระบบยังไม่ได้รับพิกัดที่แม่นยำพอ (ต้องไม่เกิน {STRICT_GPS_MAX_ACCURACY_METERS} เมตร)
                      {isIOSDevice()
                        ? " บน iPhone/iPad ให้เปิด Settings → Privacy & Security → Location Services → Safari/Chrome แล้วเปิด Precise Location ยืนยันว่าอยู่กลางแจ้ง แล้วกดลองใหม่ (รอได้ถึง 25 วินาที)"
                        : " กรุณาใช้มือถือที่เปิด GPS และอยู่ในบริเวณโรงเรียน"}
                    </p>
                  </>
                ) : locationErrorType === "permission" ? (
                  <>
                    <h2 className="text-xl font-bold text-text-primary mb-2">ปิดการเข้าถึงตำแหน่ง (GPS)</h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-8">
                      เบราว์เซอร์ไม่อนุญาตให้ใช้ตำแหน่งสำหรับเว็บนี้ ไปที่ไอคอนกุญแจในแถบที่อยู่ → Location → ตั้งเป็น Allow
                      แล้วกดลองใหม่อีกครั้ง (หรือปิด Sensors override ใน DevTools ถ้าเปิดทดสอบ)
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-text-primary mb-2">ไม่สามารถระบุตำแหน่งได้</h2>
                    <p className="text-text-secondary text-sm leading-relaxed mb-8">
                      ไม่สามารถดึงตำแหน่ง GPS ของคุณได้ในขณะนี้ กรุณาตรวจสอบสิทธิ์พิกัดหรือการเชื่อมต่อ GPS บนโทรศัพท์/คอมพิวเตอร์ของคุณแล้วลองใหม่อีกครั้ง
                    </p>
                  </>
                )}

                <div className="w-full space-y-3">
                  <button
                    onClick={() => void verifyLocation()}
                    type="button"
                    className="w-full py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors shadow-sm"
                  >
                    ลองใหม่อีกครั้ง
                  </button>
                  
                  {isAdmin && (
                    <button
                      onClick={() => setLocationVerified(true)}
                      type="button"
                      className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm"
                    >
                      ข้ามการตรวจสอบ (ผู้ดูแลระบบ)
                    </button>
                  )}

                  <button
                    onClick={() => router.push("/home")}
                    type="button"
                    className="w-full py-3 bg-bg-secondary text-text-secondary rounded-xl font-medium hover:bg-bg-tertiary transition-colors border border-border-light"
                  >
                    กลับหน้าหลัก
                  </button>
                </div>
              </>
            )}
          </div>
      </ResponsiveModal>
      {dialog}
    </StudentAppShell>
  );
}