// Netlify Serverless Function for Sarvam Artha (Node.js runtime)
// Handles API routes seamlessly on Netlify without returning 404

const SARVAM_BASE_URL = "https://api.sarvam.ai";

exports.handler = async (event, context) => {
  const path = event.path.replace(/\/\.netlify\/functions\/api/, "").replace(/^\/api/, "");
  const method = event.httpMethod;

  const apiKey = process.env.SARVAM_API_KEY || "sk_wj0n1plo_eTZVpw3H2PcEU6KyDDMR5bHQ";

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, api-subscription-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 1. Health check
    if (path === "/health" || path === "/health/") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "healthy",
          sarvam_api_configured: Boolean(apiKey),
          app_name: "Sarvam Artha - Personal Finance Manager"
        })
      };
    }

    // Parse JSON body for POST requests
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        // May be raw string or already parsed
      }
    }

    // 2. Profile calculation (Pure deterministic financial math)
    if (path === "/profile/calculate" || path === "/profile/calculate/") {
      const income = Number(body.monthly_income) || 0;
      const mandatory = Number(body.mandatory_expenses) || 0;
      const discretionary = Number(body.discretionary_expenses) || 0;
      const debt = Number(body.monthly_debt_emi) || 0;
      const savings = Number(body.liquid_savings) || 0;

      const totalOutflow = mandatory + discretionary + debt;
      const surplus = income - totalOutflow;
      const savingsRate = income > 0 ? (surplus / income) * 100 : 0;
      const dti = income > 0 ? (debt / income) * 100 : 0;
      const runway = mandatory > 0 ? savings / mandatory : 0;

      const assetsList = body.assets || [];
      const liabList = body.liabilities || [];
      const totalAssets = assetsList.reduce((acc, a) => acc + (Number(a.value) || 0), 0);
      const totalLiab = liabList.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cashflow: {
            monthly_income: income,
            mandatory_expenses: mandatory,
            discretionary_expenses: discretionary,
            debt_obligations: debt,
            total_monthly_outflow: totalOutflow,
            net_monthly_surplus: surplus,
            savings_rate_pct: Math.round(savingsRate * 10) / 10,
            debt_to_income_pct: Math.round(dti * 10) / 10,
            liquid_runway_months: Math.round(runway * 10) / 10,
            has_surplus: surplus > 0
          },
          net_worth: {
            total_assets: totalAssets,
            total_liabilities: totalLiab,
            net_worth: totalAssets - totalLiab,
            asset_breakdown: {}
          },
          goals_evaluation: {
            total_required_monthly: 0
          }
        })
      };
    }

    // Verify API key before calling Sarvam
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "SARVAM_API_KEY environment variable is not set in Netlify site settings." })
      };
    }

    // 3. Strategy Formulation via Sarvam AI
    if (path === "/advisor/strategy" || path === "/advisor/strategy/") {
      const p = body.profile || {};
      const goalsText = (p.goals || []).map(g => `- ${g.title}: Target ₹${g.target_amount} in ${g.target_years} yrs`).join("\n") || "None specified.";

      const prompt = `Evaluate this user's financial profile from first principles:
- Age: ${p.age || 'Not specified'}
- Monthly In-Hand Income: ₹${p.monthly_income || 0}
- Mandatory Living Outflows: ₹${p.mandatory_expenses || 0}
- Discretionary Outflows: ₹${p.discretionary_expenses || 0}
- Debt / EMI Obligations: ₹${p.monthly_debt_emi || 0}
- Liquid Savings: ₹${p.liquid_savings || 0}
- Dependents: ${p.has_dependents ? 'Yes' : 'No'}
- Risk Profile: ${p.risk_profile || 'Moderate'}
- Stated Goals:
${goalsText}

Instructions:
1. Analyze their current financial health (cash flow balance, safety buffer, debt load).
2. Formulate a personalized financial plan or strategy uniquely suited to their context, providing clear reasoning for why this approach fits their numbers and goals.
3. Provide an actionable roadmap: Immediate Priorities (1–3 months), Medium-Term (1–3 years), and Long-Term execution.`;

      const sarvamRes = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey
        },
        body: JSON.stringify({
          model: "sarvam-105b-conversations",
          messages: [
            { role: "system", content: "You are a thoughtful, fiduciary personal finance strategist. Reason from first principles based on the individual's situation and explain why your recommendations fit them." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3
        })
      });

      const sData = await sarvamRes.json();
      const reply = sData.choices?.[0]?.message?.content || "Unable to formulate strategy.";
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ strategy: reply })
      };
    }

    // 4. Chat completions
    if (path === "/advisor/chat" || path === "/advisor/chat/") {
      const messages = (body.messages || []).map(m => ({ role: m.role || "user", content: m.content || "" }));
      const context = body.context ? `\n[User Profile Context]:\n${body.context}` : "";

      const systemMsg = {
        role: "system",
        content: `You are an intelligent, objective personal finance advisor. 
IMPORTANT LANGUAGE RULE: You MUST always detect and reply in the EXACT language the user writes or speaks in. 
- If the user asks in Marathi (मराठी), you MUST respond completely and naturally in Marathi.
- If the user asks in Bengali (বাংলা), you MUST respond completely and naturally in Bengali.
- If the user asks in Hindi (हिंदी), respond in Hindi.
- If the user asks in Gujarati, Tamil, Telugu, Kannada, Punjabi, Malayalam, Odia, or English, respond in that corresponding language.
Provide clear, reasoned advice.${context}`
      };

      const sarvamRes = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey
        },
        body: JSON.stringify({
          model: "sarvam-105b-conversations",
          messages: [systemMsg, ...messages],
          temperature: 0.3
        })
      });

      const sData = await sarvamRes.json();
      const replyText = sData.choices?.[0]?.message?.content || "I could not process the request.";

      let audioBase64 = null;
      // Only synthesize audio if the user used voice input
      if (body.enable_voice && replyText) {
        try {
          const speakerMap = {
            "mr-IN": "ishita_mr_conversational",
            "bn-IN": "roopa_bn_conversational",
            "hi-IN": "kavya_hi_conversational",
            "en-IN": "aditi_en_stories",
            "gu-IN": "pooja_gu_conversational",
            "kn-IN": "chaitra_kn_conversation",
            "pa-IN": "anand_pa_conversation",
            "ta-IN": "gokul_ta_narration",
            "te-IN": "kavitha_te_conversation"
          };
          const lang = body.voice_language || "en-IN";
          const chosenSpeaker = speakerMap[lang] || "aditi_en_stories";

          const ttsRes = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-subscription-key": apiKey
            },
            body: JSON.stringify({
              text: replyText.substring(0, 500),
              language_code: speakerMap[lang] ? lang : "en-IN",
              speaker: chosenSpeaker,
              model: "bulbul:v4-flash"
            })
          });
          const ttsData = await ttsRes.json();
          if (ttsData.audios && ttsData.audios.length > 0) {
            audioBase64 = ttsData.audios[0];
          }
        } catch (e) {
          console.warn("TTS warning:", e);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          reply: replyText,
          audio_base64: audioBase64,
          language_code: body.voice_language || "en-IN"
        })
      };
    }

    // 5. Audit Expenses
    if (path === "/advisor/audit-expenses" || path === "/advisor/audit-expenses/") {
      const expenses = body.expenses || [];
      const expSummary = expenses.map(e => `- ${e.category}: ₹${e.amount} (${e.description || ''})`).join("\n") || "No expenses logged.";

      const prompt = `Review these logged expenses for monthly income ₹${body.monthly_income || 0}:
${expSummary}

Evaluate spending patterns and suggest practical, realistic optimization ideas.`;

      const sarvamRes = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey
        },
        body: JSON.stringify({
          model: "sarvam-105b-conversations",
          messages: [
            { role: "system", content: "You are a prudent, empathetic personal finance strategist." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3
        })
      });

      const sData = await sarvamRes.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ audit_analysis: sData.choices?.[0]?.message?.content || "No analysis available." })
      };
    }

    // 6. Voice Transcribe (JSON base64)
    if (path === "/voice/transcribe-json" || path === "/voice/transcribe-json/" || path === "/voice/transcribe" || path === "/voice/transcribe/") {
      let b64 = body.audio_base64 || "";
      if (b64.includes(",")) {
        b64 = b64.split(",")[1];
      }

      const audioBuffer = Buffer.from(b64, "base64");
      const langCode = body.language_code || "unknown";

      // Build multipart payload for Sarvam STT using FormData
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      let payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n`),
        audioBuffer,
        Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nsaaras:v4\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${langCode}\r\n`),
        Buffer.from(`--${boundary}--\r\n`)
      ]);

      const sttRes = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "api-subscription-key": apiKey
        },
        body: payload
      });

      const sttData = await sttRes.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          transcript: sttData.transcript || "",
          language_code: sttData.language_code || langCode
        })
      };
    }

    // 7. Voice Synthesize
    if (path === "/voice/synthesize" || path === "/voice/synthesize/") {
      const ttsRes = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey
        },
        body: JSON.stringify({
          text: (body.text || "").substring(0, 500),
          language_code: body.language_code || "en-IN",
          speaker: body.speaker || "aditi_en_stories",
          model: "bulbul:v4-flash"
        })
      });
      const ttsData = await ttsRes.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          audio_base64: ttsData.audios?.[0] || null,
          language_code: body.language_code || "en-IN"
        })
      };
    }

    // 404 for unknown API path
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `Path not found: ${path}` })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
