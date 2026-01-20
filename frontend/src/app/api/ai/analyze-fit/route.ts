import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";

export const runtime = "nodejs";

interface ProjectRequirements {
  proposedUse: string;
  targetSF: number | null;
  heightNeeded: number | null;
  stories: number | null;
  parkingStalls: number | null;
  timeline: string | null;
  additionalNotes: string;
}

interface ZoningRules {
  zone_code: string;
  zone_name?: string;
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

interface AnalysisItem {
  category: string;
  status: "ok" | "conditional" | "conflict";
  requirement: string;
  zoningAllows: string;
  explanation: string;
  citation: string;
}

interface Risk {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  mitigation?: string;
}

// Rule-based analysis without AI
function analyzeWithRules(
  requirements: ProjectRequirements,
  rules: ZoningRules | null,
  zoneCode: string,
  city: string
): { verdict: string; verdictSummary: string; analysis: AnalysisItem[]; risks: Risk[]; recommendations: string[] } {
  const analysis: AnalysisItem[] = [];
  const risks: Risk[] = [];
  const recommendations: string[] = [];
  let hasBlocker = false;
  let hasConditional = false;

  // Analyze use type
  const useNorm = requirements.proposedUse.toLowerCase();
  if (rules) {
    const permitted = rules.permitted_uses?.map(u => u.toLowerCase()) || [];
    const conditional = rules.conditional_uses?.map(u => u.toLowerCase()) || [];
    const prohibited = rules.prohibited_uses?.map(u => u.toLowerCase()) || [];

    const isPermitted = permitted.some(u => u.includes(useNorm) || useNorm.includes(u));
    const isConditional = conditional.some(u => u.includes(useNorm) || useNorm.includes(u));
    const isProhibited = prohibited.some(u => u.includes(useNorm) || useNorm.includes(u));

    if (isProhibited) {
      hasBlocker = true;
      analysis.push({
        category: "use",
        status: "conflict",
        requirement: requirements.proposedUse,
        zoningAllows: "Prohibited",
        explanation: `${requirements.proposedUse} is listed as a prohibited use in ${zoneCode}. This would require a zone change or variance.`,
        citation: `${city.charAt(0).toUpperCase() + city.slice(1)} Municipal Code - ${zoneCode} Prohibited Uses`,
      });
    } else if (isConditional) {
      hasConditional = true;
      analysis.push({
        category: "use",
        status: "conditional",
        requirement: requirements.proposedUse,
        zoningAllows: "Conditional Use Permit",
        explanation: `${requirements.proposedUse} requires a Conditional Use Permit (CUP) in ${zoneCode}. This is a discretionary approval.`,
        citation: `${city.charAt(0).toUpperCase() + city.slice(1)} Municipal Code - ${zoneCode} Conditional Uses`,
      });
      risks.push({
        severity: "medium",
        title: "Conditional Use Permit Required",
        description: `${requirements.proposedUse} use requires CUP approval`,
        impact: "+4-12 weeks for hearing and approval process",
        mitigation: "Pre-application meeting with planning department recommended",
      });
    } else if (isPermitted) {
      analysis.push({
        category: "use",
        status: "ok",
        requirement: requirements.proposedUse,
        zoningAllows: "Permitted",
        explanation: `${requirements.proposedUse} is listed as a permitted use in ${zoneCode}. No special approval needed for use type.`,
        citation: `${city.charAt(0).toUpperCase() + city.slice(1)} Municipal Code - ${zoneCode} Permitted Uses`,
      });
    } else {
      analysis.push({
        category: "use",
        status: "conditional",
        requirement: requirements.proposedUse,
        zoningAllows: "Not explicitly listed",
        explanation: `${requirements.proposedUse} is not explicitly listed in the zoning rules. Verify with planning department.`,
        citation: `Recommend verifying with ${city.charAt(0).toUpperCase() + city.slice(1)} Planning`,
      });
      recommendations.push("Confirm use classification with planning department before proceeding");
    }

    // Analyze height
    if (requirements.heightNeeded) {
      if (rules.max_height_ft) {
        if (requirements.heightNeeded > rules.max_height_ft) {
          hasBlocker = true;
          analysis.push({
            category: "height",
            status: "conflict",
            requirement: `${requirements.heightNeeded} ft`,
            zoningAllows: `${rules.max_height_ft} ft max`,
            explanation: `Proposed height exceeds the maximum by ${requirements.heightNeeded - rules.max_height_ft} ft. Would require height variance or bonus.`,
            citation: `${zoneCode} Height Limit: ${rules.max_height_ft} ft`,
          });
          recommendations.push("Explore height bonus programs or reduce building height");
        } else if (requirements.heightNeeded > rules.max_height_ft * 0.9) {
          analysis.push({
            category: "height",
            status: "conditional",
            requirement: `${requirements.heightNeeded} ft`,
            zoningAllows: `${rules.max_height_ft} ft max`,
            explanation: `Height is within limits but close to maximum. May trigger additional review thresholds.`,
            citation: `${zoneCode} Height Limit: ${rules.max_height_ft} ft`,
          });
        } else {
          analysis.push({
            category: "height",
            status: "ok",
            requirement: `${requirements.heightNeeded} ft`,
            zoningAllows: `${rules.max_height_ft} ft max`,
            explanation: `Proposed height is comfortably within the zone's height limit.`,
            citation: `${zoneCode} Height Limit: ${rules.max_height_ft} ft`,
          });
        }
      }
    }

    // Add FAR analysis if available
    if (rules.far) {
      analysis.push({
        category: "far",
        status: "ok",
        requirement: requirements.targetSF ? `~${requirements.targetSF.toLocaleString()} SF requested` : "TBD",
        zoningAllows: `FAR ${rules.far}`,
        explanation: `Maximum FAR of ${rules.far}. Verify against actual lot area to confirm buildable SF.`,
        citation: `${zoneCode} FAR: ${rules.far}`,
      });
      recommendations.push("Calculate actual buildable SF based on lot area × FAR");
    }

    // Add setback analysis if available
    if (rules.setback_front_ft !== null || rules.setback_side_ft !== null) {
      analysis.push({
        category: "setbacks",
        status: "ok",
        requirement: "Per design",
        zoningAllows: `Front: ${rules.setback_front_ft ?? "TBD"}', Side: ${rules.setback_side_ft ?? "TBD"}', Rear: ${rules.setback_rear_ft ?? "TBD"}'`,
        explanation: "Verify building envelope accommodates required setbacks.",
        citation: `${zoneCode} Setback Requirements`,
      });
    }

    // Add overlay risks
    if (rules.overlays && rules.overlays.length > 0) {
      rules.overlays.forEach(overlay => {
        if (overlay.toLowerCase().includes("design") || overlay.toLowerCase().includes("historic")) {
          risks.push({
            severity: "medium",
            title: "Design Review Required",
            description: `${overlay} overlay applies to this site`,
            impact: "+6-12 weeks for design review process",
            mitigation: "Early engagement with design review board",
          });
        }
      });
    }

    // Add red flag risks
    if (rules.red_flags && rules.red_flags.length > 0) {
      rules.red_flags.forEach(flag => {
        risks.push({
          severity: "medium",
          title: flag,
          description: "Zoning red flag identified for this zone",
          impact: "May affect project approval or timeline",
        });
      });
    }

  } else {
    // No rules found - generic analysis
    analysis.push({
      category: "use",
      status: "conditional",
      requirement: requirements.proposedUse,
      zoningAllows: "Unknown",
      explanation: `Detailed zoning rules not available for ${zoneCode}. Verify with planning department.`,
      citation: "Contact local planning department",
    });
    recommendations.push(`Contact ${city.charAt(0).toUpperCase() + city.slice(1)} Planning Department to verify zoning requirements`);
  }

  // Height-based SEPA trigger (Seattle specific)
  if (city.toLowerCase() === "seattle" && requirements.heightNeeded && requirements.heightNeeded >= 65) {
    risks.push({
      severity: "medium",
      title: "SEPA Threshold",
      description: "Projects at 65+ ft may trigger SEPA environmental review in Seattle",
      impact: "+4-8 weeks for environmental review",
      mitigation: "Early SEPA checklist submission",
    });
  }

  // Determine verdict
  let verdict: string;
  let verdictSummary: string;

  if (hasBlocker) {
    verdict = "conflicts";
    verdictSummary = "Project has zoning conflicts requiring variance, redesign, or zone change";
  } else if (hasConditional) {
    verdict = "conditional";
    verdictSummary = `Project can proceed with approvals. ${risks.length} schedule risk${risks.length !== 1 ? "s" : ""} identified.`;
  } else {
    verdict = "fits";
    verdictSummary = `Project fits zoning requirements. ${risks.length} schedule risk${risks.length !== 1 ? "s" : ""} to track.`;
  }

  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push("Schedule pre-application meeting with planning department");
    recommendations.push("Obtain formal zoning verification letter before design development");
  }

