package com.safetynet.safetynet_api.controller;

import com.safetynet.safetynet_api.dto.IncidentResponseDTO;
import com.safetynet.safetynet_api.entity.IncidentReport;
import com.safetynet.safetynet_api.repository.IncidentReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Permits local Vite frontend requests
@Slf4j
public class IncidentController {

    private final IncidentReportRepository incidentReportRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * Lists all processed anonymized incidents globally.
     */
    @GetMapping
    public ResponseEntity<List<IncidentResponseDTO>> getAllIncidents() {
        log.info("Fetching all anonymized incident records.");
        List<IncidentReport> reports = incidentReportRepository.findAll();
        List<IncidentResponseDTO> response = reports.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Finds active threats within a specific meter radius of coordinates.
     * Example: GET /api/incidents/nearby?lat=-26.2041&lng=28.0473&radius=5000
     */
    @GetMapping("/nearby")
    public ResponseEntity<List<IncidentResponseDTO>> getNearbyIncidents(
            @RequestParam("lat") double lat,
            @RequestParam("lng") double lng,
            @RequestParam(value = "radius", defaultValue = "5000") double radiusInMeters) {

        log.info("Filtering threat dashboard: location=({}, {}), radius={}m", lat, lng, radiusInMeters);

        // JTS maps Longitude (X) and Latitude (Y)
        Point centerPoint = geometryFactory.createPoint(new Coordinate(lng, lat));

        List<IncidentReport> reports = incidentReportRepository.findIncidentsWithinRadius(centerPoint, radiusInMeters);
        
        List<IncidentResponseDTO> response = reports.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Maps persistence JPA entity to serializable schema.
     */
    private IncidentResponseDTO mapToResponseDTO(IncidentReport report) {
        return IncidentResponseDTO.builder()
                .id(report.getId())
                .cleanText(report.getCleanText())
                .crimeType(report.getCrimeType())
                .severity(report.getSeverity())
                .urgency(report.getUrgency())
                .latitude(report.getLocation() != null ? report.getLocation().getY() : null) // Lat is Y
                .longitude(report.getLocation() != null ? report.getLocation().getX() : null) // Lng is X
                .reportedAt(report.getReportedAt())
                .status(report.getStatus())
                .reporterName(report.getReporterName())
                .reporterContact(report.getReporterContact())
                .whatsappNumber(report.getWhatsappNumber())
                .reporterLocation(report.getReporterLocation())
                .isAnonymous(report.getIsAnonymous())
                .build();
    }
}
