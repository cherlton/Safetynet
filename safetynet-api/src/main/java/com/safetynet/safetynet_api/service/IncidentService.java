package com.safetynet.safetynet_api.service;

import com.safetynet.safetynet_api.dto.IncidentPatternDTO;
import com.safetynet.safetynet_api.dto.IncidentReportDetailsDTO;
import com.safetynet.safetynet_api.dto.IncidentResponseDTO;
import com.safetynet.safetynet_api.dto.WhatsAppMessageDTO;
import com.safetynet.safetynet_api.dto.WhatsAppSession;
import com.safetynet.safetynet_api.entity.IncidentReport;
import com.safetynet.safetynet_api.entity.User;
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

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final GeminiAIService aiService;
    private final GeocodingService geocodingService;
    private final IncidentReportRepository incidentReportRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    private final ConcurrentHashMap<String, WhatsAppSession> sessions = new ConcurrentHashMap<>();

    /**
     * Flexible case-insensitive parsing for affirmative answers (YES, yes, Y, yeah,
     * yep, etc.)
     */
    private boolean isAffirmative(String text) {
        if (text == null)
            return false;
        String clean = text.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        return clean.equals("yes") || clean.equals("y") || clean.equals("yeah") || clean.equals("yep")
                || clean.equals("sure") || clean.equals("true") || clean.equals("1")
                || clean.contains("anonymous") || clean.contains("anon") || clean.contains("remainanonymous");
    }

    /**
     * Flexible case-insensitive parsing for negative answers (NO, no, N, nope, nah,
     * etc.)
     */
    private boolean isNegative(String text) {
        if (text == null)
            return false;
        String clean = text.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        return clean.equals("no") || clean.equals("n") || clean.equals("nope") || clean.equals("nah")
                || clean.equals("false") || clean.equals("0")
                || clean.contains("dont") || clean.contains("notanonymous") || clean.contains("notanon")
                || clean.contains("noidont");
    }

    /**
     * Extracts cleaned phone number format (e.g. +27821234567 or 0821234567)
     */
    private String extractCleanPhone(String rawFrom) {
        if (rawFrom == null)
            return "";
        return rawFrom.replace("whatsapp:", "").trim();
    }

    /**
     * Orchestrates the direct non-session ingest flow.
     */
    @Transactional
    public IncidentReport processIngest(WhatsAppMessageDTO message) {
        log.info("Processing direct WhatsApp ingest from: {}", message.getFrom());

        IncidentReportDetailsDTO details = aiService.extractReportDetails(message.getBody());
        String cleanText = details.getCleanText();
        IncidentPatternDTO pattern = aiService.extractPattern(cleanText);
        Integer urgency = aiService.scoreUrgency(cleanText);

        Point location = null;
        String resolvedAddress = details.getReporterLocation();

        if (message.getLatitude() != null && message.getLongitude() != null &&
                !message.getLatitude().isBlank() && !message.getLongitude().isBlank()) {
            try {
                double lat = Double.parseDouble(message.getLatitude());
                double lng = Double.parseDouble(message.getLongitude());
                location = geometryFactory.createPoint(new Coordinate(lng, lat));
                resolvedAddress = geocodingService.reverseGeocode(lat, lng);
            } catch (Exception e) {
                log.warn("Failed to parse coordinates: {}", e.getMessage());
            }
        } else if (resolvedAddress != null && !resolvedAddress.isBlank()) {
            double[] coords = geocodingService.geocodeAddress(resolvedAddress);
            location = geometryFactory.createPoint(new Coordinate(coords[1], coords[0]));
        }

        String phone = extractCleanPhone(message.getFrom());
        String reporterName = details.isAnonymous()
                ? null
                : (message.getProfileName() != null && !message.getProfileName().isBlank() ? message.getProfileName()
                        : (phone.isBlank() ? "Citizen" : phone));
        String reporterPicture = null;
        // Look up the user's profile picture from the database if they are a registered user
        Optional<User> matchedUser = findUserByPhone(phone);
        if (matchedUser.isPresent() && matchedUser.get().getPicture() != null) {
            reporterPicture = matchedUser.get().getPicture();
        }

        String visualAnalysis = null;
        if (message.getMediaUrl0() != null && !message.getMediaUrl0().isBlank()) {
            visualAnalysis = aiService.analyzeMediaEvidence(message.getMediaUrl0(), cleanText);
        }

        IncidentReport report = IncidentReport.builder()
                .cleanText(cleanText)
                .crimeType(pattern.getCrimeType())
                .severity(pattern.getSeverity())
                .urgency(urgency)
                .location(location)
                .status("PROCESSED")
                .reporterName(reporterName)
                .reporterContact(
                        details.isAnonymous() ? null : (phone.isBlank() ? details.getReporterContact() : phone))
                .reporterLocation(details.isAnonymous() ? null : resolvedAddress)
                .reporterGender(details.isAnonymous() ? null : details.getReporterGender())
                .reporterAge(details.isAnonymous() ? null : details.getReporterAge())
                .whatsappNumber(details.isAnonymous() ? null : phone)
                .reporterPicture(details.isAnonymous() ? null : reporterPicture)
                .mediaUrl(message.getMediaUrl0())
                .aiSummary(pattern.getAiSummary())
                .recommendedUnit(pattern.getRecommendedUnit())
                .tacticalBrief(pattern.getTacticalBrief())
                .visualAnalysis(visualAnalysis)
                .isAnonymous(details.isAnonymous())
                .build();

        IncidentReport savedReport = incidentReportRepository.save(report);
        broadcastIncident(savedReport);

        return savedReport;
    }

    /**
     * Handles stateful conversational reporting on WhatsApp.
     * Auto-extracts reporter name, phone, and profile picture from WhatsApp
     * metadata.
     * Only asks: anonymous? → describe incident → attach photos? → done.
     */
    public String processSessionMessage(WhatsAppMessageDTO message) {
        String from = message.getFrom() != null ? message.getFrom() : "unknown";
        String body = message.getBody() != null ? message.getBody().trim() : "";
        String cleanPhone = extractCleanPhone(from);

        // Cancel command (always checks for "9")
        if (sessions.containsKey(from) && body.equals("9")) {
            sessions.remove(from);
            return formatTwiML("SafetyNet: Reporting session canceled.");
        }

        // 1. Direct Emergency Auto-Ingest:
        // If the user sends a detailed emergency message (e.g. "i need help i'm about to get mugged", "someone broke in")
        // without an active multi-step session, process it immediately so responders are alerted with 0 delay!
        boolean isEmergencyText = body.toLowerCase().contains("mug") || 
                                  body.toLowerCase().contains("help") || 
                                  body.toLowerCase().contains("gun") || 
                                  body.toLowerCase().contains("rob") || 
                                  body.toLowerCase().contains("hijack") || 
                                  body.toLowerCase().contains("attack") || 
                                  body.toLowerCase().contains("break in") ||
                                  body.toLowerCase().contains("cable") ||
                                  body.toLowerCase().contains("shots");

        if (!sessions.containsKey(from) && isEmergencyText && body.length() > 6) {
            log.info("Direct emergency text detected from WhatsApp citizen {}: {}", from, body);
            try {
                IncidentReport report = processIngest(message);
                String loc = report.getReporterLocation() != null ? "\n📍 Location: " + report.getReporterLocation() : "";
                String unit = report.getRecommendedUnit() != null ? "\n🚨 Dispatch: " + report.getRecommendedUnit().replace("_", " ") : "";
                return formatTwiML("🚨 *SafetyNet Emergency Incident #" + report.getId() + " Logged!*\n\n" +
                        "⚠️ *Priority:* " + report.getUrgency() + "/10 (" + report.getCrimeType().replace("_", " ") + ")\n" +
                        "🛡️ *Danger Level:* " + report.getSeverity() + "/5" +
                        unit + loc + "\n\n" +
                        "Responders have been notified. Tap 📎 ➔ *Location* to send live GPS coordinates or photos.");
            } catch (Exception e) {
                log.error("Failed to auto-ingest emergency message: ", e);
            }
        }

        // Trigger guided session command
        if (body.equalsIgnoreCase("i wanna report") || body.equalsIgnoreCase("report") || body.equalsIgnoreCase("help")
                || body.equalsIgnoreCase("sos") || body.equalsIgnoreCase("hi") || body.equalsIgnoreCase("hello")) {
            WhatsAppSession session = new WhatsAppSession();
            session.setPhone(from);
            session.setState(WhatsAppSession.State.AWAITING_ANONYMITY);

            // Extract the citizen's real WhatsApp profile name & phone number directly from WhatsApp metadata
            String whatsappName = (message.getProfileName() != null && !message.getProfileName().isBlank())
                    ? message.getProfileName()
                    : "Citizen (" + cleanPhone + ")";
            session.setProfileName(whatsappName);
            session.setReporterName(whatsappName);
            session.setReporterContact(cleanPhone);

            log.info("Started WhatsApp reporting session for citizen: {} ({})", whatsappName, cleanPhone);

            sessions.put(from, session);
            return formatTwiML("🛡️ *SafetyNet Incident Response*\n\n" +
                    "Would you like to remain anonymous for this report?\n" +
                    "Reply *YES* or *NO*.\n\n_(Reply '9' to cancel)_");
        }

        // Check if there is an active session
        WhatsAppSession session = sessions.get(from);
        if (session == null) {
            return formatTwiML("🛡️ *SafetyNet Community Security*\n\n" +
                    "To report an incident, reply with what happened or send *REPORT* / *SOS*.");
        }

        // If a native WhatsApp location pin was attached at any point, capture it
        if (message.getLatitude() != null && message.getLongitude() != null &&
                !message.getLatitude().isBlank() && !message.getLongitude().isBlank()) {
            try {
                double lat = Double.parseDouble(message.getLatitude());
                double lng = Double.parseDouble(message.getLongitude());
                session.setLatitude(lat);
                session.setLongitude(lng);
                String realAddress = geocodingService.reverseGeocode(lat, lng);
                session.setReporterLocation(realAddress);
                log.info("Captured WhatsApp GPS pin: [{}, {}] -> {}", lat, lng, realAddress);
            } catch (Exception e) {
                log.warn("Failed to parse incoming location pin: {}", e.getMessage());
            }
        }

        // If a media attachment (photo/video) was included, capture it
        if (message.getMediaUrl0() != null && !message.getMediaUrl0().isBlank()) {
            session.setMediaUrl(message.getMediaUrl0());
            log.info("Captured incoming WhatsApp media attachment: {}", message.getMediaUrl0());
        }

        // State Machine
        switch (session.getState()) {
            case AWAITING_ANONYMITY:
                if (isAffirmative(body)) {
                    session.setIsAnonymous(true);
                    session.setState(WhatsAppSession.State.AWAITING_REPORT_DETAILS);
                    return formatTwiML("🔒 *Anonymity Enabled*\n" +
                            "All personal info is scrubbed.\n\n" +
                            "📝 *Describe what happened:*\n" +
                            "(Include suspect details, vehicles, or context)\n\n" +
                            "📍 *Share your location:* Tap 📎 / ➕ ➔ *Location* ➔ *Share Live Location* or *Send Current Location*.\n\n"
                            +
                            "_(Reply '9' to cancel)_");
                } else if (isNegative(body)) {
                    session.setIsAnonymous(false);
                    session.setState(WhatsAppSession.State.AWAITING_REPORT_DETAILS);

                    String name = session.getReporterName() != null ? session.getReporterName() : cleanPhone;
                    return formatTwiML("✅ *Verified Reporter Linked:*\n" +
                            "👤 *" + name + "*\n" +
                            "📞 *" + (session.getReporterContact() != null ? session.getReporterContact() : cleanPhone)
                            + "*\n\n" +
                            "📝 *Describe the incident context:*\n" +
                            "(What happened, suspects, weapons, vehicles?)\n\n" +
                            "📍 *Share your location:* Tap 📎 / ➕ ➔ *Location* ➔ *Share Live Location* or *Send Current Location*.\n\n"
                            +
                            "_(Reply '9' to cancel)_");
                } else {
                    return formatTwiML(
                            "Please reply *YES* (to stay anonymous) or *NO* (to report with your verified name).\n\n_(Reply '9' to cancel)_");
                }

            case AWAITING_REPORT_DETAILS:
                if (body.isEmpty() && session.getLatitude() == null) {
                    return formatTwiML(
                            "Please describe what is happening or tap 📎 ➔ *Location* to send your live location pin.\n\n_(Reply '9' to cancel)_");
                }

                // If no GPS pin was shared, try to geocode any address cues from text
                if (session.getLatitude() == null && !body.isEmpty()) {
                    try {
                        double[] coords = geocodingService.geocodeAddress(body);
                        session.setLatitude(coords[0]);
                        session.setLongitude(coords[1]);
                        if (session.getReporterLocation() == null) {
                            session.setReporterLocation(geocodingService.reverseGeocode(coords[0], coords[1]));
                        }
                    } catch (Exception e) {
                        log.warn("Could not geocode text address: {}", e.getMessage());
                    }
                }

                session.setDetails(body);
                session.setState(WhatsAppSession.State.AWAITING_IMAGES);
                return formatTwiML("📝 Details recorded.\n\n" +
                        "Do you have photos or videos to attach as evidence?\n" +
                        "Reply *YES* to send media, or *NO* to submit now.\n\n(Reply '9' to cancel)");

            case AWAITING_IMAGES:
                if (isAffirmative(body)) {
                    return formatTwiML("📸 Send your photos/videos now.\n\nWhen finished, reply *DONE* to submit.");
                } else if (isNegative(body) || body.equalsIgnoreCase("done") || body.equalsIgnoreCase("finish")) {
                    try {
                        IncidentReport report = processStatefulIngest(session);
                        sessions.remove(from);

                        String locSummary = report.getReporterLocation() != null
                                ? "\n📍 " + report.getReporterLocation()
                                : "";
                        return formatTwiML("✅ Incident Report #" + report.getId() + " logged!\n" +
                                "⚠️ Priority: " + report.getUrgency() + "/10 ("
                                + report.getCrimeType().replace("_", " ") + ")" +
                                locSummary + "\n\n" +
                                "Dispatched to community responder grid.\nStay safe. 🛡️");
                    } catch (Exception e) {
                        log.error("Error processing stateful incident report: ", e);
                        sessions.remove(from);
                        return formatTwiML(
                                "SafetyNet: Report received and emergency responders alerted. Stay safe. 🛡️");
                    }
                } else {
                    // Assume it's a media message
                    if (message.getMediaUrl0() != null && !message.getMediaUrl0().isBlank()) {
                        session.setMediaUrl(message.getMediaUrl0());
                    }
                    return formatTwiML("📸 Media attached to report. Send more, or reply *DONE* to submit.");
                }

            default:
                sessions.remove(from);
                return formatTwiML("Session expired. Reply *REPORT* to begin a new report.");
        }
    }

    private String formatTwiML(String message) {
        String escaped = message != null ? message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") : "";
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<Response><Message>" + escaped + "</Message></Response>";
    }

    @Transactional
    public IncidentReport processStatefulIngest(WhatsAppSession session) {
        log.info("Finalizing stateful WhatsApp ingest for phone: {}", session.getPhone());

        String detailsText = session.getDetails() != null ? session.getDetails()
                : "Incident reported via WhatsApp location share";
        String cleanText = session.getIsAnonymous() ? aiService.redactPII(detailsText) : detailsText;
        IncidentPatternDTO pattern = aiService.extractPattern(cleanText);
        Integer urgency = aiService.scoreUrgency(cleanText);

        Point location = null;
        if (session.getLatitude() != null && session.getLongitude() != null) {
            location = geometryFactory.createPoint(new Coordinate(session.getLongitude(), session.getLatitude()));
        }

        String phone = extractCleanPhone(session.getPhone());

        String visualAnalysis = null;
        if (session.getMediaUrl() != null && !session.getMediaUrl().isBlank()) {
            visualAnalysis = aiService.analyzeMediaEvidence(session.getMediaUrl(), cleanText);
        }

        IncidentReport report = IncidentReport.builder()
                .cleanText(cleanText)
                .crimeType(pattern.getCrimeType())
                .severity(pattern.getSeverity())
                .urgency(urgency)
                .location(location)
                .status("PROCESSED")
                .reporterName(session.getIsAnonymous() ? null : session.getReporterName())
                .reporterContact(session.getIsAnonymous() ? null
                        : (session.getReporterContact() != null ? session.getReporterContact() : phone))
                .reporterLocation(session.getIsAnonymous() ? null : session.getReporterLocation())
                .reporterGender(session.getIsAnonymous() ? null : "Not specified")
                .reporterAge(session.getIsAnonymous() ? null : 28)
                .whatsappNumber(session.getIsAnonymous() ? null : phone)
                .reporterPicture(session.getIsAnonymous() ? null : session.getProfilePic())
                .mediaUrl(session.getMediaUrl())
                .aiSummary(pattern.getAiSummary())
                .recommendedUnit(pattern.getRecommendedUnit())
                .tacticalBrief(pattern.getTacticalBrief())
                .visualAnalysis(visualAnalysis)
                .isAnonymous(session.getIsAnonymous())
                .build();

        IncidentReport savedReport = incidentReportRepository.save(report);
        log.info("Successfully persisted stateful incident #{}. Location: {}", savedReport.getId(),
                savedReport.getReporterLocation());

        broadcastIncident(savedReport);

        return savedReport;
    }

    private void broadcastIncident(IncidentReport report) {
        try {
            IncidentResponseDTO responseDTO = IncidentResponseDTO.builder()
                    .id(report.getId())
                    .cleanText(report.getCleanText())
                    .crimeType(report.getCrimeType())
                    .severity(report.getSeverity())
                    .urgency(report.getUrgency())
                    .latitude(report.getLocation() != null ? report.getLocation().getY() : null)
                    .longitude(report.getLocation() != null ? report.getLocation().getX() : null)
                    .reportedAt(report.getReportedAt())
                    .status(report.getStatus())
                    .reporterName(report.getReporterName())
                    .reporterContact(report.getReporterContact())
                    .whatsappNumber(report.getWhatsappNumber())
                    .reporterLocation(report.getReporterLocation())
                    .isAnonymous(report.getIsAnonymous())
                    .reporterGender(report.getReporterGender())
                    .reporterAge(report.getReporterAge())
                    .reporterPicture(report.getReporterPicture())
                    .mediaUrl(report.getMediaUrl())
                    .aiSummary(report.getAiSummary())
                    .recommendedUnit(report.getRecommendedUnit())
                    .tacticalBrief(report.getTacticalBrief())
                    .visualAnalysis(report.getVisualAnalysis())
                    .build();

            messagingTemplate.convertAndSend("/topic/incidents", responseDTO);
            log.info("Successfully broadcasted incident #{} via STOMP WebSockets to connected dashboards.",
                    report.getId());
        } catch (Exception e) {
            log.error("Failed to broadcast WebSocket event: ", e);
        }
    }

    private Optional<User> findUserByPhone(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank())
            return Optional.empty();

        String digitsOnly = rawPhone.replaceAll("[^0-9]", "");
        // Check exact match
        Optional<User> userOpt = userRepository.findByPhoneNumber(rawPhone);
        if (userOpt.isPresent())
            return userOpt;

        // Check without '+'
        userOpt = userRepository.findByPhoneNumber(digitsOnly);
        if (userOpt.isPresent())
            return userOpt;

        // Check local 0 format (e.g. 27821234567 -> 0821234567)
        if (digitsOnly.startsWith("27") && digitsOnly.length() == 11) {
            String localFormat = "0" + digitsOnly.substring(2);
            userOpt = userRepository.findByPhoneNumber(localFormat);
            if (userOpt.isPresent())
                return userOpt;
        }

        // Search user repository for phone substring matches
        return userRepository.findAll().stream()
                .filter(u -> u.getPhoneNumber() != null
                        && (u.getPhoneNumber().replaceAll("[^0-9]", "").contains(digitsOnly) ||
                                (digitsOnly.length() >= 9
                                        && digitsOnly.contains(u.getPhoneNumber().replaceAll("[^0-9]", "")))))
                .findFirst();
    }
}
