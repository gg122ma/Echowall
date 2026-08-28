/**
 * Free AI Adapter — RAG chatbot backed by the KMK knowledge base.
 *
 * How it works (the "teach me" part):
 *
 * 1. RETRIEVAL — When the user asks a question we tokenize the query
 *    and scan every document in window.KMK_KNOWLEDGE_BASE.documents.
 *    Each document is scored by keyword overlap (TF-like weighting)
 *    across its title, aliases, tags and content.  The top-N matches
 *    are returned as "context".
 *
 * 2. GENERATION — Two modes:
 *
 *    a) LOCAL (default, no API key needed):
 *       We build a human-readable answer from the best-matching
 *       document(s).  This is a rule-based template engine, not a
 *       true LLM, but it gives useful, citeable answers for free.
 *
 *    b) OPENROUTER (optional, free tier):
 *       If the user sets window.EchoConfig.freeAI.openRouterToken,
 *       we send the retrieved context + the user's question to the
 *       OpenRouter API (OpenAI-compatible) using a free model.
 *       The model generates a natural-language answer grounded in
 *       the knowledge base.
 *
 * 3. BOUNDARY CHECKS — Before answering we check the rules from
 *    database/03 to decide whether the question should be handled
 *    locally, escalated to a human, or refused entirely.
 *
 * ── How to enable the free AI model ──────────────────────────────
 *
 * 1. Go to https://openrouter.ai and create a free account.
 * 2. Create an API key from your OpenRouter dashboard.
 * 3. Add it to config/app-config.js:
 *
 *      freeAI: {
 *        enabled: true,
 *        provider: "openrouter",
 *        openRouterToken: "",
 *        model: "openrouter/auto-beta",
 *      },
 *
 * 4. The chatbot will now use the AI model for richer responses.
 *    Without the token it falls back to the local rule-based engine.
 *
 * NOTE: For best results, serve the website via a local HTTP server
 * (e.g. `python -m http.server 8000`) instead of opening index.html
 * directly, to avoid CORS issues with the OpenRouter API.
 */
