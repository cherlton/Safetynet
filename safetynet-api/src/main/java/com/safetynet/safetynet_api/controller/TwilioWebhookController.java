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
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.APPLICATION_XML_VALUE
    )
    public ResponseEntity<String> receiveMessage(
            @ModelAttribute WhatsAppMessageDTO message,
            @RequestHeader(value = "X-Twilio-Signature", required = false) String signature,
            HttpServletRequest request) {

        log.info("Incoming WhatsApp message from: {}", message.getFrom());

        // 1. Optional Twilio Request Signature Validation
        if (validationEnabled && twilioAuthToken != null && !twilioAuthToken.isBlank()) {
            if (signature == null) {
                log.warn("Twilio signature validation failed: X-Twilio-Signature header is missing");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Missing Twilio Signature");
            }

            // Extract all form parameters for validation
            Map<String, String> params = new HashMap<>();
            request.getParameterMap().forEach((key, value) -> {
                if (value != null && value.length > 0) {
                    params.put(key, value[0]);
                }
            });

            // Reconstruct the request URL taking proxy headers into account (highly important for ngrok tunnels)
            String requestUrl = getFullRequestUrl(request);
            log.info("Validating signature against URL: {}", requestUrl);

            RequestValidator validator = new RequestValidator(twilioAuthToken);
            if (!validator.validate(requestUrl, params, signature)) {
                log.warn("Twilio signature validation failed!");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid Twilio Signature");
            }
            log.info("Twilio signature validation passed successfully.");
        }

        // 2. Process message through stateful chat session and return conversational response
        try {
            String twiml = incidentService.processSessionMessage(message);
            return ResponseEntity.ok(twiml);
        } catch (Exception e) {
            log.error("Error processing incident report: ", e);
            String errorTwiml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                    "<Response><Message>SafetyNet: We received your message, but experienced an issue processing it.</Message></Response>";
            return ResponseEntity.ok(errorTwiml);
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
