"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FormStepper, FormStepperActions } from "@/components/ui/form-stepper";
import { LoadingModal } from "@/components/ui/loading-modal";
import { SETUP_WIZARD_STEP_LABELS, SETUP_WIZARD_STEPS_COUNT } from "@/lib/setup/constants";
import { SetupHeader } from "@/app/setup/components/setup-header";
import {
  StepBranding,
  getBrandingLogoFile,
  type BrandingDraft,
} from "@/app/setup/components/step-branding";
import { StepAiConfig, type AiDraft } from "@/app/setup/components/step-ai-config";
import { StepSuperadmin, type AdminDraft } from "@/app/setup/components/step-superadmin";
import { SetupInitializing } from "@/app/setup/setup-initializing";
import { SetupCompleteRedirect } from "@/app/setup/setup-complete-redirect";
import {
  completeSetupAction,
  saveAiConfigAction,
  saveBrandingAction,
  skipAiConfigAction,
} from "@/app/setup/actions";
import { wizardBrandingSchema } from "@/lib/setup/validations/wizard-branding";
import { wizardAiConfigSchema } from "@/lib/setup/validations/wizard-ai";
import { wizardAdminSchema } from "@/lib/setup/validations/wizard-admin";
import {
  type ValidationIssue,
  zodErrorToIssues,
} from "@/lib/feedback/types";

export type SetupWizardInitialState = {
  initialStep: number;
  branding: BrandingDraft;
  ai: AiDraft;
};

type SetupWizardProps = SetupWizardInitialState;

type Phase = "init" | "wizard" | "done";

export function SetupWizard({ initialStep, branding, ai }: SetupWizardProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("init");
  const [step, setStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [brandingDraft, setBrandingDraft] = useState<BrandingDraft>(branding);
  const [aiDraft, setAiDraft] = useState<AiDraft>(ai);
  const [adminDraft, setAdminDraft] = useState<AdminDraft>({
    studentId: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    nickname: "Admin",
  });

  const handleBrandingChange = useCallback((draft: BrandingDraft) => {
    setBrandingDraft(draft);
  }, []);

  const handleAiChange = useCallback((draft: AiDraft) => {
    setAiDraft(draft);
  }, []);

  const handleAdminChange = useCallback((draft: AdminDraft) => {
    setAdminDraft(draft);
  }, []);

  const handleBack = () => {
    setValidationIssues([]);
    setFormError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSkipAi = async () => {
    setValidationIssues([]);
    setFormError(null);
    setIsSubmitting(true);
    const result = await skipAiConfigAction();
    setIsSubmitting(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setStep(2);
  };

  const handleNext = async () => {
    setValidationIssues([]);
    setFormError(null);

    if (step === 0) {
      const parsed = wizardBrandingSchema.safeParse({
        schoolName: brandingDraft.schoolName,
      });
      if (!parsed.success) {
        setValidationIssues(zodErrorToIssues(parsed.error));
        return;
      }

      setIsSubmitting(true);
      const formData = new FormData();
      formData.set("schoolName", parsed.data.schoolName);
      const logoFile = getBrandingLogoFile();
      if (logoFile) formData.set("logo", logoFile);
      if (brandingDraft.existingLogoUrl) {
        formData.set("existingLogoUrl", brandingDraft.existingLogoUrl);
      }

      const result = await saveBrandingAction(formData);
      setIsSubmitting(false);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      const parsed = wizardAiConfigSchema.safeParse(aiDraft);
      if (!parsed.success) {
        setValidationIssues(zodErrorToIssues(parsed.error));
        return;
      }

      setIsSubmitting(true);
      const result = await saveAiConfigAction(parsed.data);
      setIsSubmitting(false);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setStep(2);
    }
  };

  const handleComplete = async () => {
    setValidationIssues([]);
    setFormError(null);
    const parsed = wizardAdminSchema.safeParse(adminDraft);
    if (!parsed.success) {
      setValidationIssues(zodErrorToIssues(parsed.error));
      return;
    }

    setIsSubmitting(true);
    const result = await completeSetupAction(parsed.data);
    setIsSubmitting(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPhase("done");
  };

  if (phase === "init") {
    return (
      <SetupInitializing
        onReady={() => setPhase("wizard")}
        onCompleted={() => router.replace("/")}
      />
    );
  }

  if (phase === "done") {
    return <SetupCompleteRedirect />;
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl border border-border-light p-6 shadow-card">
        <SetupHeader />
        <FormStepper
          steps={[...SETUP_WIZARD_STEP_LABELS]}
          currentStep={step}
          className="mb-6"
        />

        {step === 0 ? (
          <StepBranding
            initial={brandingDraft}
            onChange={handleBrandingChange}
            issues={validationIssues}
            formError={formError}
          />
        ) : null}
        {step === 1 ? (
          <StepAiConfig
            initial={aiDraft}
            onChange={handleAiChange}
            onSkip={() => void handleSkipAi()}
            issues={validationIssues}
            formError={formError}
            isSubmitting={isSubmitting}
          />
        ) : null}
        {step === 2 ? (
          <StepSuperadmin
            initial={adminDraft}
            onChange={handleAdminChange}
            issues={validationIssues}
            formError={formError}
          />
        ) : null}

        <FormStepperActions
          currentStep={step}
          totalSteps={SETUP_WIZARD_STEPS_COUNT}
          onBack={handleBack}
          onNext={() => void handleNext()}
          onSubmit={() => void handleComplete()}
          isSubmitting={isSubmitting}
          submitLabel="เริ่มใช้งาน Found-U"
          className="mt-6"
        />

        <LoadingModal isOpen={isSubmitting} message="กำลังบันทึก..." />
      </div>
    </div>
  );
}
