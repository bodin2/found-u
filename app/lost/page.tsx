"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  X,
  Sparkles,
  Search,
  AlertTriangle,
  Pencil,
  Info,
} from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import LoginPrompt from "@/components/auth/login-prompt";
import InfoTooltip from "@/components/ui/info-tooltip";
import { type ItemCategory, type ContactInfo, type ContactType } from "@/lib/types";
import { generateTrackingCode, cn } from "@/lib/utils";
import { addLostItem, subscribeToCategories, subscribeToContactTypes, type CategoryConfig, type ContactTypeConfig } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { logItemCreated } from "@/lib/logger";

// Helper function to parse multiple contacts from AI response
function parseMultipleContacts(contactStr: string, defaultType: ContactType = 'line'): ContactInfo[] {
  if (!contactStr || contactStr === 'null') return [];
  
  // Split by comma, space, or newline
  const parts = contactStr.split(/[,\s]+/).filter(p => p.trim().length > 0);
  
  return parts.map(part => {
    const value = part.trim();
    // Auto-detect contact type
    let type: ContactType = defaultType;
    if (/^0[0-9]{8,9}$/.test(value.replace(/-/g, ''))) {
      type = 'phone';
    } else if (value.includes('@') && value.includes('.')) {
      type = 'email';
    } else if (value.startsWith('@') || value.toLowerCase().includes('ig') || value.toLowerCase().includes('insta')) {
      type = 'instagram';
    } else if (value.toLowerCase().includes('fb') || value.toLowerCase().includes('facebook')) {
      type = 'facebook';
    }
    return { type, value };
  });
}

