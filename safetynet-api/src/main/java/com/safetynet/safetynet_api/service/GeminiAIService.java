package com.safetynet.safetynet_api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safetynet.safetynet_api.dto.GeminiResponse;
import com.safetynet.safetynet_api.dto.IncidentPatternDTO;
import com.safetynet.safetynet_api.dto.IncidentReportDetailsDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiAIService {

    @Value("${gemini.api-key:mock-key}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String model;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public GeminiAIService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com/v1beta").build();
        this.objectMapper = objectMapper;
    }

    /**
     * Step 1: PII Redaction
     * Removes PII from raw WhatsApp report.
     */
    public String redactPII(String rawReport) {
        if (apiKey.equals("mock-key") || apiKey.isEmpty()) {
            log.warn("Using mock PII Redaction due to missing Gemini API key.");
            return "[ANONYMIZED] " + rawReport;
        }

        log.info("Sending report to Gemini for PII Redaction...");
        String systemPrompt = "You are a privacy filter. Remove all PII from the report.\n" +
                "Replace names, phone numbers, SA ID numbers, and specific street addresses with [REDACTED].\n" +
                "Return only the cleaned text, nothing else.";

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", rawReport))
                )),
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                )
        );

        try {
            GeminiResponse response = webClient.post()
                    .uri("/models/" + model + ":generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(GeminiResponse.class)
                    .block();

            if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
                GeminiResponse.Candidate candidate = response.getCandidates().get(0);
                if (candidate.getContent() != null && candidate.getContent().getParts() != null && !candidate.getContent().getParts().isEmpty()) {
                    return candidate.getContent().getParts().get(0).getText().trim();
                }
            }
        } catch (Exception e) {
            log.error("Failed to call Gemini API for PII redaction: ", e);
            throw new RuntimeException("AI PII Redaction failed", e);
        }

        return "[REDACTION_FAILED] " + rawReport;
    }

    /**
     * Step 2: Pattern Extraction
     * Extracts structured patterns from redacted report into IncidentPatternDTO.
     */
    public IncidentPatternDTO extractPattern(String cleanText) {
        if (apiKey.equals("mock-key") || apiKey.isEmpty()) {
            log.warn("Using mock Pattern Extraction due to missing Gemini API key.");
            IncidentPatternDTO mock = new IncidentPatternDTO();
            mock.setCrimeType("GENERAL");
            mock.setInfrastructureTarget("NONE");
            mock.setSeverity(3);
            mock.setKeywords(List.of("general", "report"));
            mock.setEstimatedTime("UNKNOWN");
            return mock;
        }

        log.info("Sending clean text to Gemini for Pattern Extraction...");
        String systemPrompt = "You are a structured data extractor. Return a JSON object only — no prose — " +
                "with keys: crime_type, infrastructure_target, severity (1-5), keywords (array), estimated_time. " +
                "Use standard JSON formatting. Do not include markdown codeblocks or prefix/suffix. Just return the JSON.";

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", cleanText))
                )),
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json"
                )
        );

        try {
            GeminiResponse response = webClient.post()
                    .uri("/models/" + model + ":generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(GeminiResponse.class)
                    .block();

            if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
                GeminiResponse.Candidate candidate = response.getCandidates().get(0);
                if (candidate.getContent() != null && candidate.getContent().getParts() != null && !candidate.getContent().getParts().isEmpty()) {
                    String rawJson = candidate.getContent().getParts().get(0).getText().trim();
                    String cleanedJson = cleanJsonText(rawJson);
                    log.info("Received raw JSON pattern: {}", cleanedJson);
                    return objectMapper.readValue(cleanedJson, IncidentPatternDTO.class);
                }
            }
        } catch (Exception e) {
            log.error("Failed to call Gemini API for pattern extraction: ", e);
            throw new RuntimeException("AI Pattern Extraction failed", e);
        }

        throw new RuntimeException("Pattern Extraction response is empty");
    }

    /**
     * Step 3: Urgency Scoring
     * Rates urgency on a 1-10 scale based on language cues.
     */
    public Integer scoreUrgency(String cleanText) {
        if (apiKey.equals("mock-key") || apiKey.isEmpty()) {
            log.warn("Using mock Urgency Scoring due to missing Gemini API key.");
            return 5;
        }

        log.info("Sending clean text to Gemini for Urgency Scoring...");
        String systemPrompt = "You are an emergency responder triage AI. Rate the urgency of the following anonymized crime report " +
                "on a scale of 1-10 based on language cues.\n" +
                "Example 1 (Urgency 1): 'Someone left some garden refuse on the pavement.'\n" +
                "Example 2 (Urgency 5): 'Cable theft in progress, lights went off and we see people digging.'\n" +
                "Example 3 (Urgency 9): 'Armed robbery in progress, shots fired, immediate help needed!'\n" +
                "Rate based on cues like 'right now', 'armed', 'ongoing fire', 'assault', 'violence'. " +
                "Return only a single integer between 1 and 10 and nothing else.";

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", cleanText))
                )),
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                )
        );

        try {
            GeminiResponse response = webClient.post()
                    .uri("/models/" + model + ":generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(GeminiResponse.class)
                    .block();

            if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
                GeminiResponse.Candidate candidate = response.getCandidates().get(0);
                if (candidate.getContent() != null && candidate.getContent().getParts() != null && !candidate.getContent().getParts().isEmpty()) {
                    String result = candidate.getContent().getParts().get(0).getText().trim();
                    return Integer.parseInt(result.replaceAll("[^0-9]", ""));
                }
            }
        } catch (Exception e) {
            log.error("Failed to call Gemini API for urgency scoring: ", e);
            return 5; // Fallback score
        }

        return 5;
    }

    /**
     * Extracts report details including reporter's name, contact, location, anonymity preference, and cleanText.
     */
    public IncidentReportDetailsDTO extractReportDetails(String rawReport) {
        if (apiKey.equals("mock-key") || apiKey.isEmpty()) {
            log.warn("Using mock Report Details Extraction due to missing Gemini API key.");
            boolean isAnon = rawReport.toLowerCase().contains("anonymous") || rawReport.toLowerCase().contains("anon");
            IncidentReportDetailsDTO mock = new IncidentReportDetailsDTO();
            mock.setAnonymous(isAnon);
            
            if (isAnon) {
                mock.setReporterName(null);
                mock.setReporterContact(null);
                mock.setReporterLocation(null);
                mock.setCleanText(redactPII(rawReport));
                mock.setReporterGender(null);
                mock.setReporterAge(null);
            } else {
                // Mock extraction based on common patterns in the simulation
                String name = null;
                if (rawReport.contains("name is ")) {
                    int idx = rawReport.indexOf("name is ") + 8;
                    int end = rawReport.indexOf(" and", idx);
                    if (end == -1) end = rawReport.indexOf(".", idx);
                    if (end == -1) end = rawReport.length();
                    name = rawReport.substring(idx, end).trim();
                }
                
                String contact = null;
                if (rawReport.contains("at +")) {
                    int idx = rawReport.indexOf("at +") + 3;
                    int end = rawReport.indexOf(".", idx);
                    if (end == -1) end = rawReport.length();
                    contact = rawReport.substring(idx, end).trim();
                } else if (rawReport.contains("me at ")) {
                    int idx = rawReport.indexOf("me at ") + 6;
                    int end = rawReport.indexOf(".", idx);
                    if (end == -1) end = rawReport.length();
                    contact = rawReport.substring(idx, end).trim();
                }
                
                String location = null;
                if (rawReport.contains("at the ")) {
                    int idx = rawReport.indexOf("at the ") + 7;
                    int end = rawReport.indexOf(",", idx);
                    if (end == -1) end = rawReport.indexOf(".", idx);
                    if (end == -1) end = rawReport.length();
                    location = rawReport.substring(idx, end).trim();
                } else if (rawReport.contains("in ")) {
                    int idx = rawReport.indexOf("in ") + 3;
                    int end = rawReport.indexOf(",", idx);
                    if (end == -1) end = rawReport.indexOf(".", idx);
                    if (end == -1) end = rawReport.length();
                    location = rawReport.substring(idx, end).trim();
                }
                
                mock.setReporterName(name);
                mock.setReporterContact(contact);
                mock.setReporterLocation(location);
                mock.setCleanText(redactPII(rawReport));
                mock.setReporterGender("Other");
                mock.setReporterAge(30);
            }
            return mock;
        }

        log.info("Sending report to Gemini for Report Details Extraction...");
        String systemPrompt = "You are a security report parser and privacy filter.\n" +
                "Analyze the raw report and extract the following details:\n" +
                "1. isAnonymous: Boolean. Set to true if the reporter explicitly indicates they want to be anonymous, or if the report contains keywords indicating anonymous submission (like \"anonymous\", \"anon\", \"keep me anonymous\", \"private\").\n" +
                "2. reporterName: The reporter's name if mentioned in the report and if isAnonymous is false. If isAnonymous is true or no name is found, this must be null.\n" +
                "3. reporterContact: The reporter's contact details (phone, email etc.) if mentioned in the report and if isAnonymous is false. If isAnonymous is true or no contact is found, this must be null.\n" +
                "4. reporterLocation: The reporter's physical location/place details if mentioned in the report and if isAnonymous is false. If isAnonymous is true or no location is found, this must be null.\n" +
                "5. cleanText: The report text with all PII (names, phone numbers, specific addresses) redacted with [REDACTED].\n\n" +
                "Return a JSON object with keys: isAnonymous (boolean), reporterName (string or null), reporterContact (string or null), reporterLocation (string or null), cleanText (string).\n" +
                "Use standard JSON formatting. Do not include markdown codeblocks or prefix/suffix. Just return the JSON.";

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", rawReport))
                )),
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json"
                )
        );

        try {
            GeminiResponse response = webClient.post()
                    .uri("/models/" + model + ":generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(GeminiResponse.class)
                    .block();

            if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
                GeminiResponse.Candidate candidate = response.getCandidates().get(0);
                if (candidate.getContent() != null && candidate.getContent().getParts() != null && !candidate.getContent().getParts().isEmpty()) {
                    String rawJson = candidate.getContent().getParts().get(0).getText().trim();
                    String cleanedJson = cleanJsonText(rawJson);
                    log.info("Received raw JSON details: {}", cleanedJson);
                    return objectMapper.readValue(cleanedJson, IncidentReportDetailsDTO.class);
                }
            }
        } catch (Exception e) {
            log.error("Failed to call Gemini API for details extraction: ", e);
            throw new RuntimeException("AI Details Extraction failed", e);
        }

        throw new RuntimeException("Details Extraction response is empty");
    }

    private String cleanJsonText(String rawResponse) {
        if (rawResponse == null) return "{}";
        rawResponse = rawResponse.trim();
        if (rawResponse.startsWith("```json")) {
            rawResponse = rawResponse.substring(7);
        } else if (rawResponse.startsWith("```")) {
            rawResponse = rawResponse.substring(3);
        }
        if (rawResponse.endsWith("```")) {
            rawResponse = rawResponse.substring(0, rawResponse.length() - 3);
        }
        return rawResponse.trim();
    }
}
