"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MailPlus, Trash2, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrganizationInvitation,
  getOrganizationAdminData,
  removeOrganizationMember,
  revokeOrganizationInvitation,
  setOrganizationPlan,
  setOrganizationProductAnalytics,
  updateOrganizationDomainAllowlist,
  updateOrganizationMemberRole,
  updateOrganizationSupportContact,
  type InvitationSummary,
  type MemberSummary,
  type OrganizationPlanAdminSummary,
} from "@/app/(app)/admin/actions";
import type { OrganizationRole } from "@/lib/tenancy-policy";
import {
  ORGANIZATION_PLANS,
  type OrganizationPlanId,
} from "@/lib/platform/org-plans";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const ratio = max > 0 ? Math.min(1, used / max) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function OrganizationAdminPanel() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<OrganizationRole[]>(
    [],
  );
  const [plan, setPlan] = useState<OrganizationPlanAdminSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<OrganizationPlanId>("SOLO");
  const [domainsDraft, setDomainsDraft] = useState("");
  const [supportEmailDraft, setSupportEmailDraft] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("MEMBER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [productAnalyticsEnabled, setProductAnalyticsEnabled] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<OrganizationRole>("ADMIN");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOrganizationAdminData();
      setMembers(data.members);
      setInvitations(data.invitations);
      setAssignableRoles(data.assignableRoles);
      setProductAnalyticsEnabled(data.productAnalyticsEnabled);
      setCurrentUserRole(data.currentUserRole);
      setCurrentUserId(data.currentUserId);
      setPlan(data.plan);
      setSelectedPlan(data.plan.plan);
      setDomainsDraft(data.plan.allowedEmailDomains.join("\n"));
      setSupportEmailDraft(data.plan.supportContactEmail ?? "");
      if (data.assignableRoles.length > 0) {
        setRole(data.assignableRoles[0]);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load organization administration data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleInvite = () => {
    startTransition(async () => {
      setError(null);
      setInviteUrl(null);
      setInviteEmailSent(false);
      try {
        const result = await createOrganizationInvitation({ email, role });
        setInviteUrl(result.inviteUrl);
        setInviteEmailSent(result.emailSent);
        setEmail("");
        await load();
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "Failed to create invitation",
        );
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (assignableRoles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team administration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You can review members and audit activity, but only owners and
            admins can manage invitations and roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle>Plan & usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-medium">{plan.label}</p>
                  <Badge variant="outline">{plan.priceLabel}</Badge>
                </div>
                <p className="text-muted-foreground max-w-xl text-sm">
                  {plan.description}
                </p>
                <p className="text-muted-foreground text-xs">
                  Collaborative workspaces:{" "}
                  {plan.collaborativeWorkspaces ? "enabled" : "not included"}.
                  SSO / SAML is upcoming for institution pilots.
                </p>
              </div>
              {plan.canManagePlan && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedPlan}
                    onValueChange={(value) =>
                      setSelectedPlan(value as OrganizationPlanId)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ORGANIZATION_PLANS).map((planId) => (
                        <SelectItem key={planId} value={planId}>
                          {planId === "SOLO"
                            ? "Solo"
                            : planId === "SOLO_PRO"
                              ? "Solo Pro"
                              : planId === "LAB"
                                ? "Lab"
                                : "Institution"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={selectedPlan === plan.plan || isPending}
                    onClick={() =>
                      startTransition(async () => {
                        setError(null);
                        try {
                          await setOrganizationPlan(selectedPlan);
                          await load();
                        } catch (planError) {
                          setError(
                            planError instanceof Error
                              ? planError.message
                              : "Failed to update plan",
                          );
                        }
                      })
                    }
                  >
                    Apply plan
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <UsageMeter
                label="Seats"
                used={plan.usage.members + plan.usage.pendingInvitations}
                max={plan.limits.maxMembers}
              />
              <UsageMeter
                label="AI units (this month)"
                used={plan.usage.aiUsageThisMonth}
                max={plan.limits.maxAiRequests}
              />
              <UsageMeter
                label="Projects"
                used={plan.usage.projects}
                max={plan.limits.maxProjects}
              />
              <UsageMeter
                label="Collections"
                used={plan.usage.collections}
                max={plan.limits.maxCollections}
              />
              <UsageMeter
                label="Saved graphs"
                used={plan.usage.savedGraphs}
                max={plan.limits.maxSavedGraphs}
              />
              <UsageMeter
                label="Paper records"
                used={plan.usage.paperRecords}
                max={plan.limits.maxPaperRecords}
              />
            </div>

            {plan.domainAllowlistEnabled && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Allowed email domains</p>
                  <p className="text-muted-foreground text-sm">
                    Invites are limited to these domains. Leave empty to allow
                    any domain during a pilot.
                  </p>
                </div>
                <Textarea
                  value={domainsDraft}
                  onChange={(event) => setDomainsDraft(event.target.value)}
                  placeholder={"lab.edu\ncollege.edu"}
                  rows={3}
                />
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      try {
                        await updateOrganizationDomainAllowlist(domainsDraft);
                        await load();
                      } catch (domainError) {
                        setError(
                          domainError instanceof Error
                            ? domainError.message
                            : "Failed to update domains",
                        );
                      }
                    })
                  }
                >
                  Save domains
                </Button>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">Pilot support contact</p>
                <p className="text-muted-foreground text-sm">
                  Shown to members in the app sidebar so they know who to ask
                  for help during a pilot.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="lab-support@university.edu"
                  value={supportEmailDraft}
                  onChange={(event) => setSupportEmailDraft(event.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      try {
                        await updateOrganizationSupportContact(
                          supportEmailDraft,
                        );
                        await load();
                      } catch (supportError) {
                        setError(
                          supportError instanceof Error
                            ? supportError.message
                            : "Failed to update support contact",
                        );
                      }
                    })
                  }
                >
                  Save contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invite a teammate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <Input
              type="email"
              placeholder="researcher@lab.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Select
              value={role}
              onValueChange={(value) => setRole(value as OrganizationRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((assignableRole) => (
                  <SelectItem key={assignableRole} value={assignableRole}>
                    {assignableRole}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={!email || isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="h-4 w-4" />
              )}
              Invite
            </Button>
          </div>
          {inviteUrl && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="mb-1 font-medium">
                {inviteEmailSent
                  ? "Invitation email sent"
                  : "Invitation created (email not sent — copy the link)"}
              </p>
              <p className="text-muted-foreground mb-1 text-xs">
                Copyable backup link for Slack or email:
              </p>
              <p className="text-muted-foreground break-all">{inviteUrl}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm">
              Optional workflow analytics help measure activation and
              reliability without capturing paper content, search text, or
              personal details.
            </p>
            <p className="text-muted-foreground text-sm">
              Disable this for organizations that require analytics opt-out.
            </p>
          </div>
          <Switch
            checked={productAnalyticsEnabled}
            onCheckedChange={(enabled) =>
              startTransition(async () => {
                setError(null);
                try {
                  await setOrganizationProductAnalytics(enabled);
                  setProductAnalyticsEnabled(enabled);
                } catch (toggleError) {
                  setError(
                    toggleError instanceof Error
                      ? toggleError.message
                      : "Failed to update analytics preference",
                  );
                }
              })
            }
            aria-label="Enable product analytics"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {invitations.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              No pending invitations.
            </p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-muted-foreground text-sm">
                    Expires {new Date(invitation.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{invitation.role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      startTransition(async () => {
                        await revokeOrganizationInvitation(invitation.id);
                        await load();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members and roles</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            const isOwnerTarget = member.role === "OWNER";
            const isAdminTarget = member.role === "ADMIN";

            // Role management capabilities:
            // - OWNER can manage all roles except the last owner safeguard.
            // - ADMIN can only modify MEMBER and VIEWER roles (cannot demote or remove OWNER or other ADMINs).
            const canManageThisMember =
              currentUserRole === "OWNER" ||
              (!isOwnerTarget && (!isAdminTarget || isCurrentUser));

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-muted-foreground text-sm">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!member.emailVerified && (
                    <Badge variant="outline">Unverified</Badge>
                  )}
                  {canManageThisMember ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        startTransition(async () => {
                          try {
                            setError(null);
                            await updateOrganizationMemberRole({
                              membershipId: member.id,
                              role: value as OrganizationRole,
                            });
                            await load();
                          } catch (roleError) {
                            setError(
                              roleError instanceof Error
                                ? roleError.message
                                : "Failed to update member role",
                            );
                          }
                        })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[member.role, ...assignableRoles]
                          .filter(
                            (option, index, array) =>
                              array.indexOf(option) === index,
                          )
                          .map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 w-[140px] items-center px-2">
                      <Badge
                        variant={member.role === "OWNER" ? "default" : "secondary"}
                        className="font-mono text-xs"
                      >
                        {member.role}
                      </Badge>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canManageThisMember || isCurrentUser || isPending}
                    title={
                      isCurrentUser
                        ? "You cannot remove yourself"
                        : !canManageThisMember
                          ? "Only organization owners can modify this member"
                          : "Remove member"
                    }
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          setError(null);
                          await removeOrganizationMember(member.id);
                          await load();
                        } catch (removeError) {
                          setError(
                            removeError instanceof Error
                              ? removeError.message
                              : "Failed to remove member",
                          );
                        }
                      })
                    }
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
