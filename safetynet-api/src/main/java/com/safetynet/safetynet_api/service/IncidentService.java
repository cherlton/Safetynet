package com.safetynet.safetynet_api.service;

import com.safetynet.safetynet_api.dto.IncidentPatternDTO;
import com.safetynet.safetynet_api.dto.IncidentReportDetailsDTO;
import com.safetynet.safetynet_api.dto.IncidentResponseDTO;
import com.safetynet.safetynet_api.dto.WhatsAppMessageDTO;
import com.safetynet.safetynet_api.dto.WhatsAppSession;
import com.safetynet.safetynet_api.entity.IncidentReport;
import com.safetynet.safetynet_api.repository.IncidentReportRepository;
import com.safetynet.safetynet_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final GeminiAIService aiService;
    private final IncidentReportRepository incidentReportRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    private final java.util.concurrent.ConcurrentHashMap<String, WhatsAppSession> sessions = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Orchestrates the full ingest flow.
     * 1. Redacts PII using Claude.
     * 2. Extracts structured patterns (crime type, severity) using Claude.
     * 3. Determines the urgency score using Claude.
     * 4. Converts coordinates to a PostGIS Point.
     * 5. Persists the anonymized report in PostgreSQL.
     * 6. Broadcasts the incident over WebSockets to connected CPF dashboards.
     */
    @Transactional
    public IncidentReport processIngest(WhatsAppMessageDTO message) {
        log.info("Processing WhatsApp ingest from: {}", message.getFrom());

        // 1. PII Redaction and Details Extraction
        IncidentReportDetailsDTO details = aiService.extractReportDetails(message.getBody());
        String cleanText = details.getCleanText();

        // 2. Pattern Extraction
        IncidentPatternDTO pattern = aiService.extractPattern(cleanText);

        // 3. Urgency Scoring
        Integer urgency = aiService.scoreUrgency(cleanText);

        // 4. Create PostGIS Point from GPS coordinates (only if report is not anonymous)
        Point location = null;
        if (!details.isAnonymous() && message.getLatitude() != null && message.getLongitude() != null &&
                !message.getLatitude().isBlank() && !message.getLongitude().isBlank()) {
            try {
                double lat = Double.parseDouble(message.getLatitude());
                double lng = Double.parseDouble(message.getLongitude());
                location = geometryFactory.createPoint(new Coordinate(lng, lat));
                log.info("Mapped coordinates to PostGIS Point: lng={}, lat={}", lng, lat);
            } catch (NumberFormatException e) {
                log.warn("Failed to parse coordinates: lat={}, lng={}", message.getLatitude(), message.getLongitude());
            }
        }

        // 5. Persist Record (hiding personal info if anonymous is enabled)
        IncidentReport report = IncidentReport.builder()
                .cleanText(cleanText)
                .crimeType(pattern.getCrimeType())
                .severity(pattern.getSeverity())
                .urgency(urgency)
                .location(location)
                .status("PROCESSED")
                .reporterName(details.isAnonymous() ? null : details.getReporterName())
                .reporterContact(details.isAnonymous() ? null : details.getReporterContact())
                .reporterLocation(details.isAnonymous() ? null : details.getReporterLocation())
                .reporterGender(details.isAnonymous() ? null : details.getReporterGender())
                .reporterAge(details.isAnonymous() ? null : details.getReporterAge())
                .whatsappNumber(details.isAnonymous() ? null : (message.getFrom() != null ? message.getFrom().replace("whatsapp:", "") : null))
                .isAnonymous(details.isAnonymous())
                .build();

        IncidentReport savedReport = incidentReportRepository.save(report);
        log.info("Successfully persisted incident with ID: {}. Anonymous={}", savedReport.getId(), savedReport.getIsAnonymous());

        // 6. Broadcast mapped DTO to WebSocket broker
        try {
            IncidentResponseDTO responseDTO = IncidentResponseDTO.builder()
                    .id(savedReport.getId())
                    .cleanText(savedReport.getCleanText())
                    .crimeType(savedReport.getCrimeType())
                    .severity(savedReport.getSeverity())
                    .urgency(savedReport.getUrgency())
                    .latitude(savedReport.getLocation() != null ? savedReport.getLocation().getY() : null) // Lat is Y
                    .longitude(savedReport.getLocation() != null ? savedReport.getLocation().getX() : null) // Lng is X
                    .reportedAt(savedReport.getReportedAt())
                    .status(savedReport.getStatus())
                    .reporterName(savedReport.getReporterName())
                    .reporterContact(savedReport.getReporterContact())
                    .whatsappNumber(savedReport.getWhatsappNumber())
                    .reporterLocation(savedReport.getReporterLocation())
                    .isAnonymous(savedReport.getIsAnonymous())
                    .build();

            messagingTemplate.convertAndSend("/topic/incidents", responseDTO);
            log.info("Successfully broadcasted incident ID {} over STOMP WebSockets.", savedReport.getId());
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket real-time event: ", e);
        }

        return savedReport;
    }

    public String processSessionMessage(WhatsAppMessageDTO message) {
        String from = message.getFrom();
        if (from == null) {
            from = "unknown";
        }
        String body = message.getBody() != null ? message.getBody().trim() : "";

        // Cancel command (always checks for "9")
        if (sessions.containsKey(from) && body.equals("9")) {
            sessions.remove(from);
            return formatTwiML("SafetyNet: Reporting session canceled.");
        }

        // Trigger command
        if (body.equalsIgnoreCase("i wanna report") || body.equalsIgnoreCase("report")) {
            WhatsAppSession session = new WhatsAppSession();
            session.setPhone(from);
            session.setState(WhatsAppSession.State.AWAITING_ANONYMITY);
            sessions.put(from, session);
            return formatTwiML("SafetyNet: Reporting session started. Would you like to remain anonymous for this report? Reply 'yes' or 'no'. (Reply '9' to cancel)");
        }

        // Check if there is an active session
        WhatsAppSession session = sessions.get(from);
        if (session == null) {
            return formatTwiML("SafetyNet: Welcome. To report a crime, type 'report' or 'i wanna report'.");
        }

        // Handle states
        switch (session.getState()) {
            case AWAITING_ANONYMITY:
                if (body.equalsIgnoreCase("yes")) {
                    session.setIsAnonymous(true);
                    session.setState(WhatsAppSession.State.AWAITING_REPORT_DETAILS);
                    return formatTwiML("SafetyNet: You chose to remain anonymous. Please describe the incident in detail (what happened, where, and when). (Reply '9' to cancel)");
                } else if (body.equalsIgnoreCase("no") || body.equalsIgnoreCase("no i dont wanna")) {
                    session.setIsAnonymous(false);
                    
                    String cleanedNumber = from.replace("whatsapp:", "").trim();
                    String cleanedNumberNoPlus = cleanedNumber.replace("+", "").trim();

                    java.util.Optional<com.safetynet.safetynet_api.entity.User> userOpt = userRepository.findByPhoneNumber(cleanedNumber);
                    if (userOpt.isEmpty()) {
                        userOpt = userRepository.findByPhoneNumber(cleanedNumberNoPlus);
                    }
                    if (userOpt.isEmpty()) {
                        userOpt = userRepository.findAll().stream()
                            .filter(u -> u.getPhoneNumber() != null && 
                                (u.getPhoneNumber().contains(cleanedNumberNoPlus) || cleanedNumberNoPlus.contains(u.getPhoneNumber().replace("+", "").trim())))
                            .findFirst();
                    }

                    String name = "Registered User";
                    String location = "Johannesburg, GP (Mock Cell Tower)";
                    String contact = cleanedNumber;

                    if (userOpt.isPresent()) {
                        com.safetynet.safetynet_api.entity.User user = userOpt.get();
                        name = user.getUsername();
                        contact = user.getPhoneNumber() != null ? user.getPhoneNumber() : cleanedNumber;
                        location = "Pretoria, GP (Cell Tower/IP Simulation)";
                    } else {
                        name = "Simulated Citizen";
                        location = "Cape Town, WC (Cell Tower/IP Simulation)";
                    }

                    session.setReporterName(name);
                    session.setReporterContact(contact);
                    session.setReporterLocation(location);
                    session.setState(WhatsAppSession.State.AWAITING_REPORT_DETAILS);

                    return formatTwiML("SafetyNet: Details extracted for phone " + cleanedNumber + ":\n" +
                            "- Name: " + name + "\n" +
                            "- Location: " + location + "\n\n" +
                            "Please describe the incident in detail (what happened, where, and when). (Reply '9' to cancel)");
                } else {
                    return formatTwiML("SafetyNet: Invalid option. Would you like to remain anonymous? Reply 'yes' or 'no'. (Reply '9' to cancel)");
                }

            case AWAITING_REPORT_DETAILS:
                if (body.isEmpty()) {
                    return formatTwiML("SafetyNet: Report details cannot be empty. Please describe the incident. (Reply '9' to cancel)");
                }
                session.setDetails(body);
                session.setState(WhatsAppSession.State.AWAITING_IMAGES);
                return formatTwiML("SafetyNet: Would you like to upload images of the incident? Reply 'yes' or 'no'. (Reply '9' to cancel)");

            case AWAITING_IMAGES:
                if (body.equalsIgnoreCase("yes")) {
                    return formatTwiML("SafetyNet: Please upload/send your images now. Reply 'no' (or '9' to cancel) when done to complete the report.");
                } else if (body.equalsIgnoreCase("no")) {
                    try {
                        WhatsAppMessageDTO ingestMessage = new WhatsAppMessageDTO();
                        ingestMessage.setFrom(session.getPhone());
                        ingestMessage.setBody(session.getDetails());
                        
                        IncidentReport report = processStatefulIngest(session, ingestMessage);
                        sessions.remove(from);

                        return formatTwiML("SafetyNet: Thank you. Your report has been successfully processed! Incident ID: " + report.getId() + ". Status: " + report.getStatus());
                    } catch (Exception e) {
                        log.error("Error processing stateful incident report: ", e);
                        sessions.remove(from);
                        return formatTwiML("SafetyNet: We received your report, but experienced an issue processing it.");
                    }
                } else {
                    return formatTwiML("SafetyNet: Images received. Reply 'no' (or '9' to cancel) to complete the report.");
                }

            default:
                sessions.remove(from);
                return formatTwiML("SafetyNet: Session error. Please try starting again by typing 'report'.");
        }
    }

    private String formatTwiML(String message) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<Response><Message>" + message + "</Message></Response>";
    }

    @Transactional
    public IncidentReport processStatefulIngest(WhatsAppSession session, WhatsAppMessageDTO message) {
        log.info("Processing stateful WhatsApp ingest from: {}", session.getPhone());

        String cleanText = aiService.redactPII(message.getBody());
        IncidentPatternDTO pattern = aiService.extractPattern(cleanText);
        Integer urgency = aiService.scoreUrgency(cleanText);

        Point location = null;
        if (!session.getIsAnonymous() && session.getReporterLocation() != null) {
            try {
                double lat = -26.2041;
                double lng = 28.0473;
                if (session.getReporterLocation().contains("Pretoria")) {
                    lat = -25.7479;
                    lng = 28.1878;
                } else if (session.getReporterLocation().contains("Cape Town")) {
                    lat = -33.9249;
                    lng = 18.4241;
                }
                location = geometryFactory.createPoint(new Coordinate(lng, lat));
                log.info("Mapped stateful coordinates to PostGIS Point: lng={}, lat={}", lng, lat);
            } catch (Exception e) {
                log.warn("Failed to parse simulated coordinates for location: {}", session.getReporterLocation());
            }
        }

        IncidentReport report = IncidentReport.builder()
                .cleanText(cleanText)
                .crimeType(pattern.getCrimeType())
                .severity(pattern.getSeverity())
                .urgency(urgency)
                .location(location)
                .status("PROCESSED")
                .reporterName(session.getIsAnonymous() ? null : session.getReporterName())
                .reporterContact(session.getIsAnonymous() ? null : session.getReporterContact())
                .reporterLocation(session.getIsAnonymous() ? null : session.getReporterLocation())
                .reporterGender(session.getIsAnonymous() ? null : "Other")
                .reporterAge(session.getIsAnonymous() ? null : 30)
                .whatsappNumber(session.getIsAnonymous() ? null : (session.getPhone() != null ? session.getPhone().replace("whatsapp:", "") : null))
                .isAnonymous(session.getIsAnonymous())
                .build();

        IncidentReport savedReport = incidentReportRepository.save(report);
        log.info("Successfully persisted stateful incident with ID: {}. Anonymous={}", savedReport.getId(), savedReport.getIsAnonymous());

        try {
            IncidentResponseDTO responseDTO = IncidentResponseDTO.builder()
                    .id(savedReport.getId())
                    .cleanText(savedReport.getCleanText())
                    .crimeType(savedReport.getCrimeType())
                    .severity(savedReport.getSeverity())
                    .urgency(savedReport.getUrgency())
                    .latitude(savedReport.getLocation() != null ? savedReport.getLocation().getY() : null)
                    .longitude(savedReport.getLocation() != null ? savedReport.getLocation().getX() : null)
                    .reportedAt(savedReport.getReportedAt())
                    .status(savedReport.getStatus())
                    .reporterName(savedReport.getReporterName())
                    .reporterContact(savedReport.getReporterContact())
                    .whatsappNumber(savedReport.getWhatsappNumber())
                    .reporterLocation(savedReport.getReporterLocation())
                    .isAnonymous(savedReport.getIsAnonymous())
                    .build();

            messagingTemplate.convertAndSend("/topic/incidents", responseDTO);
            log.info("Successfully broadcasted stateful incident ID {} over STOMP WebSockets.", savedReport.getId());
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket real-time event: ", e);
        }

        return savedReport;
    }
}
