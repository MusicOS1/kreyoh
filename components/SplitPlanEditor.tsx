"use client";
import { useActionState, useState } from "react";
import { updateSplitPlan, type SplitActionState } from "../app/splits/actions";

type Row = { contributor_id: string; contribution_role: string; percentage: string };
type Member = { id: string; name: string };
type Context = { projectId: string; trackId: string; version: number };
function ContextFields({ projectId, trackId, version }: Context) {
  return <><input type="hidden" name="project_id" value={projectId}/><input type="hidden" name="track_id" value={trackId}/><input type="hidden" name="version" value={version}/></>;
}
function Feedback({ state }: { state: SplitActionState }) {
  return <>{state.error && <p role="alert" className="form-error-alert">{state.error}</p>}{state.success && <p role="status" className="form-success-alert">{state.success}</p>}</>;
}
export function SplitAction({ context, operation, splitId, label, disabled = false }: { context: Context; operation: "send" | "confirm" | "request_change"; splitId?: string; label: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(updateSplitPlan, {});
  return <form action={action} className="split-response-form"><ContextFields {...context}/><input type="hidden" name="operation" value={operation}/><input type="hidden" name="split_id" value={splitId || ""}/>
    {operation === "request_change" && <label>What needs to change?<textarea name="reason" required maxLength={2000} placeholder="Explain the percentage or role that needs correcting."/></label>}
    <button disabled={disabled || pending}>{pending ? "Saving…" : label}</button><Feedback state={state}/>
  </form>;
}
export default function SplitPlanEditor({ context, members, initialRows, status }: { context: Context; members: Member[]; initialRows: Row[]; status: string }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [state, action, pending] = useActionState(updateSplitPlan, {});
  const total = rows.reduce((sum, row) => sum + Math.round(Number(row.percentage || 0) * 100), 0) / 100;
  const dirty = JSON.stringify(rows) !== JSON.stringify(initialRows);
  const update = (index: number, key: keyof Row, value: string) => setRows(current => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  return <><form action={action} className="split-editor"><ContextFields {...context}/><input type="hidden" name="operation" value="save"/><input type="hidden" name="rows" value={JSON.stringify(rows)}/>
    <p>Edit the complete proposal below. Saving a revision resets all approvals. Send it again once the total is 100%.</p>
    <div className="split-editor-rows">{rows.map((row, index) => <div className="split-editor-row" key={index}>
      <label>Contributor<select required value={row.contributor_id} onChange={e => update(index, "contributor_id", e.target.value)} disabled={pending}><option value="">Choose contributor</option>{!members.some(m => m.id === row.contributor_id) && row.contributor_id && <option value={row.contributor_id}>Inactive contributor — replace or remove</option>}{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label>Role<input required maxLength={100} value={row.contribution_role} onChange={e => update(index,"contribution_role",e.target.value)} placeholder="Writer, producer…" disabled={pending}/></label>
      <label>Share %<input type="number" min="0" max="100" step="0.01" required value={row.percentage} onChange={e => update(index,"percentage",e.target.value)} disabled={pending}/></label>
      <button type="button" onClick={() => setRows(current => current.filter((_, i) => i !== index))} disabled={pending} aria-label={`Remove allocation ${index + 1}`}>Remove</button>
    </div>)}</div>
    <div className="split-editor-footer"><button type="button" disabled={pending || rows.length >= 100} onClick={() => setRows(current => [...current,{contributor_id:"",contribution_role:"",percentage:""}])}>+ Add contributor</button><strong role="status">Total: {total.toFixed(2)}%{total < 100 ? ` · ${(100-total).toFixed(2)}% remaining` : total > 100 ? " · Over 100%" : " · Fully allocated"}</strong><button disabled={pending || !Number.isFinite(total) || total > 100}>{pending ? "Saving…" : "Save draft"}</button></div><Feedback state={state}/>
  </form>
  {dirty && <p role="status">You have unsaved changes. Save the draft before sending it.</p>}
  <SplitAction context={context} operation="send" label={status === "draft" ? "Send saved 100% proposal for review" : "Proposal already sent"} disabled={dirty || pending || status !== "draft" || total !== 100 || !rows.length}/></>;
}
