import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Accept either raw base64 or a data URL and return raw base64.
function stripDataUrl(s: string): string {
  const m = s.match(/^data:[^;]+;base64,(.+)$/);
  return m ? m[1] : s;
}

export default defineTool({
  name: "upload_assignment",
  title: "Upload assignment",
  description:
    "Create an assignment for a chosen course, branch, subject, and deadline, and attach a file. The signed-in user must be faculty or admin. The file is uploaded to the private `assignments` storage bucket.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Assignment title."),
    subject_code: z
      .string()
      .trim()
      .min(1)
      .describe("Canonical subject code from the subjects table, e.g. `KCS-601`."),
    course: z.string().trim().min(1).max(100).describe("Course, e.g. `B.Tech`."),
    branch: z.string().trim().min(1).max(100).describe("Branch, e.g. `CSE`."),
    deadline: z
      .string()
      .datetime({ offset: true })
      .describe("Deadline as an ISO 8601 timestamp with timezone."),
    description: z.string().trim().max(4000).optional().describe("Optional description."),
    file_name: z.string().trim().min(1).max(200).describe("Original file name including extension."),
    file_base64: z
      .string()
      .min(1)
      .describe("File contents as base64, either raw or a `data:<mime>;base64,...` URL."),
    file_mime: z
      .string()
      .trim()
      .optional()
      .describe("Optional MIME type (e.g. `application/pdf`). Defaults to `application/octet-stream`."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();

    // Decode base64 (Deno has global atob).
    let bytes: Uint8Array;
    try {
      const raw = stripDataUrl(input.file_base64);
      const bin = atob(raw);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return { content: [{ type: "text", text: "file_base64 is not valid base64" }], isError: true };
    }

    const safeName = input.file_name.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${uid}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("assignments")
      .upload(path, bytes, {
        contentType: input.file_mime || "application/octet-stream",
        upsert: false,
      });
    if (upErr) {
      return { content: [{ type: "text", text: `Upload failed: ${upErr.message}` }], isError: true };
    }

    const contextLine = `Course: ${input.course} | Branch: ${input.branch}`;
    const fullDescription = input.description
      ? `${contextLine}\n\n${input.description}`
      : contextLine;

    const { data: row, error: insErr } = await supabase
      .from("assignments")
      .insert({
        title: input.title,
        description: fullDescription,
        subject_code: input.subject_code,
        deadline: input.deadline,
        file_url: path,
        created_by: uid,
      })
      .select()
      .single();

    if (insErr) {
      // Best-effort cleanup of the uploaded object if the DB insert fails.
      await supabase.storage.from("assignments").remove([path]);
      return { content: [{ type: "text", text: `Insert failed: ${insErr.message}` }], isError: true };
    }

    const payload = { assignment: row, storage_path: path };
    return {
      content: [
        {
          type: "text",
          text: `Assignment "${row.title}" created for ${input.subject_code} (${input.course} / ${input.branch}), due ${input.deadline}.`,
        },
      ],
      structuredContent: payload,
    };
  },
});
