import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import { isRejection, requireApiAuth } from "@/lib/api/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { getBackgroundJobForOrganization } from "@/modules/jobs/job-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const context = createApiContext(request);
  const auth = await requireApiAuth(request, context);
  if (isRejection(auth)) return auth;

  const orgContext = await getOrganizationContext();
  if (!orgContext) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Organization context required",
      context,
    );
  }

  const { jobId } = await params;
  const job = await getBackgroundJobForOrganization(
    jobId,
    orgContext.organizationId,
  );
  if (!job) {
    return apiError("INVALID_REQUEST", "Job not found", context);
  }

  return apiSuccess(
    {
      id: job.id,
      type: job.type,
      status: job.status,
      errorMessage: job.errorMessage,
      completedAt: job.completedAt?.toISOString() ?? null,
      artifact: job.artifact
        ? {
            id: job.artifact.id,
            filename: job.artifact.filename,
            contentType: job.artifact.contentType,
            sizeBytes: job.artifact.sizeBytes,
            downloadUrl: `/api/artifacts/${job.artifact.id}/download`,
          }
        : null,
    },
    context,
  );
}
