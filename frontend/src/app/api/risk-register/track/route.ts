import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

const BodySchema = z.object({
  artifact_id: z.string().uuid(),
  risk_item_ids: z.array(z.string().min(1)).default([]),
  email: z.string().email()
});

/**
 * POST /api/risk-register/track
 * 
 * Creates a Part3 project handoff record and prepares risk items for sync.
 * In production, this would call the Part3 CA API to create a real project.
 * Currently stores locally and returns a project ID for future integration.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body", 400, parsed.error.flatten());

  const { artifact_id, risk_item_ids, email } = parsed.data;
  const pool = getPool();

  if (!pool) {
    // Fallback to stub mode when DB not configured
    return jsonOk({ 
      part3_project_id: crypto.randomUUID(),
      status: "stub_mode",
      message: "Database not configured - returned stub project ID"
    });
  }

  try {
    // 1. Get the artifact to verify it exists and get metadata
    const artifactResult = await pool.query(
      `SELECT id, type, city, input_params, output_data FROM artifacts WHERE id = $1`,
      [artifact_id]
    );

    if (artifactResult.rows.length === 0) {
      return jsonError("Artifact not found", 404);
    }

    const artifact = artifactResult.rows[0];
    const inputParams = artifact.input_params as Record<string, unknown>;
    const address = inputParams?.address ?? "Unknown address";
    const projectName = `Part3 Project - ${artifact.city} - ${address}`;

    // 2. Update artifact with user email
    await pool.query(
      `UPDATE artifacts SET user_email = $1 WHERE id = $2`,
      [email, artifact_id]
    );

    // 3. Create Part3 project record
    const projectResult = await pool.query(
      `INSERT INTO part3_projects (artifact_id, user_email, city, project_name, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [artifact_id, email, artifact.city, projectName]
    );

    const part3ProjectId = projectResult.rows[0].id;

    // 4. If risk_item_ids provided, update those items with a generated part3_item_id
    if (risk_item_ids.length > 0) {
      for (const riskItemId of risk_item_ids) {
        const part3ItemId = crypto.randomUUID();
        await pool.query(
          `UPDATE risk_items SET part3_item_id = $1 
           WHERE artifact_id = $2 AND risk_id = $3 AND part3_item_id IS NULL`,
          [part3ItemId, artifact_id, riskItemId]
        );
      }
    } else {
      // Update all risk items for this artifact that don't have a part3_item_id
      await pool.query(
        `UPDATE risk_items SET part3_item_id = gen_random_uuid() 
         WHERE artifact_id = $1 AND part3_item_id IS NULL`,
        [artifact_id]
      );
    }

    // 5. Count how many items were prepared for sync
    const itemCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM risk_items WHERE artifact_id = $1 AND part3_item_id IS NOT NULL`,
      [artifact_id]
    );
    const itemCount = parseInt(itemCountResult.rows[0].count, 10);

    // In production, this is where we would call the Part3 API:
    // const part3Response = await callPart3Api({
    //   projectName,
    //   email,
    //   items: riskItems,
    //   sourceArtifactId: artifact_id
    // });
    // Then update: UPDATE part3_projects SET part3_external_id = $1, status = 'synced', synced_at = NOW() WHERE id = $2

    return jsonOk({
      part3_project_id: part3ProjectId,
      status: "pending",
      items_prepared: itemCount,
      project_name: projectName,
      message: "Project created. In production, this would sync to Part3 CA system."
    });

  } catch (err: any) {
    console.error("Error creating Part3 project:", err);
    return jsonError(err?.message ?? "Failed to create Part3 project", 500);
  }
}
