import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SetupPageClient } from "./setup-page-client";
import { fetchSetupStatusAdmin } from "@/lib/setup/setup-status-server";
import {
  getAiCredentialsData,
  getSchoolBrandingData,
} from "@/lib/setup/wizard-db";
import { dbStepToWizardIndex } from "@/lib/setup/schemas/setup-status";
import { hasMinimumSetupEnv } from "@/lib/setup/db-url";
import type { SetupWizardInitialState } from "./setup-wizard";

export const dynamic = "force-dynamic";

const EMPTY_WIZARD_STATE: SetupWizardInitialState = {
  initialStep: 0,
  branding: { schoolName: "" },
  ai: { provider: "auto" },
};

async function loadWizardInitialState(
  status: Awaited<ReturnType<typeof fetchSetupStatusAdmin>>
): Promise<SetupWizardInitialState> {
  if (!status.databaseReady) {
    return EMPTY_WIZARD_STATE;
  }

  try {
    const branding = await getSchoolBrandingData();
    const aiCreds = await getAiCredentialsData();

    return {
      initialStep: dbStepToWizardIndex(status.currentStep),
      branding: {
        schoolName: branding?.school_name ?? "",
        existingLogoUrl: branding?.logo_url,
      },
      ai: {
        provider:
          aiCreds?.provider === "none"
            ? "none"
            : (aiCreds?.provider ?? "auto"),
        openrouterModel: aiCreds?.openrouter_model,
        skippedAi: aiCreds?.provider === "none",
      },
    };
  } catch {
    return EMPTY_WIZARD_STATE;
  }
}

export default async function SetupPage() {
  if (!hasMinimumSetupEnv()) {
    return (
      <Suspense
        fallback={
          <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm text-text-secondary">กำลังโหลด...</p>
          </main>
        }
      >
        <SetupPageClient initialState={{ ...EMPTY_WIZARD_STATE, envMissing: true }} />
      </Suspense>
    );
  }

  const status = await fetchSetupStatusAdmin();
  if (status.setupCompleted) {
    redirect("/");
  }

  const initialState = await loadWizardInitialState(status);

  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm text-text-secondary">กำลังโหลด...</p>
        </main>
      }
    >
      <SetupPageClient
        initialState={{
          ...initialState,
          databaseReady: status.databaseReady,
        }}
      />
    </Suspense>
  );
}
