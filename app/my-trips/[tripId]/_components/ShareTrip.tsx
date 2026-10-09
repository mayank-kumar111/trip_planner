"use client";

import React, { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Copy, Link2, Share2, X } from "lucide-react";

export default function ShareTrip({
  tripId,
  shareToken,
}: {
  tripId: string;
  shareToken?: string | null;
}) {
  const createShareLink = useMutation(api.tripDetail.CreateTripShareLink);
  const revokeShareLink = useMutation(api.tripDetail.RevokeTripShareLink);
  const [shareUrl, setShareUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shareToken) {
      setShareUrl(`${window.location.origin}/shared-trip/${shareToken}`);
    } else {
      setShareUrl("");
    }
  }, [shareToken]);

  const handleCreate = async () => {
    setLoading(true);
    setStatus("");
    try {
      const result = await createShareLink({ tripId });
      const url = `${window.location.origin}/shared-trip/${result.shareToken}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Link created and copied.");
      } catch {
        setStatus("Link created. Copy it using the Copy button.");
      }
    } catch (error) {
      console.error("Trip share failed:", error);
      setStatus(error instanceof Error ? error.message : "Unable to create share link.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy failed. Select the link and copy it manually.");
    }
  };

  const handleRevoke = async () => {
    if (!shareUrl || loading) return;
    const confirmed = window.confirm("Revoke this public share link?");
    if (!confirmed) return;

    setLoading(true);
    setStatus("");
    try {
      await revokeShareLink({ tripId });
      setShareUrl("");
      setStatus("Share link revoked.");
    } catch (error) {
      console.error("Share link revoke failed:", error);
      setStatus(error instanceof Error ? error.message : "Unable to revoke share link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Share Trip</h2>
          <p className="text-sm text-gray-500">
            Create a public read-only link for this itinerary. Your account details stay private.
          </p>
        </div>
        {!shareUrl && (
          <Button onClick={handleCreate} disabled={loading}>
            <Share2 className="mr-2" size={16} />
            {loading ? "Creating…" : "Create Share Link"}
          </Button>
        )}
      </div>

      {shareUrl && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm">
            <Link2 size={16} className="shrink-0" />
            <span className="truncate">{shareUrl}</span>
          </div>
          <Button variant="outline" onClick={handleCopy} disabled={loading}>
            <Copy className="mr-2" size={16} />
            Copy
          </Button>
          <Button variant="outline" onClick={handleRevoke} disabled={loading}>
            <X className="mr-2" size={16} />
            Revoke
          </Button>
        </div>
      )}

      {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
