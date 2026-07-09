"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { FormStepper, FormStepperActions } from "@/components/ui/form-stepper";
import { completeRegistration, lookupRegistration } from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";
import { inputStateClass } from "@/components/ui/validated-field";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { StatusAlert } from "@/components/ui/status-alert";
import { fieldErrorId, fieldId, recordToIssues } from "@/lib/feedback/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "student-id", label: "เลขประจำตัว" },
  { id: "confirm", label: "ยืนยันตัวตน" },
  { id: "password", label: "รหัสผ่าน" },
  { id: "pin", label: "ตั้ง PIN" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    gradeLevel?: string | null;
    roomNumber?: string | null;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLookup = async () => {
    if (studentId.length !== 5) {
      setErrors({ studentId: "กรุณากรอกเลขประจำตัว 5 หลัก" });
      setFormError(null);
      return;
    }
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const result = await lookupRegistration(studentId);
      if (!result.found) {
        setErrors({
          studentId: result.message || "ไม่พบข้อมูล กรุณาตรวจสอบเลขประจำตัวหรือติดต่อผู้ดูแลระบบ",
        });
        return;
      }
      if (result.alreadyRegistered) {
        setErrors({
          studentId: result.message || "บัญชีนี้สมัครแล้ว กรุณาเข้าสู่ระบบ",
        });
        return;
      }
      if (!result.canRegister || !result.registrationToken) {
        setFormError("ไม่สามารถสมัครสมาชิกได้ กรุณาติดต่อผู้ดูแลระบบ");
        return;
      }
      setProfile({
        firstName: result.firstName || "",
        lastName: result.lastName || "",
        gradeLevel: result.gradeLevel,
        roomNumber: result.roomNumber,
      });
      setRegistrationToken(result.registrationToken);
      setStep(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "ค้นหาข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setErrors({});
    setFormError(null);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const next: Record<string, string> = {};
      if (password.length < 8) {
        next.password = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว";
      } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        next.password = "รหัสผ่านต้องมีตัวอักษรและตัวเลข";
      }
      if (password !== confirmPassword) {
        next.confirmPassword = "รหัสผ่านไม่ตรงกัน";
      }
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const next: Record<string, string> = {};
      if (!/^\d{6}$/.test(pin)) {
        next.pin = "PIN ต้องเป็นตัวเลข 6 หลัก";
      }
      if (pin !== confirmPin) {
        next.confirmPin = "PIN ไม่ตรงกัน";
      }
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setSubmitting(true);
      try {
        await completeRegistration({
          studentId,
          registrationToken,
          password,
          pin,
        });
        router.push("/home");
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setErrors({});
    setFormError(null);
    if (step === 1) {
      setProfile(null);
      setRegistrationToken("");
    }
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl border border-border-light p-6 shadow-card">
        <UserPlus className="w-10 h-10 text-line-green mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-1">เริ่มใช้งาน</h1>
        <p className="text-sm text-text-secondary mb-6">สมัครสมาชิกเพื่อใช้งานระบบ Found-U</p>

        <FormStepper steps={[...STEPS]} currentStep={step} className="mb-6" />

        {step === 0 && (
          <div className="space-y-4">
            <ValidationSummary issues={recordToIssues(errors)} />
            <div>
              <label htmlFor={fieldId("studentId")} className="block text-sm font-medium mb-1">
                เลขประจำตัว (5 หลัก)
              </label>
              <input
                id={fieldId("studentId")}
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5));
                  if (errors.studentId) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.studentId;
                      return next;
                    });
                  }
                }}
                aria-invalid={errors.studentId ? true : undefined}
                aria-describedby={errors.studentId ? fieldErrorId("studentId") : undefined}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border-light font-mono text-lg tracking-widest",
                  inputStateClass(errors.studentId)
                )}
                placeholder="12345"
                autoFocus
              />
              <FieldValidationMessage
                id={fieldErrorId("studentId")}
                message={errors.studentId}
              />
            </div>
            <p className="text-xs text-text-tertiary">
              กรอกเลขประจำตัวนักเรียนตามที่โรงเรียนแจ้ง ระบบจะแสดงชื่อและห้องให้ตรวจสอบ
            </p>
          </div>
        )}

        {step === 1 && profile && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border-light bg-bg-secondary p-4 space-y-3">
              <p className="text-sm text-text-secondary">ข้อมูลของคุณในระบบ</p>
              <div>
                <p className="text-xs text-text-tertiary">ชื่อ-นามสกุล</p>
                <p className="font-semibold text-text-primary">
                  {profile.firstName} {profile.lastName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">ระดับชั้น</p>
                  <p className="font-medium text-text-primary">{profile.gradeLevel || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">ห้อง</p>
                  <p className="font-medium text-text-primary">{profile.roomNumber || "—"}</p>
                </div>
              </div>
              <p className="text-xs text-text-tertiary font-mono">เลขประจำตัว: {studentId}</p>
            </div>
            <p className="text-sm text-text-secondary">
              หากข้อมูลไม่ตรงกับตัวคุณ กรุณาตรวจสอบเลขประจำตัวแล้วแก้ไข
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <ValidationSummary issues={recordToIssues(errors)} />
            <div>
              <label htmlFor={fieldId("password")} className="block text-sm font-medium mb-1">
                รหัสผ่าน
              </label>
              <input
                id={fieldId("password")}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? fieldErrorId("password") : undefined}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border-light",
                  inputStateClass(errors.password)
                )}
                minLength={8}
                autoFocus
              />
              <FieldValidationMessage id={fieldErrorId("password")} message={errors.password} />
              <p className="text-xs text-text-tertiary mt-1">อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข</p>
            </div>
            <div>
              <label htmlFor={fieldId("confirmPassword")} className="block text-sm font-medium mb-1">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id={fieldId("confirmPassword")}
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.confirmPassword;
                      return next;
                    });
                  }
                }}
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={errors.confirmPassword ? fieldErrorId("confirmPassword") : undefined}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border-light",
                  inputStateClass(errors.confirmPassword)
                )}
              />
              <FieldValidationMessage
                id={fieldErrorId("confirmPassword")}
                message={errors.confirmPassword}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <ValidationSummary issues={recordToIssues(errors)} />
            <div>
              <label htmlFor={fieldId("pin")} className="block text-sm font-medium mb-1">
                PIN 6 หลัก
              </label>
              <input
                id={fieldId("pin")}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (errors.pin) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.pin;
                      return next;
                    });
                  }
                }}
                aria-invalid={errors.pin ? true : undefined}
                aria-describedby={errors.pin ? fieldErrorId("pin") : undefined}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border-light font-mono text-2xl tracking-[0.5em] text-center",
                  inputStateClass(errors.pin)
                )}
                placeholder="••••••"
                autoFocus
              />
              <FieldValidationMessage id={fieldErrorId("pin")} message={errors.pin} />
              <p className="text-xs text-text-tertiary mt-1">ใช้เข้าสู่ระบบอย่างรวดเร็วบนอุปกรณ์นี้</p>
            </div>
            <div>
              <label htmlFor={fieldId("confirmPin")} className="block text-sm font-medium mb-1">
                ยืนยัน PIN
              </label>
              <input
                id={fieldId("confirmPin")}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (errors.confirmPin) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.confirmPin;
                      return next;
                    });
                  }
                }}
                aria-invalid={errors.confirmPin ? true : undefined}
                aria-describedby={errors.confirmPin ? fieldErrorId("confirmPin") : undefined}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-border-light font-mono text-2xl tracking-[0.5em] text-center",
                  inputStateClass(errors.confirmPin)
                )}
                placeholder="••••••"
              />
              <FieldValidationMessage id={fieldErrorId("confirmPin")} message={errors.confirmPin} />
            </div>
          </div>
        )}

        {formError && <StatusAlert variant="error" message={formError} className="mt-4" />}

        {step === 0 ? (
          <button
            type="button"
            onClick={handleLookup}
            disabled={submitting || studentId.length !== 5}
            className="w-full mt-6 py-3 bg-line-green text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            ถัดไป
          </button>
        ) : (
          <FormStepperActions
            currentStep={step}
            totalSteps={STEPS.length}
            onBack={handleBack}
            onNext={step < 3 ? handleNext : undefined}
            onSubmit={step === 3 ? handleNext : undefined}
            isSubmitting={submitting}
            nextLabel={step === 1 ? "ถูกต้อง ดำเนินการต่อ" : "ถัดไป"}
            submitLabel="เริ่มใช้งาน"
            className="mt-6"
          />
        )}

        {step === 1 && (
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setProfile(null);
              setRegistrationToken("");
              setErrors({});
              setFormError(null);
            }}
            className="w-full mt-3 text-sm text-text-secondary hover:text-text-primary"
          >
            ไม่ใช่ฉัน — แก้ไขเลขประจำตัว
          </button>
        )}

        <Link href={AUTH_ROUTES.login} className="block text-center text-sm text-line-green mt-4 hover:underline">
          มีบัญชีแล้ว? เข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
