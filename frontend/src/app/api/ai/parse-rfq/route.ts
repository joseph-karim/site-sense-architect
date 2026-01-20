import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
        // For PDF, we'd use a PDF parser - for now, return error asking for text
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

    // Use Claude to extract requirements
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

    const extracted: ExtractedRequirements = JSON.parse(jsonText.trim());

    return NextResponse.json({
      success: true,
      requirements: extracted,
      documentLength: documentText.length,
    });
  } catch (error) {
    console.error("RFQ parsing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse RFQ" },
      { status: 500 }
    );
  }
}