  return { verdict, verdictSummary, analysis, risks, recommendations };
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

    // Get zoning data from database
    const pool = getPool();
    
    if (!pool) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    
    // Find the zoning district for this location
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
        { error: "No zoning district found for this location. The address may be outside our coverage area." },
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

    const rules: ZoningRules | null = rulesResult.rows[0] || null;

    // Build context for AI analysis
    const zoningContext = buildZoningContext(district, rules);

    let analysis;
    let mode = "rules";

    // Try AI analysis if available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = require("@anthropic-ai/sdk").default;
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

        const responseText = message.content[0].type === "text" ? message.content[0].text : "";
        
        let jsonText = responseText.trim();
        if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
        if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);

        analysis = JSON.parse(jsonText.trim());
        mode = "ai";
      } catch (aiError) {
        console.error("AI analysis failed, falling back to rules:", aiError);
        analysis = analyzeWithRules(requirements, rules, district.zone_code, district.city);
      }
    } else {
      // Use rule-based analysis
      analysis = analyzeWithRules(requirements, rules, district.zone_code, district.city);
    }

    return NextResponse.json({
      success: true,
      address,
      zoning: {
        zone_code: district.zone_code,
        zone_name: district.zone_name || rules?.zone_name || district.zone_code,
        city: district.city,
        max_height_ft: rules?.max_height_ft ?? null,
        max_height_stories: rules?.max_height_stories ?? null,
        far: rules?.far ?? null,
        lot_coverage_pct: rules?.lot_coverage_pct ?? null,
        setback_front_ft: rules?.setback_front_ft ?? null,
        setback_side_ft: rules?.setback_side_ft ?? null,
        setback_rear_ft: rules?.setback_rear_ft ?? null,
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
      mode,
    });
  } catch (error) {
    console.error("Fit analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze project fit" },
      { status: 500 }
    );
  }
}

function buildZoningContext(district: Record<string, unknown>, rules: ZoningRules | null): string {
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
