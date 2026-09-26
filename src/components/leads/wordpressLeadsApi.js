// Thin wrappers around the /api WordPress lead endpoints.

export async function fetchWordPressLeads() {
  const resp = await fetch("/api/fetch-wp-leads");
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `WordPress sync failed (${resp.status})`);
  }
  return data.leads || [];
}

// Deletes the lead's WordPress copy. Resolves true when WordPress no longer
// has the lead (deleted now, already gone, or never synced there) and false
// when the delete failed — callers should keep the local lead in that case.
export async function deleteWordPressLead(lead) {
  if (!lead?.email && !lead?.wpLeadId) {
    console.warn("[WP sync] skipped — lead has no email or wpLeadId", lead);
    return true;
  }
  try {
    const resp = await fetch("/api/delete-wp-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: lead.email || undefined,
        wpLeadId: lead.wpLeadId || undefined,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      if (resp.status === 404) {
        console.warn("[WP sync] lead already deleted", data);
        return true;
      }
      console.error("[WP sync] failed", resp.status, data);
      alert(
        `WordPress sync failed (${resp.status}): ${data?.error || JSON.stringify(data)}`,
      );
      return false;
    }
    console.log("[WP sync] success", data);
    return true;
  } catch (err) {
    console.error("[WP sync] network error", err);
    alert(`WordPress sync network error: ${err.message}`);
    return false;
  }
}
