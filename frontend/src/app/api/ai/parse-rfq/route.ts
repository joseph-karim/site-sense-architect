import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface ExtractedRequirements {
  projectName: string | null;
  proposedUse: string;
  targetSF: number | null;
  heightNeeded: number | null;
  stories: number | null;
  parkingStalls: number | null;
  timeline: string | null;
  lotSize: number | null;
  sustainabilityTargets: string[];
  specialRequirements: string[];
  confidence: {
    proposedUse: "high" | "medium" | "low";
    targetSF: "high" | "medium" | "low";
    heightNeeded: "high" | "medium" | "low";
  };
  rawExtracts: {
    field: string;
    value: string;
    sourceText: string;
  }[];
}

// Mock extraction using simple regex patterns
function mockExtractRequirements(text: string): ExtractedRequirements {
  const rawExtracts: { field: string; value: string; sourceText: string }[] = [];

  // Extract square footage
  const sfMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:SF|sq\.?\s*ft|square feet|gsf|gross square feet)/i);
  const targetSF = sfMatch ? parseInt(sfMatch[1].replace(/,/g, "")) : null;
  if (sfMatch) {
    rawExtracts.push({
      field: "targetSF",
      value: sfMatch[1],
      sourceText: sfMatch[0].slice(0, 100),
    });
  }

  // Extract height
  const heightMatch = text.match(/(\d+)\s*(?:ft|feet|foot|')\s*(?:height|tall|high|maximum height)/i) ||
                      text.match(/(?:height|tall|high)(?:\s+of)?\s+(\d+)\s*(?:ft|feet|foot|')?/i);
  const heightNeeded = heightMatch ? parseInt(heightMatch[1]) : null;
  if (heightMatch) {
    rawExtracts.push({
      field: "heightNeeded",
      value: heightMatch[1] + " ft",
      sourceText: heightMatch[0].slice(0, 100),
    });
  }

  // Extract stories
  const storiesMatch = text.match(/(\d+)\s*(?:stories|story|floors|floor|levels|level)/i);
  const stories = storiesMatch ? parseInt(storiesMatch[1]) : null;
  if (storiesMatch) {
    rawExtracts.push({
      field: "stories",
      value: storiesMatch[1],
      sourceText: storiesMatch[0].slice(0, 100),
    });
  }

  // Extract parking
  const parkingMatch = text.match(/(\d+)\s*(?:parking|stalls|spaces|car\s*parks)/i);
  const parkingStalls = parkingMatch ? parseInt(parkingMatch[1]) : null;
  if (parkingMatch) {
    rawExtracts.push({
      field: "parkingStalls",
      value: parkingMatch[1],
      sourceText: parkingMatch[0].slice(0, 100),
    });
  }

  // Detect use type
  const textLower = text.toLowerCase();
  let proposedUse = "";
  if (textLower.includes("office") && !textLower.includes("post office")) {
    proposedUse = "office";
    rawExtracts.push({ field: "proposedUse", value: "office", sourceText: "...office..." });
  } else if (textLower.includes("retail") || textLower.includes("store") || textLower.includes("shop")) {
    proposedUse = "retail";
    rawExtracts.push({ field: "proposedUse", value: "retail", sourceText: "...retail..." });
  } else if (textLower.includes("mixed use") || textLower.includes("mixed-use")) {
    proposedUse = "mixed-use";
    rawExtracts.push({ field: "proposedUse", value: "mixed-use", sourceText: "...mixed use..." });
  } else if (textLower.includes("medical") || textLower.includes("healthcare") || textLower.includes("clinic") || textLower.includes("hospital")) {
    proposedUse = "healthcare";
    rawExtracts.push({ field: "proposedUse", value: "healthcare", sourceText: "...medical/healthcare..." });
  } else if (textLower.includes("hotel") || textLower.includes("lodging")) {
    proposedUse = "hotel";
    rawExtracts.push({ field: "proposedUse", value: "hotel", sourceText: "...hotel..." });
  } else if (textLower.includes("education") || textLower.includes("school") || textLower.includes("university")) {
    proposedUse = "education";
    rawExtracts.push({ field: "proposedUse", value: "education", sourceText: "...education/school..." });
  } else if (textLower.includes("restaurant") || textLower.includes("food service") || textLower.includes("dining")) {
    proposedUse = "restaurant";
    rawExtracts.push({ field: "proposedUse", value: "restaurant", sourceText: "...restaurant..." });
  }

  // Extract project name (look for "Project:" or similar patterns)
  const nameMatch = text.match(/(?:project|building|development)(?:\s*name)?[:\s]+["']?([A-Z][A-Za-z0-9\s]+?)["']?(?:\n|,|\.)/i);
  const projectName = nameMatch ? nameMatch[1].trim() : null;
  if (nameMatch) {
    rawExtracts.push({
      field: "projectName",
      value: projectName || "",
      sourceText: nameMatch[0].slice(0, 100),
    });
  }

  // Extract timeline
  const timelineMatch = text.match(/(\d+)\s*(?:months?|years?)\s*(?:timeline|schedule|duration|from\s+permit)/i) ||
                        text.match(/(?:timeline|schedule|duration)[:\s]+(\d+\s*(?:months?|years?))/i);
  const timeline = timelineMatch ? timelineMatch[0] : null;
  if (timelineMatch) {
    rawExtracts.push({
      field: "timeline",
      value: timelineMatch[0],
      sourceText: timelineMatch[0].slice(0, 100),
    });
  }

  // Extract sustainability targets
  const sustainabilityTargets: string[] = [];
  if (textLower.includes("leed")) {
    const leedMatch = text.match(/leed\s*(gold|silver|platinum|certified)?/i);
    sustainabilityTargets.push(leedMatch ? `LEED ${leedMatch[1] || ""}`.trim() : "LEED");
  }
  if (textLower.includes("net zero") || textLower.includes("net-zero")) {
    sustainabilityTargets.push("Net Zero");
  }
  if (textLower.includes("energy star")) {
    sustainabilityTargets.push("Energy Star");
  }

  // Extract special requirements
  const specialRequirements: string[] = [];
  if (textLower.includes("ground floor retail") || textLower.includes("retail activation")) {
    specialRequirements.push("Ground floor retail activation");
  }
  if (textLower.includes("public space") || textLower.includes("plaza")) {
    specialRequirements.push("Public space / plaza");
  }
  if (textLower.includes("rooftop") || textLower.includes("roof deck")) {
    specialRequirements.push("Rooftop amenity");
  }

  return {
    projectName,
    proposedUse,
    targetSF,
    heightNeeded,
    stories,
    parkingStalls,
    timeline,
    lotSize: null,
    sustainabilityTargets,
    specialRequirements,
    confidence: {
      proposedUse: proposedUse ? "medium" : "low",
      targetSF: targetSF ? "high" : "low",
      heightNeeded: heightNeeded ? "high" : "low",
    },
    rawExtracts,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const textContent = formData.get("text") as string | null;

    let documentText = textContent || "";

    // If file uploaded, extract text
    if (file) {
      if (file.type === "text/plain") {
        documentText = await file.text();
      } else if (file.type === "application/pdf") {
        return NextResponse.json(
          { error: "PDF parsing requires additional setup. Please paste the RFQ text instead." },
          { status: 400 }
        );
      } else {
        documentText = await file.text();
      }
    }

    if (!documentText || documentText.trim().length < 50) {
      return NextResponse.json(
        { error: "Please provide RFQ content (at least 50 characters)" },
        { status: 400 }
      );
    }

    // Try to use Claude if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = require("@anthropic-ai/sdk").default;
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `You are an expert at reading architectural RFQs (Request for Qualifications) and project specifications. Extract the following information from this document.

DOCUMENT:
"""
${documentText.slice(0, 15000)}
"""

Extract and return a JSON object with these fields. For each field, also note the confidence level (high/medium/low) based on how explicitly it was stated vs inferred.

Required fields to extract:
- projectName: The name of the project (null if not found)
- proposedUse: Primary use type. Must be one of: office, retail, restaurant, mixed-use, healthcare, education, civic, hotel, warehouse, residential (pick the primary one)
- targetSF: Target gross square footage as a number (null if not stated)
- heightNeeded: Required or desired building height in feet (null if not stated)
- stories: Number of stories/floors (null if not stated)
- parkingStalls: Number of parking spaces required (null if not stated)
- timeline: Project timeline or schedule requirements (null if not stated)
- lotSize: Lot or site size in square feet or acres (null if not stated)
- sustainabilityTargets: Array of sustainability goals (LEED, net zero, etc.)
- specialRequirements: Array of other notable requirements

For each extracted value, include a "rawExtracts" array showing:
- field: which field this supports
- value: the extracted value
- sourceText: the exact quote from the document (max 100 chars)

Return ONLY valid JSON, no markdown or explanation.`
            }
          ]
        });

        const responseText = message.content[0].type === "text" ? message.content[0].text : "";
        
        let jsonText = responseText.trim();
        if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
        if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);

        const extracted: ExtractedRequirements = JSON.parse(jsonText.trim());

        return NextResponse.json({
          success: true,
          requirements: extracted,
          documentLength: documentText.length,
          mode: "ai",
        });
      } catch (aiError) {
        console.error("AI extraction failed, falling back to regex:", aiError);
        // Fall through to mock extraction
      }
    }

    // Fallback: Use regex-based extraction
    console.log("Using regex-based extraction (no ANTHROPIC_API_KEY or AI failed)");
    const extracted = mockExtractRequirements(documentText);

    return NextResponse.json({
      success: true,
      requirements: extracted,
      documentLength: documentText.length,
      mode: "regex",
    });
  } catch (error) {
    console.error("RFQ parsing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse RFQ" },
      { status: 500 }
    );
  }
}
