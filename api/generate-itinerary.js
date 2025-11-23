export default async function handler(req, res) {
  console.log("=== API Function Called ===");
  console.log("Method:", req.method);

  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("OPTIONS request received");
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get prompt from request body
    const { prompt } = req.body;

    if (!prompt) {
      console.log("No prompt provided");
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("Prompt received, length:", prompt.length);

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY not found in environment variables");
      console.error(
        "Available env vars:",
        Object.keys(process.env).filter((k) => k.includes("OPENAI"))
      );
      return res.status(500).json({
        error: "API key not configured",
        hint: "Please add OPENAI_API_KEY to your .env.local file",
      });
    }

    console.log(
      "✓ API Key found, starting with:",
      apiKey.substring(0, 15) + "..."
    );
    console.log("Making request to OpenAI API...");

    // Call OpenAI API
    const apiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are a professional travel planner who creates detailed, personalized travel itineraries.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      }
    );

    console.log("OpenAI API Response Status:", apiResponse.status);
    console.log("OpenAI API Response Status Text:", apiResponse.statusText);

    // Check if response is OK
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("❌ OpenAI API Error:", errorText);

      let errorMessage = `OpenAI API error: ${apiResponse.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }

      return res.status(apiResponse.status).json({
        error: errorMessage,
        status: apiResponse.status,
      });
    }

    // Get response text
    const responseText = await apiResponse.text();
    console.log("✓ Response received, length:", responseText.length);

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log("✓ Successfully parsed JSON response");
    } catch (parseError) {
      console.error("❌ Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      return res.status(500).json({
        error: "Failed to parse API response",
        details: responseText.substring(0, 200),
      });
    }

    // Verify response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("❌ Unexpected response structure:", data);
      return res.status(500).json({
        error: "Unexpected response format from OpenAI",
        data: data,
      });
    }

    console.log("✓ Returning successful response");
    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Unhandled Error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      error: error.message || "Internal server error",
      details: error.toString(),
    });
  }
}
