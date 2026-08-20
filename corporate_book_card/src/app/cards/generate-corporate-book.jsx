import { useState } from "react";
import {
  hubspot,
  Alert,
  Button,
  Divider,
  Flex,
  Link,
  Text,
} from "@hubspot/ui-extensions";

const ENDPOINT_URL =
  "https://kkos.developernews.tech/api/v1/intake/packet/corporate-book/generate";
const REQUEST_TIMEOUT_MS = 90_000;

hubspot.extend(({ context, actions }) => (
  <GenerateCorporateBookCard
    context={context}
    sendAlert={actions.addAlert}
    refreshObjectProperties={actions.refreshObjectProperties}
  />
));

function GenerateCorporateBookCard({ context, sendAlert, refreshObjectProperties }) {
  const ticketId = context?.crm?.objectId;

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [mergedPdfFileId, setMergedPdfFileId] = useState(null);
  const [mergedPdfName, setMergedPdfName] = useState(null);

  const canSubmit = !!ticketId && !submitting;

  const handleClick = async () => {
    setErrorMessage(null);
    setMergedPdfFileId(null);
    setMergedPdfName(null);
    setSubmitting(true);

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("__request_timeout__")),
        REQUEST_TIMEOUT_MS
      );
    });

    const requestBody = { ticketId: String(ticketId) };
    console.log("[corporate-book] POST", ENDPOINT_URL, requestBody);

    try {
      const res = await Promise.race([
        hubspot.fetch(ENDPOINT_URL, {
          method: "POST",
          body: requestBody,
        }),
        timeoutPromise,
      ]);

      console.log("[corporate-book] response status:", res.status, res.statusText);

      let raw = "";
      try {
        raw = await res.text();
      } catch (e) {
        console.log("[corporate-book] failed to read response body:", e);
        raw = "";
      }
      console.log("[corporate-book] raw response body:", raw);

      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.log("[corporate-book] response body was not JSON:", e);
        data = null;
      }
      console.log("[corporate-book] parsed response data:", data);

      if (!res.ok) {
        const fieldErrors = data?.errors
          ? Object.entries(data.errors)
              .map(([field, msgs]) => {
                const list = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
                return `${field}: ${list}`;
              })
              .join("\n")
          : "";
        console.log(
          "[corporate-book] non-2xx response, field errors:",
          data?.errors || "(none)"
        );
        const headline =
          data?.message ||
          (raw ? raw : `Corporate book generation failed (${res.status}).`);
        const message = fieldErrors
          ? `${headline}\n${fieldErrors}`
          : headline;
        setErrorMessage(message);
        sendAlert({ type: "danger", message });
        return;
      }

      const fileId = data?.merged_pdf?.file_id || null;
      const fileName = data?.merged_pdf?.name || null;
      setMergedPdfFileId(fileId);
      setMergedPdfName(fileName);
      sendAlert({
        type: "success",
        message: fileName
          ? `Corporate book created in Box: ${fileName}`
          : "Corporate book generated.",
      });

      if (typeof refreshObjectProperties === "function") {
        try {
          refreshObjectProperties();
        } catch {
          /* noop */
        }
      }
    } catch (err) {
      const timedOut = err?.message === "__request_timeout__";
      const message = timedOut
        ? "Corporate book generation timed out. It may still be running on the server — refresh in a moment to check."
        : err?.message || "Corporate book generation failed.";
      setErrorMessage(message);
      sendAlert({ type: "danger", message });
    } finally {
      if (timer) clearTimeout(timer);
      setSubmitting(false);
    }
  };

  return (
    <Flex direction="column" gap="sm">
      <Text variant="heading-sm">Corporate Book</Text>

      {!ticketId && (
        <Alert variant="error">
          This card can only run on a ticket record.
        </Alert>
      )}

      <Button variant="primary" disabled={!canSubmit} onClick={handleClick}>
        {submitting ? "Generating…" : "Generate Corporate Books"}
      </Button>

      {mergedPdfFileId && (
        <>
          <Divider />
          <Link
            href={`https://app.box.com/file/${mergedPdfFileId}`}
            target="_blank"
          >
            {mergedPdfName
              ? `Open ${mergedPdfName} in Box`
              : "Open merged PDF in Box"}
          </Link>
        </>
      )}

      {errorMessage && !submitting && (
        <Alert variant="error">{errorMessage}</Alert>
      )}
    </Flex>
  );
}