export default function ReportLostPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [pendingNerSubmit, setPendingNerSubmit] = useState(false);

  // Config data from Firestore
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactTypeConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    itemName: "",
    category: "" as ItemCategory | "",
    description: "",
    locationLost: "",
  });

  // Contact info state
  const [contacts, setContacts] = useState<ContactInfo[]>([
    { type: 'phone', value: '' }
  ]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExtractingNER, setIsExtractingNER] = useState(false);
  const [nerData, setNerData] = useState<any>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  // Smart Input mode state
  const [inputMode, setInputMode] = useState<'manual' | 'smart'>('manual');
  const [smartText, setSmartText] = useState("");
  const [showNerModal, setShowNerModal] = useState(false);

  // Edit mode for NER modal
  const [isEditingNer, setIsEditingNer] = useState(false);
  const [editableNerData, setEditableNerData] = useState<any>(null);

  // Wrong page detection
  const [showWrongPageModal, setShowWrongPageModal] = useState(false);
  const [detectedType, setDetectedType] = useState<'lost' | 'found'>('lost');

  // AI Quota state
  const [aiQuota, setAiQuota] = useState<{
    enabled: boolean;
    userRemainingMinute: number;
    userRemainingHour: number;
    userLimitPerMinute?: number;
    userLimitPerHour?: number;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Auto-submit after NER confirmation
  useEffect(() => {
    if (pendingNerSubmit && formRef.current) {
      setPendingNerSubmit(false);
      // Small delay to allow state updates
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 100);
    }
  }, [pendingNerSubmit]);

  // Load config data from Firestore
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
      // Set default contact type if available
      if (types.length > 0 && contacts[0]?.type === 'phone') {
        setContacts([{ type: types[0].value as ContactType, value: '' }]);
      }
      checkLoaded();
    });

    return () => {
      unsubCategories();
      unsubContactTypes();
    };
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch AI quota when in smart input mode
  useEffect(() => {
    const fetchQuota = async () => {
      if (!user?.uid || inputMode !== 'smart') return;
      
      try {
        const response = await fetch(`/api/ner?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setAiQuota(data);
        }
      } catch (error) {
        console.error('Error fetching AI quota:', error);
      }
    };

    fetchQuota();
    // Refresh quota every 30 seconds when in smart mode
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, [user?.uid, inputMode]);

  // Handle redirect to found page with data
  const handleRedirectToFound = () => {
    const textToTransfer = inputMode === 'smart' ? smartText : formData.description;
    sessionStorage.setItem('smartInputTransfer', JSON.stringify({
      text: textToTransfer,
      from: 'lost'
    }));
    router.push('/found');
  };

  // Check for transferred data from other page
  useEffect(() => {
    const transferData = sessionStorage.getItem('smartInputTransfer');
    if (transferData) {
      try {
        const parsed = JSON.parse(transferData);
        if (parsed.from === 'found' && parsed.text) {
          setSmartText(parsed.text);
          setInputMode('smart');
          sessionStorage.removeItem('smartInputTransfer');
        }
      } catch (e) {
        console.error('Error parsing transfer data:', e);
      }
    }
  }, []);

  // Extract NER data from Smart Input text (AI detects target: lost/found)
  const handleExtractNER = async () => {
    const textToAnalyze = inputMode === 'smart' ? smartText : formData.description;

    if (!textToAnalyze.trim()) {
      setAiError('กรุณากรอกข้อความก่อน');
      return;
    }

    setIsExtractingNER(true);
    setAiError(null); // Clear previous error
    
    try {
      const response = await fetch('/api/ner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToAnalyze,
          type: 'lost',
          userId: user?.uid, // ส่ง userId สำหรับ rate limit
        }),
      });

      const data = await response.json();
      
      // Handle rate limit error - show inline warning instead of alert
      if (response.status === 429) {
        const resetTime = data.resetMinute ? new Date(data.resetMinute) : null;
        const waitSeconds = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000) : 60;
        
        if (data.reason === 'system_minute' || data.reason === 'system_hour') {
          setAiError(`ระบบ AI มีผู้ใช้งานจำนวนมาก กรุณารอประมาณ ${waitSeconds} วินาที`);
        } else {
          setAiError(`คุณใช้งาน AI ครบโควต้าแล้ว กรุณารอประมาณ ${waitSeconds} วินาที`);
        }
        
        // Refresh quota
        if (user?.uid) {
          const quotaRes = await fetch(`/api/ner?userId=${user.uid}`);
          if (quotaRes.ok) setAiQuota(await quotaRes.json());
        }
        return;
      }
      
      if (data.error) {
        setAiError('ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
        return;
      }

      // Refresh quota after successful use
      if (user?.uid) {
        const quotaRes = await fetch(`/api/ner?userId=${user.uid}`);
        if (quotaRes.ok) setAiQuota(await quotaRes.json());
      }

      // AI detected this is a "found" item - user might be on wrong page
      if (data.target === 'found') {
        setDetectedType('found');
        setNerData(data);
        setShowWrongPageModal(true);
        return;
      }

      setNerData(data);
      // Parse contacts into array for modal editing
      let parsedContactsForModal = data.contact 
        ? parseMultipleContacts(
            data.contact,
            data.contactType && contactTypes.some(t => t.value === data.contactType)
              ? data.contactType as ContactType
              : 'line'
          )
        : [];
      
      // กรอง contact ที่มีค่าเป็น "-" หรือว่างออก
      parsedContactsForModal = parsedContactsForModal.filter(c => 
        c.value && c.value.trim() !== '' && c.value.trim() !== '-' && c.value.trim() !== 'null'
      );
      
      // ถ้าไม่มี contact เลย ให้เพิ่มช่องว่างให้กรอก
      if (parsedContactsForModal.length === 0) {
        parsedContactsForModal = [{ type: 'line' as ContactType, value: '' }];
      }
      
      // ตรวจสอบว่า field สำคัญว่างหรือไม่ - ถ้าว่างให้บังคับแก้ไข
      const hasEmptyRequiredFields = 
        !data.item || data.item === 'null' || data.item.trim() === '' || data.item.trim() === '-' ||
        !data.location || data.location === 'null' || data.location.trim() === '' || data.location.trim() === '-' ||
        !data.category || !categories.some(c => c.value === data.category) ||
        parsedContactsForModal.filter(c => c.value && c.value.trim() !== '').length === 0;
      
      setEditableNerData({ 
        ...data, 
        parsedContacts: parsedContactsForModal,
        hasEmptyRequiredFields // Flag for forcing edit mode
      });

      // Auto-fill form fields with extracted data
      if (data.item) {
        setFormData(prev => ({ ...prev, itemName: data.item }));
      }
      if (data.location) {
        setFormData(prev => ({ ...prev, locationLost: data.location }));
      }
      if (data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
      }

      // Auto-set category from AI response
      if (data.category) {
        const categoryExists = categories.some(c => c.value === data.category);
        if (categoryExists) {
          setFormData(prev => ({ ...prev, category: data.category }));
        }
      }

      // Auto-fill contacts if extracted (parse multiple contacts)
      if (data.contact) {
        const defaultType = data.contactType && contactTypes.some(t => t.value === data.contactType)
          ? data.contactType as ContactType
          : 'line';
        const parsedContacts = parseMultipleContacts(data.contact, defaultType);
        if (parsedContacts.length > 0) {
          setContacts(parsedContacts);
        }
      }

      // Show confirmation modal - auto-enable edit mode if required fields are empty
      setShowNerModal(true);
      setIsEditingNer(hasEmptyRequiredFields);
    } catch (error) {
      console.error('Error extracting NER:', error);
      setAiError('เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExtractingNER(false);
    }
  };

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear NER data when user manually edits
    setNerData(null);

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle contact changes
  const handleContactChange = (index: number, field: 'type' | 'value', value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);

    // Clear error
    if (errors.contacts) {
      setErrors((prev) => ({ ...prev, contacts: "" }));
    }
  };

  // Add contact
  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([...contacts, { type: 'line', value: '' }]);
    }
  };

  // Remove contact
  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = "กรุณากรอกชื่อสิ่งของ";
    }
    if (!formData.category) {
      newErrors.category = "กรุณาเลือกประเภท";
    }
    if (!formData.locationLost.trim()) {
      newErrors.locationLost = "กรุณากรอกสถานที่ทำหาย";
    }

    // Validate contacts
    const validContacts = contacts.filter(c => c.value.trim());
    if (validContacts.length === 0) {
      newErrors.contacts = "กรุณากรอกช่องทางการติดต่ออย่างน้อย 1 ช่องทาง";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Generate tracking code
      const newTrackingCode = generateTrackingCode();
      setTrackingCode(newTrackingCode);

      // Filter empty contacts
      const validContacts = contacts.filter(c => c.value.trim());

      // Use NER data if available, otherwise use form data
      const itemName = nerData?.item || formData.itemName;
      const location = nerData?.location || formData.locationLost;
      const description = nerData?.description || formData.description;

      // Save to Firebase Firestore
      const itemId = await addLostItem({
        itemName,
        category: formData.category as ItemCategory,
        description,
        locationLost: location,
        contacts: validContacts,
        userId: user?.uid,
        trackingCode: newTrackingCode,
        status: "searching",
        dateLost: new Date(),
      });

      // Log the activity
      await logItemCreated('lost', itemId, itemName, newTrackingCode, user?.email || undefined, user?.displayName || undefined);

      // Find matches after submission
      try {
        const matchResponse = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'lost', itemId }),
        });
        const matchData = await matchResponse.json();
        setMatches(matchData.matches || []);
        if (matchData.matches && matchData.matches.length > 0) {
          setShowMatches(true);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      }

      setShowSuccess(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  // Show login prompt if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-secondary pb-24 transition-colors">
        <Header title="แจ้งของหาย" showBack />
        <LoginPrompt
          title="เข้าสู่ระบบเพื่อแจ้งของหาย"
          description="คุณต้องเข้าสู่ระบบเพื่อแจ้งของหาย เพื่อให้เราแจ้งเตือนคุณเมื่อมีคนเจอของ"
          feature="รับการแจ้งเตือนอัตโนมัติเมื่อมีคนเจอของคุณ!"
        />
        <BottomNav />
      </div>
    );
  }

  // Success Screen
  if (showSuccess) {
    return (
      <AppShell>
        <div className="min-h-screen bg-bg-secondary pb-24 md:pb-8 transition-colors">
          <div className="md:hidden">
            <Header title="แจ้งของหายสำเร็จ" />
          </div>

          <div className="hidden md:block px-8 py-6 border-b border-border-light bg-bg-secondary sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-text-primary">แจ้งของหายสำเร็จ</h1>
            <p className="text-text-secondary text-sm mt-1">ระบบได้รับข้อมูลเรียบร้อยแล้ว</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
            <div className="w-full max-w-lg bg-bg-card rounded-2xl shadow-sm border border-border-light p-6 md:p-8 animate-fade-in text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 rounded-full bg-[#e8f8ef] dark:bg-[#06C755]/20 flex items-center justify-center mb-6 mx-auto animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-[#06C755]" />
              </div>

              <h2 className="text-xl font-semibold text-text-primary mb-2">
                แจ้งของหายเรียบร้อย!
              </h2>
              <p className="text-text-secondary text-center mb-8">
                เราจะแจ้งเตือนคุณเมื่อมีคนพบของ
              </p>

              {/* Tracking Code Card */}
              <div className="w-full bg-bg-secondary rounded-2xl p-6 mb-8 border border-border-light">
                <p className="text-sm text-text-secondary text-center mb-2">
                  รหัสติดตาม
                </p>
                <p className="text-2xl font-bold text-[#06C755] text-center tracking-wider font-mono">
                  {trackingCode}
                </p>
                <p className="text-xs text-text-tertiary text-center mt-3">
                  กรุณาบันทึกรหัสนี้ไว้เพื่อติดตามสถานะ
                </p>
              </div>

              {/* Matches Section */}
              {showMatches && matches.length > 0 && (
                <div className="mt-6 text-left">
                  <div className="bg-[#e8f8ef] dark:bg-[#06C755]/10 rounded-xl p-4 border border-[#06C755]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-5 h-5 text-[#06C755]" />
                      <h3 className="font-semibold text-text-primary">
                        พบของที่อาจตรงกัน ({matches.length} รายการ)
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {matches.slice(0, 3).map((match: any) => (
                        <div
                          key={match.foundItem.id}
                          className="bg-bg-card rounded-lg p-3 border border-border-light shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary text-sm truncate">
                                {match.foundItem.description}
                              </p>
                              <p className="text-xs text-text-secondary mt-1 truncate">
                                📍 {match.foundItem.locationFound}
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  match.confidence === 'high' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    match.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                )}>
                                  ความน่าจะเป็น {match.scorePercentage}%
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/tracking?code=${match.foundItem.trackingCode}`)}
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

              {/* Action Buttons */}
              <div className="w-full space-y-3 mt-8">
                <button
                  onClick={() => router.push("/tracking")}
                  className="w-full py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors shadow-sm"
                >
                  ติดตามสถานะ
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 bg-bg-secondary text-text-secondary rounded-xl font-medium hover:bg-bg-tertiary transition-colors border border-border-light"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Main Form
  return (
    <AppShell>
      <div className="min-h-screen bg-bg-secondary pb-24 md:pb-8 transition-colors">
        <div className="md:hidden">
          <Header title="แจ้งของหาย" showBack />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block px-8 py-6 border-b border-border-light bg-bg-secondary sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-text-primary">แจ้งของหาย</h1>
          <p className="text-text-secondary text-sm mt-1">กรอกข้อมูลให้ละเอียดเพื่อให้ง่ายต่อการค้นหา</p>
        </div>

        {/* AI Loading Modal Overlay */}
        {isExtractingNER && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl animate-fade-in">
              <div className="relative w-20 h-20 mx-auto mb-6">
                {/* Animated rings */}
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                🔍 ระบบกำลังวิเคราะห์...
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                กรุณารอสักครู่ ระบบกำลังประมวลผลข้อความ
              </p>
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Wrong Page Detection Modal */}
        {showWrongPageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    🤔 คุณอาจกรอกผิดหน้า
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ข้อความนี้ดูเหมือนเป็นการ<span className="font-semibold text-green-600">แจ้งเจอของ</span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  หน้านี้คือ "<span className="font-semibold">แจ้งของหาย</span>" สำหรับคนที่ทำของหาย
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                  ต้องการย้ายไปหน้า "<span className="font-semibold">แจ้งเจอของ</span>" หรือไม่?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWrongPageModal(false)}
                  className="flex-1 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  อยู่หน้านี้
                </button>
                <button
                  type="button"
                  onClick={handleRedirectToFound}
                  className="flex-1 py-3 rounded-xl font-medium bg-[#06C755] text-white hover:bg-[#05b34d] transition-colors"
                >
                  ย้ายไปแจ้งเจอของ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NER Result Confirmation Modal */}
        {showNerModal && nerData && editableNerData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
              {/* Type Badge */}
              <div className="flex justify-center mb-4">
                <span className="px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold text-sm border border-amber-200 dark:border-amber-800">
                  🔍 แจ้งของหาย
                </span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      ✨ วิเคราะห์สำเร็จ!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ตรวจสอบข้อมูลที่ระบบดึงมาให้
                    </p>
                    {/* Quota Usage Display in Modal */}
                    {aiQuota && aiQuota.enabled && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                          ใช้โควต้า 1 ครั้ง • เหลือ {aiQuota.userRemainingMinute}/{aiQuota.userLimitPerMinute || 5} ครั้ง/นาที
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {!isEditingNer && (
                  <button
                    type="button"
                    onClick={() => setIsEditingNer(true)}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="แก้ไขข้อมูล"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Warning for empty required fields */}
              {editableNerData.hasEmptyRequiredFields && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ระบบไม่สามารถวิเคราะห์ข้อมูลบางส่วนได้ กรุณากรอกข้อมูลที่จำเป็นให้ครบ
                  </p>
                </div>
              )}

              {/* Error message from validation */}
              {aiError && showNerModal && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
                </div>
              )}

              {/* Extracted Data Display / Edit Mode */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 space-y-3">
                {/* Item Name */}
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-1">📦</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      ชื่อของ <span className="text-red-500">*</span>
                    </p>
                    {isEditingNer ? (
                      <input
                        type="text"
                        value={editableNerData.item || ''}
                        onChange={(e) => setEditableNerData({ ...editableNerData, item: e.target.value, hasEmptyRequiredFields: false })}
                        className={cn(
                          "w-full px-3 py-2 bg-white dark:bg-gray-600 border rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                          (!editableNerData.item || editableNerData.item === 'null' || editableNerData.item.trim() === '' || editableNerData.item.trim() === '-') 
                            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20" 
                            : "border-gray-200 dark:border-gray-500"
                        )}
                        placeholder="ชื่อสิ่งของ (จำเป็น)"
                      />
                    ) : (
                      <p className={cn(
                        "font-medium",
                        (!editableNerData.item || editableNerData.item === 'null' || editableNerData.item.trim() === '' || editableNerData.item.trim() === '-') 
                          ? "text-red-500" 
                          : "text-gray-900 dark:text-white"
                      )}>
                        {editableNerData.item && editableNerData.item !== 'null' && editableNerData.item.trim() !== '' && editableNerData.item.trim() !== '-' ? editableNerData.item : '⚠️ ไม่พบข้อมูล - กดแก้ไข'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-1">📝</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">รายละเอียด</p>
                    {isEditingNer ? (
                      <input
                        type="text"
                        value={editableNerData.description === 'null' ? '' : (editableNerData.description || '')}
                        onChange={(e) => setEditableNerData({ ...editableNerData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="สี, ยี่ห้อ, ลักษณะเด่น"
                      />
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white">
                        {editableNerData.description && editableNerData.description !== 'null' ? editableNerData.description : '-'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-1">📍</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      สถานที่ <span className="text-red-500">*</span>
                    </p>
                    {isEditingNer ? (
                      <input
                        type="text"
                        value={editableNerData.location === 'null' ? '' : (editableNerData.location || '')}
                        onChange={(e) => setEditableNerData({ ...editableNerData, location: e.target.value, hasEmptyRequiredFields: false })}
                        className={cn(
                          "w-full px-3 py-2 bg-white dark:bg-gray-600 border rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                          (!editableNerData.location || editableNerData.location === 'null' || editableNerData.location.trim() === '' || editableNerData.location.trim() === '-') 
                            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20" 
                            : "border-gray-200 dark:border-gray-500"
                        )}
                        placeholder="สถานที่ทำหาย (จำเป็น)"
                      />
                    ) : (
                      <p className={cn(
                        "font-medium",
                        (!editableNerData.location || editableNerData.location === 'null' || editableNerData.location.trim() === '' || editableNerData.location.trim() === '-') 
                          ? "text-red-500" 
                          : "text-gray-900 dark:text-white"
                      )}>
                        {editableNerData.location && editableNerData.location !== 'null' && editableNerData.location.trim() !== '' && editableNerData.location.trim() !== '-' ? editableNerData.location : '⚠️ ไม่พบข้อมูล - กดแก้ไข'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-1">🏷️</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      ประเภทของ <span className="text-red-500">*</span>
                    </p>
                    {isEditingNer ? (
                      <select
                        value={editableNerData.category || ''}
                        onChange={(e) => setEditableNerData({ ...editableNerData, category: e.target.value, hasEmptyRequiredFields: false })}
                        className={cn(
                          "w-full px-3 py-2 bg-white dark:bg-gray-600 border rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                          (!editableNerData.category || editableNerData.category === '') 
                            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20" 
                            : "border-gray-200 dark:border-gray-500"
                        )}
                      >
                        <option value="">เลือกประเภท</option>
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className={cn(
                        "font-medium",
                        (!editableNerData.category || editableNerData.category === '') 
                          ? "text-red-500" 
                          : "text-gray-900 dark:text-white"
                      )}>
                        {editableNerData.category 
                          ? `${categories.find(c => c.value === editableNerData.category)?.icon || '📦'} ${categories.find(c => c.value === editableNerData.category)?.label || editableNerData.category}`
                          : '⚠️ ไม่พบข้อมูล - กดแก้ไข'
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-1">📞</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      ติดต่อ (เบอร์/Line/IG) <span className="text-red-500">*</span>
                    </p>
                    {isEditingNer ? (
                      <div className="space-y-2">
                        {(editableNerData.parsedContacts || []).map((contact: ContactInfo, index: number) => (
                          <div key={index} className="flex flex-wrap gap-2 items-center">
                            <select
                              value={contact.type || 'line'}
                              onChange={(e) => {
                                const newContacts = [...editableNerData.parsedContacts];
                                newContacts[index] = { ...contact, type: e.target.value as ContactType };
                                setEditableNerData({ ...editableNerData, parsedContacts: newContacts });
                              }}
                              className="w-32 shrink-0 px-2 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              {contactTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={contact.value || ''}
                              onChange={(e) => {
                                const newContacts = [...editableNerData.parsedContacts];
                                newContacts[index] = { ...contact, value: e.target.value };
                                setEditableNerData({ ...editableNerData, parsedContacts: newContacts, hasEmptyRequiredFields: false });
                              }}
                              className="flex-1 min-w-[140px] px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="เบอร์โทร, LINE ID, IG"
                            />
                            {editableNerData.parsedContacts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newContacts = editableNerData.parsedContacts.filter((_: ContactInfo, i: number) => i !== index);
                                  setEditableNerData({ ...editableNerData, parsedContacts: newContacts });
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newContacts = [...(editableNerData.parsedContacts || []), { type: 'line' as ContactType, value: '' }];
                            setEditableNerData({ ...editableNerData, parsedContacts: newContacts });
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-colors text-sm"
                        >
                          + เพิ่มช่องทางติดต่อ
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {(editableNerData.parsedContacts || []).filter((c: ContactInfo) => c.value && c.value.trim() !== '' && c.value.trim() !== '-').length > 0 
                          ? (editableNerData.parsedContacts || []).filter((c: ContactInfo) => c.value && c.value.trim() !== '' && c.value.trim() !== '-').map((contact: ContactInfo, index: number) => (
                              <p key={index} className="font-medium text-gray-900 dark:text-white">
                                {contactTypes.find(t => t.value === contact.type)?.icon || '📞'} {contact.value}
                              </p>
                            ))
                          : <p className="font-medium text-red-500">⚠️ ไม่พบข้อมูล - กดแก้ไข</p>
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Remark */}
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-1">💬</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">หมายเหตุ/จุดฝากของ</p>
                    {isEditingNer ? (
                      <input
                        type="text"
                        value={editableNerData.remark === 'null' ? '' : (editableNerData.remark || '')}
                        onChange={(e) => setEditableNerData({ ...editableNerData, remark: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="จุดฝากของ, หมายเหตุ"
                      />
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white">
                        {editableNerData.remark && editableNerData.remark !== 'null' ? editableNerData.remark : '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNerModal(false);
                    setNerData(null);
                    setEditableNerData(null);
                    setIsEditingNer(false);
                    setAiError(null);
                    setFormData({ itemName: "", category: "", description: "", locationLost: "" });
                  }}
                  className="flex-1 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Validate required fields before confirming
                    const itemValue = editableNerData.item && editableNerData.item !== 'null' && editableNerData.item.trim() !== '-' ? editableNerData.item.trim() : '';
                    const locationValue = editableNerData.location && editableNerData.location !== 'null' && editableNerData.location.trim() !== '-' ? editableNerData.location.trim() : '';
                    const categoryValue = editableNerData.category || '';
                    const validContacts = (editableNerData.parsedContacts || []).filter((c: ContactInfo) => c.value && c.value.trim() !== '' && c.value.trim() !== '-');
                    
                    if (!itemValue || !locationValue || !categoryValue || validContacts.length === 0) {
                      // Force edit mode and show warning
                      setIsEditingNer(true);
                      if (!itemValue) {
                        setAiError('กรุณากรอกชื่อของ');
                      } else if (!locationValue) {
                        setAiError('กรุณากรอกสถานที่ทำหาย');
                      } else if (!categoryValue) {
                        setAiError('กรุณาเลือกประเภทของ');
                      } else {
                        setAiError('กรุณากรอกช่องทางติดต่ออย่างน้อย 1 ช่องทาง');
                      }
                      return;
                    }

                    // Apply edited data to form
                    setFormData(prev => ({
                      ...prev,
                      itemName: editableNerData.item || prev.itemName,
                      description: (editableNerData.description && editableNerData.description !== 'null') ? editableNerData.description : prev.description,
                      locationLost: (editableNerData.location && editableNerData.location !== 'null') ? editableNerData.location : prev.locationLost,
                      category: editableNerData.category || prev.category
                    }));
                    // Set contacts directly from parsedContacts
                    if (editableNerData.parsedContacts && editableNerData.parsedContacts.length > 0) {
                      const validContacts = editableNerData.parsedContacts.filter((c: ContactInfo) => c.value && c.value.trim());
                      if (validContacts.length > 0) {
                        setContacts(validContacts);
                      }
                    }
                    // Filter empty contacts
                    if (editableNerData.parsedContacts && editableNerData.parsedContacts.length > 0) {
                      const filteredContacts = editableNerData.parsedContacts.filter((c: ContactInfo) => c.value && c.value.trim() !== '' && c.value.trim() !== '-');
                      if (filteredContacts.length > 0) {
                        setContacts(filteredContacts);
                      }
                    }
                    setNerData(editableNerData);
                    setShowNerModal(false);
                    setIsEditingNer(false);
                    setInputMode('manual');
                    setAiError(null);
                    // Trigger form submit after state updates
                    setPendingNerSubmit(true);
                  }}
                  className="flex-1 py-3 rounded-xl font-medium bg-[#06C755] text-white hover:bg-[#05b34d] transition-colors text-sm"
                >
                  ✓ ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="px-5 py-6 max-w-2xl mx-auto">
          {/* Input Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                inputMode === 'manual'
                  ? "bg-[#06C755] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              ✍️ กรอกเอง
            </button>
            <button
              type="button"
              onClick={() => setInputMode('smart')}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                inputMode === 'smart'
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Smart Input
            </button>
          </div>

          {/* Smart Input Mode */}
          {inputMode === 'smart' && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 mb-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">วางข้อความที่นี่</h3>
                  <InfoTooltip 
                    content="Copy ข้อความจาก IG/Chat แล้ววางได้เลย AI จะช่วยดึงข้อมูลให้อัตโนมัติ เช่น ชื่อของ, สถานที่, ช่องทางติดต่อ" 
                    position="bottom"
                  />
                </div>
                {/* AI Quota Display */}
                {aiQuota && aiQuota.enabled && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                    <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40">
                      เหลือ {aiQuota.userRemainingMinute}/{aiQuota.userLimitPerMinute || 5} ครั้ง/นาที
                    </span>
                  </div>
                )}
              </div>
              
              <textarea
                value={smartText}
                onChange={(e) => {
                  setSmartText(e.target.value);
                  setAiError(null); // Clear error when typing
                }}
                placeholder="เช่น: ผมลืมนาฬิกา Casio สีดำไว้ที่โกลสนามบอลครับ ใครเจอฝากห้องธุรการหน่อย"
                rows={4}
                className={cn(
                  "w-full p-4 bg-white dark:bg-gray-700 border rounded-xl resize-none text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                  aiError ? "border-red-300 dark:border-red-700" : "border-purple-200 dark:border-purple-700"
                )}
              />
              
              {/* Inline Error Warning */}
              {aiError && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
                </div>
              )}
              
              <button
                type="button"
                onClick={handleExtractNER}
                disabled={isExtractingNER || !smartText.trim() || (aiQuota?.enabled && aiQuota.userRemainingMinute <= 0)}
                className="w-full mt-3 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {isExtractingNER ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    กรอก Form อัตโนมัติ
                  </>
                )}
              </button>
              {nerData && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-xl text-xs border border-green-200 dark:border-green-800">
                  <p className="text-[#06C755] font-medium mb-2">✅ วิเคราะห์สำเร็จ! กรุณาตรวจสอบข้อมูลด้านล่างแล้วกดยืนยัน</p>
                </div>
              )}
            </div>
          )}

          {/* Info Banner - only show in manual mode */}
          {inputMode === 'manual' && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  กรอกข้อมูลให้ละเอียด
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  ยิ่งระบุรายละเอียดมาก โอกาสเจอของยิ่งสูง
                </p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* Form content */}

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ชื่อสิ่งของ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="เช่น กระเป๋าสตางค์สีดำ, iPhone 15"
                className={cn(
                  "input-line",
                  errors.itemName && "ring-2 ring-red-200 bg-red-50"
                )}
              />
              {errors.itemName && (
                <p className="text-xs text-red-500 mt-1.5">{errors.itemName}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ประเภท <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={cn(
                    "input-line appearance-none pr-10",
                    errors.category && "ring-2 ring-red-200 bg-red-50",
                    !formData.category && "text-gray-400"
                  )}
                >
                  <option value="">เลือกประเภท</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1.5">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  รายละเอียดเพิ่มเติม
                </label>
                <button
                  type="button"
                  onClick={handleExtractNER}
                  disabled={isExtractingNER || !formData.description.trim()}
                  className="flex items-center gap-1.5 text-xs text-[#06C755] hover:text-[#05b34d] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* <Sparkles className="w-3.5 h-3.5" /> */}
                  {/* {isExtractingNER ? 'กำลังวิเคราะห์...' : 'วิเคราะห์อัตโนมัติ'} */}
                </button>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="ลักษณะเด่น, สี, ยี่ห้อ, สิ่งที่อยู่ข้างใน..."
                rows={3}
                className="input-line resize-none"
              />
              {nerData && (
                <div className="mt-2 p-2 bg-[#e8f8ef] dark:bg-[#06C755]/10 rounded-lg text-xs">
                  <p className="text-[#06C755] font-medium mb-1">✨ ข้อมูลที่วิเคราะห์ได้:</p>
                  <div className="space-y-0.5 text-gray-600 dark:text-gray-300">
                    {nerData.item && <p><span className="font-medium">ชื่อของ:</span> {nerData.item}</p>}
                    {nerData.location && <p><span className="font-medium">สถานที่:</span> {nerData.location}</p>}
                    {nerData.description && <p><span className="font-medium">รายละเอียด:</span> {nerData.description}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Location Lost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                สถานที่ทำหาย <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="locationLost"
                value={formData.locationLost}
                onChange={handleChange}
                placeholder="เช่น ห้องสมุด ชั้น 2, โรงอาหาร"
                className={cn(
                  "input-line",
                  errors.locationLost && "ring-2 ring-red-200 bg-red-50"
                )}
              />
              {errors.locationLost && (
                <p className="text-xs text-red-500 mt-1.5">{errors.locationLost}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ข้อมูลติดต่อ <span className="text-red-500">*</span>
                </p>
                {contacts.length < 3 && (
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center gap-1 text-sm text-[#06C755] font-medium hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มช่องทาง
                  </button>
                )}
              </div>
              {errors.contacts && (
                <p className="text-xs text-red-500 mb-3">{errors.contacts}</p>
              )}
            </div>

            {/* Contact Fields */}
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={index} className="flex gap-2">
                  {/* Contact Type Dropdown */}
                  <div className="relative w-36 flex-shrink-0">
                    <select
                      value={contact.type}
                      onChange={(e) => handleContactChange(index, 'type', e.target.value)}
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

                  {/* Contact Value Input */}
                  <input
                    type="text"
                    value={contact.value}
                    onChange={(e) => handleContactChange(index, 'value', e.target.value)}
                    placeholder={contactTypes.find(t => t.value === contact.type)?.placeholder || ''}
                    className="flex-1 h-12 px-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06C755] border border-gray-100 dark:border-gray-600"
                  />

                  {/* Remove Button */}
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 rounded-full font-medium text-white transition-all",
                isSubmitting
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#06C755] hover:bg-[#05b34d] active:scale-[0.98]"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังส่งข้อมูล...
                </span>
              ) : (
                "ยืนยันการแจ้ง"
              )}
            </button>
          </div>
        </form>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </AppShell>
  );
}
