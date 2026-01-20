import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ProjectRequirements {
  proposedUse: string;
  targetSF: number | null;
  heightNeeded: number | null;
  stories: number | null;
  parkingStalls: number | null;
  timeline: string | null;
  additionalNotes: string;
}

interface ZoningData {
  zone_code: string;
  zone_name: string;
  city: string;
  max_height_ft: number | null;
  max_height_stories: number | null;
  far: number | null;
  lot_coverage_pct: number | null;
  setback_front_ft: number | null;
  setback_side_ft: number | null;
  setback_rear_ft: number | null;
  permitted_uses: string[];
  conditional_uses: string[];
  prohibited_uses: string[];
  overlays: string[];
  red_flags: string[];
  parking_rules: Record<string, unknown>;
  source_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirements, latitude, longitude, address } = body as {
      requirements: ProjectRequirements;
      latitude: number;
      longitude: number;
      address: string;
    };

    // 1. Get zoning data from database
    const pool = getPool();
    
    if (!pool) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    
    // First, find the zoning district for this location
    const districtResult = await pool.query(`
      SELECT 
        zd.zone_code,
        zd.zone_name,
        zd.city,
        zd.properties
      FROM zoning_districts zd
      WHERE ST_Contains(zd.geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1
    `, [longitude, latitude]);

    if (districtResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No zoning district found for this location" },
        { status: 404 }
      );
    }

    const district = districtResult.rows[0];

    // Get the zoning rules for this zone
    const rulesResult = await pool.query(`
      SELECT 
        zone_code,
        max_height_ft,
        max_height_stories,
        far,
        lot_coverage_pct,
        setback_front_ft,
        setback_side_ft,
        setback_rear_ft,
        permitted_uses,
        conditional_uses,
        prohibited_uses,
        overlays,
        red_flags,
        parking_rules,
        source_url
      FROM zoning_rules
      WHERE city = $1 AND UPPER(zone_code) = UPPER($2)
      LIMIT 1
    `, [district.city, district.zone_code]);

    const rules = rulesResult.rows[0] || null;

    // 2. Build context for Claude with all zoning data
    const zoningContext = buildZoningContext(district, rules);

    // 3. Use Claude to analyze fit with citations
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are an expert architect and zoning consultant. Analyze whether this project fits the site's zoning constraints.

## PROJECT REQUIREMENTS
- Address: ${address}
- Proposed Use: ${requirements.proposedUse}
- Target Square Footage: ${requirements.targetSF ? `${requirements.targetSF.toLocaleString()} SF` : "Not specified"}
- Height Needed: ${requirements.heightNeeded ? `${requirements.heightNeeded} ft` : "Not specified"}
- Stories: ${requirements.stories || "Not specified"}
- Parking Required: ${requirements.parkingStalls ? `${requirements.parkingStalls} stalls` : "Not specified"}
- Timeline: ${requirements.timeline || "Not specified"}
- Additional Notes: ${requirements.additionalNotes || "None"}

## ZONING DATA FOR THIS SITE
${zoningContext}

## YOUR TASK
Analyze the project fit and return a JSON response with:

1. **verdict**: "fits" | "conditional" | "conflicts"
   - "fits" = Primary use is permitted and dimensional requirements are met
   - "conditional" = Use requires conditional approval OR close to limits
   - "conflicts" = Use is prohibited OR dimensional requirements exceed limits

2. **verdictSummary**: One-line summary of the verdict

3. **analysis**: Array of analysis items, each with:
   - category: "use" | "height" | "far" | "parking" | "setbacks" | "overlay" | "other"
   - status: "ok" | "conditional" | "conflict"
   - requirement: What the project needs
   - zoningAllows: What zoning permits
   - explanation: Detailed explanation with specific code references
   - citation: The specific zoning rule or code section being referenced

4. **risks**: Array of schedule/approval risks:
   - severity: "high" | "medium" | "low"
   - title: Short title
   - description: What the risk is
   - impact: Estimated impact on timeline or cost
   - mitigation: Possible mitigation strategies

5. **recommendations**: Array of actionable recommendations for the architect

