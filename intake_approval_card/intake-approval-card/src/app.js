import React, { useEffect, useState } from "react";
import {
  hubspot,
  Button,
  Select,
  Text,
  Flex,
  Divider,
  Link,
  Toast,
} from "@hubspot/ui-extensions";

const OPTIONS = [
  { label: "Draft", value: "Draft" },
  { label: "In review", value: "In review" },
  { label: "Approved", value: "Approved" },
  { label: "Processing", value: "Processing" },
  { label: "Processed", value: "Processed" },
  { label: "Failed", value: "Failed" }
];

hubspot.extend(({ context, fetchCrmObjectProperties, onCrmPropertiesUpdate }) => (
  <App
    context={context}
    fetchCrmObjectProperties={fetchCrmObjectProperties}
    onCrmPropertiesUpdate={onCrmPropertiesUpdate}
  />
));

function App({ context, fetchCrmObjectProperties, onCrmPropertiesUpdate }) {
  const objectId = context?.crm?.object?.objectId;
  const objectTypeId = context?.crm?.object?.objectTypeId;

  const [status, setStatus] = useState("Draft");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rehydrationUrl, setRehydrationUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const props = await fetchCrmObjectProperties([
          "approval_status",
          "rehydration_url"
        ]);
        if (!mounted) return;
        setStatus(props?.approval_status || "Draft");
        setRehydrationUrl(
          props?.rehydration_url || (objectId ? `https://mydomain.com/forms/intake/${objectId}` : "")
        );
      } catch {
        /* noop */
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const unsubscribe = onCrmPropertiesUpdate?.((updated) => {
      if ("approval_status" in updated) setStatus(updated.approval_status);
      if ("rehydration_url" in updated) setRehydrationUrl(updated.rehydration_url);
    });
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [fetchCrmObjectProperties, onCrmPropertiesUpdate, objectId]);

  const setStatusServerless = async (next) => {
    setSaving(true);
    try {
      const res = await hubspot.serverless("set-status", {
        method: "POST",
        body: { objectId, objectTypeId, approval_status: next },
      });
      if (!res.ok) {
        const msg = (await res.json())?.message || "Failed to update status.";
        Toast.error(msg);
        return;
      }
      setStatus(next);
      Toast.success(`Status set to “${next}”`);
    } catch {
      Toast.error("Error updating status.");
    } finally {
      setSaving(false);
    }
  };

  const approveAndRun = async () => setStatusServerless("Approved");
  const sendToReview = async () => setStatusServerless("In review");
  const markFailed = async () => setStatusServerless("Failed");

  const canApprove = ["Draft", "In review", "Failed"].includes(status);
  const canRetry = ["Failed", "Approved"].includes(status);

  return (
    <Flex direction="column" gap="sm">
      <Text variant="heading-sm">Intake Approval</Text>
      {rehydrationUrl ? (
        <Link href={rehydrationUrl} target="_blank" truncate>
          {rehydrationUrl}
        </Link>
      ) : null}

      <Divider />

      <Select
        label="Approval status"
        options={OPTIONS}
        value={status}
        onChange={(val) => setStatusServerless(val)}
        disabled={loading || saving || !objectId}
      />

      <Flex gap="sm">
        <Button onClick={sendToReview} disabled={!canApprove || saving || !objectId}>
          Send to Review
        </Button>
        <Button onClick={approveAndRun} disabled={!canApprove || saving || !objectId}>
          Approve & Start
        </Button>
        <Button onClick={markFailed} variant="secondary" disabled={!canRetry || saving || !objectId}>
          Mark Failed
        </Button>
      </Flex>

      <Text variant="microcopy" help>
        “Approve & Start” sets <code>approval_status</code> to <code>Approved</code>. Your HubSpot workflow triggers the processing.
      </Text>
    </Flex>
  );
}

