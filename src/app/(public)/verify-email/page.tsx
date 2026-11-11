"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(
        "Invalid verification link. Please check your email and try again.",
      );
      return;
    }

    const verifyEmail = async () => {
      try {
        const { error } = await authClient.verifyEmail({
          query: {
            token,
          },
        });

        if (error) {
          setStatus("error");
          setMessage(error.message || "Failed to verify email.");
        } else {
          setStatus("success");
          setMessage(
            "Your email has been successfully verified! You can now access all features.",
          );
        }
      } catch (err) {
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again later.");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <Card className="border-muted w-full max-w-md shadow-lg">
      <CardHeader className="pb-2 text-center">
        <div className="bg-muted/50 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          {status === "verifying" && (
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="text-destructive h-6 w-6" />
          )}
        </div>
        <CardTitle className="text-xl">
          {status === "verifying" && "Verifying Email"}
          {status === "success" && "Email Verified"}
          {status === "error" && "Verification Failed"}
        </CardTitle>
        <CardDescription>
          {status === "verifying" &&
            "Please wait while we verify your account..."}
          {status === "success" &&
            "Thank you for confirming your email address."}
          {status === "error" &&
            "We couldn't verify your email using this link."}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-muted-foreground pb-6 text-center text-sm">
        {message}
      </CardContent>

      <CardFooter className="flex justify-center">
        {status !== "verifying" && (
          <Button
            className="w-full"
            onClick={() =>
              router.push(status === "success" ? "/explore" : "/signin")
            }
          >
            {status === "success" ? "Continue to App" : "Back to Sign In"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