Return ONLY valid JSON, no markdown formatting.`
        }
      ]
    });

    // Parse Claude's response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    
    // Clean up potential markdown formatting
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }

    const analysis = JSON.parse(jsonText.trim());

    return NextResponse.json({
      success: true,
      address,
      zoning: {
        zone_code: district.zone_code,
        zone_name: district.zone_name || rules?.zone_name || district.zone_code,
        city: district.city,
        max_height_ft: rules?.max_height_ft,
        max_height_stories: rules?.max_height_stories,
        far: rules?.far,
        lot_coverage_pct: rules?.lot_coverage_pct,
        setback_front_ft: rules?.setback_front_ft,
        setback_side_ft: rules?.setback_side_ft,
        setback_rear_ft: rules?.setback_rear_ft,
        permitted_uses: rules?.permitted_uses || [],
        conditional_uses: rules?.conditional_uses || [],
        prohibited_uses: rules?.prohibited_uses || [],
        overlays: rules?.overlays || [],
        red_flags: rules?.red_flags || [],
        parking_rules: rules?.parking_rules || {},
        source_url: rules?.source_url || "",
      },
      requirements,
      analysis,
    });
  } catch (error) {
    console.error("Fit analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze project fit" },
      { status: 500 }
    );
  }
}

function buildZoningContext(district: Record<string, unknown>, rules: ZoningData | null): string {
  const lines: string[] = [];

  lines.push(`Zone Code: ${district.zone_code}`);
  lines.push(`Zone Name: ${district.zone_name || rules?.zone_name || "Unknown"}`);
  lines.push(`City: ${district.city}`);
  lines.push("");

  if (rules) {
    lines.push("### Dimensional Limits");
    if (rules.max_height_ft) lines.push(`- Maximum Height: ${rules.max_height_ft} feet`);
    if (rules.max_height_stories) lines.push(`- Maximum Stories: ${rules.max_height_stories}`);
    if (rules.far) lines.push(`- Floor Area Ratio (FAR): ${rules.far}`);
    if (rules.lot_coverage_pct) lines.push(`- Maximum Lot Coverage: ${rules.lot_coverage_pct}%`);
    
    lines.push("");
    lines.push("### Setbacks");
    if (rules.setback_front_ft !== null) lines.push(`- Front Setback: ${rules.setback_front_ft} feet`);
    if (rules.setback_side_ft !== null) lines.push(`- Side Setback: ${rules.setback_side_ft} feet`);
    if (rules.setback_rear_ft !== null) lines.push(`- Rear Setback: ${rules.setback_rear_ft} feet`);

    lines.push("");
    lines.push("### Permitted Uses (allowed by right)");
    if (rules.permitted_uses && rules.permitted_uses.length > 0) {
      rules.permitted_uses.forEach(use => lines.push(`- ${use}`));
    } else {
      lines.push("- No data available");
    }

    lines.push("");
    lines.push("### Conditional Uses (requires discretionary approval)");
    if (rules.conditional_uses && rules.conditional_uses.length > 0) {
      rules.conditional_uses.forEach(use => lines.push(`- ${use}`));
    } else {
      lines.push("- None specified");
    }

    lines.push("");
    lines.push("### Prohibited Uses");
    if (rules.prohibited_uses && rules.prohibited_uses.length > 0) {
      rules.prohibited_uses.forEach(use => lines.push(`- ${use}`));
    } else {
      lines.push("- None specified");
    }

    if (rules.overlays && rules.overlays.length > 0) {
      lines.push("");
      lines.push("### Overlay Districts / Special Requirements");
      rules.overlays.forEach(overlay => lines.push(`- ${overlay}`));
    }

    if (rules.red_flags && rules.red_flags.length > 0) {
      lines.push("");
      lines.push("### Known Red Flags / Triggers");
      rules.red_flags.forEach(flag => lines.push(`- ${flag}`));
    }

    if (rules.parking_rules && Object.keys(rules.parking_rules).length > 0) {
      lines.push("");
      lines.push("### Parking Requirements");
      const parkingInfo = rules.parking_rules as { summary?: string };
      if (parkingInfo.summary) {
        lines.push(parkingInfo.summary);
      } else {
        lines.push(JSON.stringify(rules.parking_rules));
      }
    }

    if (rules.source_url) {
      lines.push("");
      lines.push(`### Source: ${rules.source_url}`);
    }
  } else {
    lines.push("");
    lines.push("### Note: Detailed zoning rules not available for this zone code.");
    lines.push("Analysis will be based on general zoning principles for this zone type.");
  }

  return lines.join("\n");
}