(function () {
  "use strict";

  // Common stop words to filter from query tokens
  var STOP_WORDS = new Set([
    "where", "is", "the", "what", "are", "how", "can", "i", "to", "in",
    "of", "for", "a", "an", "at", "on", "with", "and", "or", "but",
    "show", "tell", "me", "find", "give", "list", "all", "any",
  ]);

  // ── Helpers ──────────────────────────────────────────────────────

  /** Tokenize a string into lower-case word tokens (min 2 chars). */
  function tokenize(text) {
    if (!text) return [];
    const lower = String(text).toLowerCase();
    
    // Check if text contains Chinese characters
    const hasChinese = /[\u4e00-\u9fff]/.test(lower);
    
    if (hasChinese) {
      // For Chinese: extract individual characters and 2-char bigrams
      const chineseChars = lower.match(/[\u4e00-\u9fff]+/g) || [];
      const tokens = [];
      chineseChars.forEach(segment => {
        // Add individual characters (min 1 char for Chinese)
        for (let i = 0; i < segment.length; i++) {
          tokens.push(segment[i]);
        }
        // Add 2-character bigrams
        for (let i = 0; i < segment.length - 1; i++) {
          tokens.push(segment.substring(i, i + 2));
        }
      });
      // Also add non-Chinese words
      const nonChinese = lower.replace(/[\u4e00-\u9fff]/g, " ").replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
      return [...tokens, ...nonChinese];
    }
    
    // Normal tokenization for English/Malay
    return lower
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  }

  /** Detect the user's language from the query. */
  function detectLanguage(query) {
    const lower = query.toLowerCase();
    // Check for Chinese characters
    if (/[\u4e00-\u9fff]/.test(query)) return "zh";
    // Check for Malay words
    const malayWords = ["di mana", "bagaimana", "apakah", "boleh", "saya", "anda", "terima", "kasih", "tolong", "bantuan", "kantin", "perpustakaan", "asrama", "pejabat", "kolej", "matrikulasi"];
    if (malayWords.some(w => lower.includes(w))) return "ms";
    // Default to English
    return "en";
  }

  /** Get the localized content fields from a document based on language. */
  function getLocalizedDoc(doc, language) {
    if (language === "ms") {
      return {
        ...doc,
        content: doc.contentMs || doc.content,
        location: doc.locationMs || doc.location,
        rules: doc.rulesMs || doc.rules,
      };
    }
    if (language === "zh") {
      return {
        ...doc,
        content: doc.contentZh || doc.content,
        location: doc.locationZh || doc.location,
        rules: doc.rulesZh || doc.rules,
      };
    }
    return doc;
  }

  /** Build a searchable text blob from a document. */
  function docSearchText(doc) {
    return [
      doc.title,
      doc.aliases?.join(" "),
      doc.tags?.join(" "),
      doc.content,
      doc.contentMs,
      doc.contentZh,
      doc.location,
      doc.locationMs,
      doc.locationZh,
      doc.rules,
      doc.rulesMs,
      doc.rulesZh,
    ].join(" ");
  }

  /**
   * Score a document against the query tokens.
   * Uses a simple term-frequency model: each matching token adds
   * weight; title/aliases/tags get a higher multiplier.
   */
  function scoreDocument(doc, queryTokens) {
    if (!queryTokens.length) return 0;
    const searchBlob = docSearchText(doc).toLowerCase();
    let score = 0;
    const seen = new Set();

    queryTokens.forEach((token) => {
      if (seen.has(token)) return;
      seen.add(token);

      // Title match — highest weight
      if (doc.title?.toLowerCase().includes(token)) score += 4;
      // Alias match — high weight
      if (doc.aliases?.some((a) => a.toLowerCase().includes(token))) score += 3;
      // Tag match — medium weight
      if (doc.tags?.some((t) => t.toLowerCase().includes(token))) score += 2;
      // Content match — base weight
      const contentLower = searchBlob;
      const count = contentLower.split(token).length - 1;
      if (count > 0) score += count;
    });

    return score;
  }

  /**
    * Retrieve the top-N most relevant documents for a query.
    * Returns an array of { doc, score } sorted by score descending.
    * Documents are localized based on the detected language.
    */
  function retrieveDocuments(query, topN) {
    const kb = window.KMK_KNOWLEDGE_BASE;
    if (!kb || !kb.documents) return [];

    const queryTokens = tokenize(query);
    if (!queryTokens.length) return [];

    const language = detectLanguage(query);

    const scored = kb.documents
      .map((doc) => {
        const localizedDoc = getLocalizedDoc(doc, language);
        return { doc: localizedDoc, originalDoc: doc, score: scoreDocument(localizedDoc, queryTokens) };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, topN || 5);
  }

  /**
   * Check whether a query matches any "forbidden" or "course" rule.
   * Returns a boundary object or null.
   */
  function checkBoundaries(query) {
    const kb = window.KMK_KNOWLEDGE_BASE;
    if (!kb || !kb.rules) return null;

    const normalized = query.toLowerCase();

    // Course questions
    const courseKeywords = ["course", "assignment", "exam answer", "solve", "作业", "课程", "解题", "考试答案"];
    if (courseKeywords.some((kw) => normalized.includes(kw))) {
      return {
        type: "course",
        message: kb.courseInfo?.message || "This chatbot mainly handles KMK campus locations, facilities, accommodation, services, and life rules. Course Q&A needs an independent verified course knowledge base.",
      };
    }

    // Forbidden content
    const forbiddenKeywords = ["innostem", "competition strategy", "internal development", "github", "api key", "password", "employee password", "比赛策略", "内部开发", "员工密码"];
    if (forbiddenKeywords.some((kw) => normalized.includes(kw))) {
      return {
        type: "forbidden",
        message: "Sorry, this chatbot does not answer InnoSTEM, competition projects, development repositories, or internal system questions.",
      };
    }

    // Medical questions
    const medicalKeywords = ["diagnose", "diagnosis", "infection", "fever", "headache", "medicine", "medication", "can i go to class", "诊断", "感染", "发烧", "头痛", "药"];
    if (medicalKeywords.some((kw) => normalized.includes(kw))) {
      const doc = retrieveDocuments("Pejabat Asrama clinic", 1)[0]?.doc;
      return {
        type: "medical",
        message: `This chatbot cannot diagnose diseases or recommend medication. For medical assistance, please go to ${doc?.title || "Pejabat Asrama"} or contact official emergency channels or local emergency services.`,
      };
    }

    return null;
  }

  /**
   * Strip metadata tags from AI-generated responses so users only see the answer.
   * Removes ALL bracketed content to ensure clean responses.
   */
  function stripMetadataTags(text) {
    if (!text) return text;
    
    // Remove ALL bracketed content: [], 【), (), etc.
    let result = text
      .replace(/\[[^\]]*\]/g, '')           // Remove [anything]
      .replace(/【[^】]*】/g, '')             // Remove 【anything】
      .replace(/\([^)]*\)/g, '')             // Remove (anything)
      .replace(/\n{3,}/g, '\n\n')            // Clean up extra newlines
      .trim();
    
    // Remove any lines that are now empty or only whitespace
    result = result.split('\n').filter(line => line.trim()).join('\n').trim();
    
    // Final cleanup: remove any remaining metadata-like patterns
    result = result
      .replace(/^(Answer|Data Status|Source|Reminder|答案|数据状态|来源|提醒|Jawapan|Status Data|Sumber|Peringatan)[:\s]*/gim, '')
      .replace(/\n{2,}/g, '\n\n')
      .trim();
    
    return result;
  }

  /**
   * Format a local (rule-based) answer from retrieved documents.
   * This is the fallback when no AI API is configured.
   */
  function formatLocalAnswer(query, results) {
    if (!results.length) {
      return {
        text: "Information not available in current materials.",
        action: null,
      };
    }

    const top = results[0];
    const doc = top.doc;

    // Build a clean answer without metadata tags
    let answer = doc.content;
    if (doc.location) answer += `\nLocation: ${doc.location}`;
    if (doc.hours) answer += `\nHours: ${doc.hours}`;
    if (doc.rules) answer += `\nRules: ${doc.rules}`;

    // Strip any metadata tags that might be in the content
    answer = stripMetadataTags(answer);

    // Add an action only when the document explicitly maps to a current building profile.
    const actionBuilding = (
      ["education", "study", "sports"].includes(doc.category)
      && typeof window.getCampusBuilding === "function"
    ) ? window.getCampusBuilding(doc.buildingId) : null;
    let action = null;
    if (actionBuilding) {
      const buildingId = actionBuilding.id;
      action = {
        label: "View details",
        onClick: () => {
          if (typeof window.navigate === "function") {
            window.navigate(`#/place/${encodeURIComponent(buildingId)}`);
          }
        },
      };
    }

    return { text: answer, action };
  }

  /**
   * Call the OpenRouter API for a free AI-generated answer.
   * Uses the OpenAI-compatible chat completions format.
   * Includes a 15-second timeout to prevent hanging.
   */
  async function callOpenRouter(messages) {
    const config = window.EchoConfig?.freeAI || {};
    const token = config.openRouterToken;
    const model = config.model || "openrouter/auto-beta";

    if (!token) throw new Error("OPENROUTER_TOKEN_NOT_SET");

    // Create a timeout controller (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin && window.location.origin !== "null"
              ? window.location.origin
              : "https://echowall.invalid",
            "X-Title": "Echo Wall",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("OPENROUTER_TIMEOUT: Request timed out after 30 seconds");
      }
      throw new Error(`OPENROUTER_NETWORK_ERROR: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const err = await response.text();
      // Check for common error cases
      if (response.status === 401) {
        throw new Error(`OPENROUTER_UNAUTHORIZED: Invalid API token (status ${response.status})`);
      }
      if (response.status === 403) {
        throw new Error(`OPENROUTER_FORBIDDEN: Token lacks access to this model (status ${response.status})`);
      }
      if (response.status === 429) {
        throw new Error(`OPENROUTER_RATE_LIMIT: Rate limit exceeded, try again later (status ${response.status})`);
      }
      throw new Error(`OPENROUTER_API_ERROR: ${response.status} ${err}`);
    }

    const data = await response.json();
    // OpenRouter returns OpenAI-compatible format: { choices: [{ message: { content: "..." } }] }
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    throw new Error("OPENROUTER_UNEXPECTED_RESPONSE: No content in response");
  }

  /**
   * Build a prompt for the AI model using the system prompt +
   * retrieved context + user query.
   * Returns an OpenAI-compatible messages array.
   * Keeps the prompt concise to avoid token limits.
   */
  function buildAIPrompt(query, results) {
    const kb = window.KMK_KNOWLEDGE_BASE;
    const language = detectLanguage(query);

    // Use only top 1 result to stay within free model token limits
    const top = results[0];
    const context = top ? `[${top.doc.title}] ${top.doc.content}${top.doc.location ? " Location: " + top.doc.location : ""}${top.doc.rules ? " Rules: " + top.doc.rules : ""}` : "";

    const languageInstruction = language === "ms"
      ? "Answer in Bahasa Melayu. Be concise."
      : language === "zh"
        ? "请用中文回答。请简洁回答。"
        : "Answer in English. Be concise.";

    const brevityNote = language === "zh"
      ? "注意：请用1-2句话简洁回答，不要超过100字。"
      : language === "ms"
        ? "Nota: Jawab dalam 1-2 ayat ringkas, jangan melebihi 100 patah perkataan."
        : "Note: Answer in 1-2 concise sentences, do not exceed 100 words.";

    return [
      {
        role: "system",
        content: kb.systemPrompt +
          "\n\n" + languageInstruction +
          "\n\n" + brevityNote +
          "\n\n" + context
      },
      { role: "user", content: query }
    ];
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Check whether the free AI adapter is configured.
   * Returns true if either local mode is available (always) or
   * the OpenRouter token is set.
   */
  function isConfigured() {
    const config = window.EchoConfig?.freeAI || {};
    // Local mode is always available (no API key needed)
    return config.enabled !== false;
  }

  /**
   * Check whether the OpenRouter AI model is enabled.
   */
  function isAIModelEnabled() {
    const config = window.EchoConfig?.freeAI || {};
    return Boolean(config.enabled && config.openRouterToken);
  }

  /**
   * Send a message to the free AI adapter.
   * Returns a promise that resolves to a response object:
   *   { reply: string, action?: { label, onClick } }
   */
  async function sendMessage(message, conversationId) {
    const question = message.trim();
    if (!question) return { reply: "" };

    // 1. Boundary checks
    const boundary = checkBoundaries(question);
    if (boundary) {
      return { reply: boundary.message };
    }

    // 2. Retrieve relevant documents
    const results = retrieveDocuments(question, 5);

    // 3. Generate answer - prefer local mode for reliability
    const local = formatLocalAnswer(question, results);
    
    // Always strip metadata from local response
    const localCleaned = stripMetadataTags(local.text);
    
    // Only use AI if explicitly enabled and we have results
    if (isAIModelEnabled() && results.length > 0) {
      try {
        const messages = buildAIPrompt(question, results);
        const aiReply = await callOpenRouter(messages);
        const aiCleaned = stripMetadataTags(aiReply);
        // Use AI response if it's complete (doesn't end mid-word)
        if (aiCleaned && aiCleaned.length > 10 && !aiCleaned.match(/\w+$/)) {
          return { reply: aiCleaned };
        }
      } catch (err) {
        // Log the error for debugging
        console.error("[FreeAI] OpenRouter API failed:", err.message);
        // Fall back to local mode
      }
    }

    // Local mode (no API key) - always works, no token limits
    return { reply: localCleaned, action: local.action };
  }

  /**
   * Expose the adapter on the global scope.
   */
  window.FreeAIAdapter = {
    isConfigured,
    isAIModelEnabled,
    sendMessage,
    retrieveDocuments,
    checkBoundaries,
  };
})();
