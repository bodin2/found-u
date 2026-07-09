"use client";

import { useEffect, useState } from "react";
import type { WizardAdminInput } from "@/lib/setup/validations/wizard-admin";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { StatusAlert } from "@/components/ui/status-alert";
import { inputStateClass } from "@/components/ui/validated-field";
import {
  fieldErrorId,
  fieldId,
  getIssueMessage,
  type ValidationIssue,
} from "@/lib/feedback/types";
import { cn } from "@/lib/utils";

export type AdminDraft = WizardAdminInput;

type StepSuperadminProps = {
  initial: AdminDraft;
  onChange: (draft: AdminDraft) => void;
  issues?: ValidationIssue[];
  formError?: string | null;
};

export function StepSuperadmin({ initial, onChange, issues = [], formError }: StepSuperadminProps) {
  const [draft, setDraft] = useState<AdminDraft>(initial);
  const studentIdError = getIssueMessage(issues, "studentId");
  const passwordError = getIssueMessage(issues, "password");
  const confirmPasswordError = getIssueMessage(issues, "confirmPassword");

  useEffect(() => {
    onChange(draft);
  }, [draft, onChange]);

  function update<K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-text-primary">สร้างบัญชีผู้ดูแลระบบ</h2>

      <ValidationSummary issues={issues} title="กรุณาตรวจสอบข้อมูลในขั้นตอนนี้:" />
      {formError ? <StatusAlert variant="error" message={formError} /> : null}

      <div>
        <label htmlFor={fieldId("studentId")} className="block text-sm font-medium mb-1">
          เลขแอดมิน (5 หลัก)
        </label>
        <input
          id={fieldId("studentId")}
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={draft.studentId}
          onChange={(e) =>
            update("studentId", e.target.value.replace(/\D/g, "").slice(0, 5))
          }
          aria-invalid={studentIdError ? true : undefined}
          aria-describedby={studentIdError ? fieldErrorId("studentId") : undefined}
          className={cn(
            "w-full px-4 py-3 rounded-xl border border-border-light font-mono text-lg tracking-widest",
            inputStateClass(studentIdError)
          )}
          placeholder="12345"
          autoFocus
        />
        <FieldValidationMessage id={fieldErrorId("studentId")} message={studentIdError} />
      </div>

      <div>
        <label htmlFor={fieldId("password")} className="block text-sm font-medium mb-1">
          รหัสผ่าน
        </label>
        <input
          id={fieldId("password")}
          type="password"
          value={draft.password}
          onChange={(e) => update("password", e.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? fieldErrorId("password") : undefined}
          className={cn(
            "w-full px-4 py-3 rounded-xl border border-border-light",
            inputStateClass(passwordError)
          )}
          autoComplete="new-password"
        />
        <FieldValidationMessage id={fieldErrorId("password")} message={passwordError} />
        <p className="text-xs text-text-tertiary mt-1">อย่างน้อย 7 ตัวอักษร</p>
      </div>

      <div>
        <label htmlFor={fieldId("confirmPassword")} className="block text-sm font-medium mb-1">
          ยืนยันรหัสผ่าน
        </label>
        <input
          id={fieldId("confirmPassword")}
          type="password"
          value={draft.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          aria-invalid={confirmPasswordError ? true : undefined}
          aria-describedby={confirmPasswordError ? fieldErrorId("confirmPassword") : undefined}
          className={cn(
            "w-full px-4 py-3 rounded-xl border border-border-light",
            inputStateClass(confirmPasswordError)
          )}
          autoComplete="new-password"
        />
        <FieldValidationMessage
          id={fieldErrorId("confirmPassword")}
          message={confirmPasswordError}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ (ไม่บังคับ)</label>
          <input
            type="text"
            value={draft.firstName ?? ""}
            onChange={(e) => update("firstName", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border-light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">นามสกุล (ไม่บังคับ)</label>
          <input
            type="text"
            value={draft.lastName ?? ""}
            onChange={(e) => update("lastName", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border-light"
          />
        </div>
      </div>

      <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-3">
        เก็บรหัสผ่านให้ดี — ใช้ล็อกอินครั้งแรกหลังตั้งค่าเสร็จ
      </p>
    </div>
  );
}
