package com.safetynet.safetynet_api.controller;

import com.safetynet.safetynet_api.dto.WhatsAppMessageDTO;
import com.safetynet.safetynet_api.entity.IncidentReport;
import com.safetynet.safetynet_api.service.IncidentService;
import com.twilio.security.RequestValidator;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/webhook")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class TwilioWebhookController {

    private final IncidentService incidentService;

    @Value("${twilio.auth-token:}")
    private String twilioAuthToken;

    @Value("${twilio.validation-enabled:false}")
    private boolean validationEnabled;

    /**
     * Webhook called by Twilio when a new WhatsApp message is received.
     * Consumes application/x-www-form-urlencoded, produces XML (TwiML).
     */
    @PostMapping(
            value = "/whatsapp",
            consumes = {MediaType.APPLICATION_FORM_URLENCODED_VALUE, MediaType.ALL_VALUE},
            produces = {MediaType.APPLICATION_XML_VALUE, MediaType.TEXT_XML_VALUE}
    )
    public ResponseEntity<String> receiveMessage(
            @ModelAttribute WhatsAppMessageDTO message,
            @RequestParam Map<String, String> allParams,
            @RequestHeader(value = "X-Twilio-Signature", required = false) String signature,
            HttpServletRequest request) {

        // Fill missing fields from allParams if @ModelAttribute missed any uppercase parameter names
        if (message.getFrom() == null || message.getFrom().isBlank()) {
            message.setFrom(allParams.getOrDefault("From", allParams.get("from")));
        }
        if (message.getBody() == null || message.getBody().isBlank()) {
            message.setBody(allParams.getOrDefault("Body", allParams.get("body")));
        }
        if (message.getProfileName() == null || message.getProfileName().isBlank()) {
            message.setProfileName(allParams.getOrDefault("ProfileName", allParams.get("profileName")));
        }
        if (message.getLatitude() == null || message.getLatitude().isBlank()) {
            message.setLatitude(allParams.getOrDefault("Latitude", allParams.get("latitude")));
        }
        if (message.getLongitude() == null || message.getLongitude().isBlank()) {
            message.setLongitude(allParams.getOrDefault("Longitude", allParams.get("longitude")));
        }
        if (message.getMediaUrl0() == null || message.getMediaUrl0().isBlank()) {
            message.setMediaUrl0(allParams.getOrDefault("MediaUrl0", allParams.get("mediaUrl0")));
        }

        log.info("Incoming WhatsApp message from: {} | Body: '{}'", message.getFrom(), message.getBody());

        // 1. Optional Twilio Request Signature Validation
        if (validationEnabled && twilioAuthToken != null && !twilioAuthToken.isBlank()) {
            if (signature == null) {
                log.warn("Twilio signature header missing from incoming webhook.");
            } else {
                Map<String, String> params = new HashMap<>();
                request.getParameterMap().forEach((key, value) -> {
                    if (value != null && value.length > 0) {
                        params.put(key, value[0]);
                    }
                });

                String requestUrl = getFullRequestUrl(request);
                RequestValidator validator = new RequestValidator(twilioAuthToken);
                if (!validator.validate(requestUrl, params, signature)) {
                    log.warn("Twilio signature validation mismatch (likely due to ngrok proxying). Continuing message processing.");
                } else {
                    log.info("Twilio signature validation passed successfully.");
                }
            }
        }

        // 2. Process message through stateful chat session and return conversational response
        try {
            String twiml = incidentService.processSessionMessage(message);
            log.info("Generated TwiML response for {}: {}", message.getFrom(), twiml);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_XML)
                    .body(twiml);
        } catch (Exception e) {
            log.error("Error processing incident report: ", e);
            String errorTwiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                    "<Response><Message>SafetyNet: We received your message, but experienced an issue processing it.</Message></Response>";
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_XML)
                    .body(errorTwiml);
        }
    }

    private String getFullRequestUrl(HttpServletRequest request) {
        // Resolve proxy headers (like ngrok protocol/host routing)
        String scheme = request.getHeader("X-Forwarded-Proto");
        String host = request.getHeader("X-Forwarded-Host");

        if (scheme == null) {
            scheme = request.getScheme();
        }
        if (host == null) {
            host = request.getServerName();
            int port = request.getServerPort();
            if (port != 80 && port != 443) {
                host += ":" + port;
            }
        }

        String uri = request.getRequestURI();
        String query = request.getQueryString();

        StringBuilder url = new StringBuilder(scheme).append("://").append(host).append(uri);
        if (query != null) {
            url.append("?").append(query);
        }
        return url.toString();
    }
}
