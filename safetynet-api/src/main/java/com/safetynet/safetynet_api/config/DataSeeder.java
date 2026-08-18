package com.safetynet.safetynet_api.config;

import com.safetynet.safetynet_api.entity.IncidentReport;
import com.safetynet.safetynet_api.repository.IncidentReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final IncidentReportRepository incidentReportRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Override
    public void run(String... args) throws Exception {
        if (incidentReportRepository.count() == 0) {
            log.info("Seeding initial demo incidents into H2 database...");

            IncidentReport inc1 = IncidentReport.builder()
                    .cleanText("[REDACTED] cable theft happening at municipal depot, 3 men cutting copper power lines behind building.")
                    .crimeType("CABLE_THEFT")
                    .severity(4)
                    .urgency(8)
                    .location(geometryFactory.createPoint(new Coordinate(28.0473, -26.2041)))
                    .reportedAt(LocalDateTime.now().minusMinutes(25))
                    .status("PROCESSED")
                    .reporterName("Sipho Khumalo")
                    .reporterContact("+27835559876")
                    .whatsappNumber("+27835559876")
                    .reporterLocation("Municipal Depot, Main Rd")
                    .isAnonymous(false)
                    .aiSummary("3 suspects targeting copper distribution infrastructure.")
                    .recommendedUnit("CPF_PATROL_UNIT_4")
                    .tacticalBrief("Priority 8/10: Dispatch patrol to rear perimeter of depot immediately.")
                    .build();

            IncidentReport inc2 = IncidentReport.builder()
                    .cleanText("Armed robbery at Engen service station on main road. 3 armed suspects, shots fired.")
                    .crimeType("ARMED_ROBBERY")
                    .severity(5)
                    .urgency(10)
                    .location(geometryFactory.createPoint(new Coordinate(28.0550, -26.2100)))
                    .reportedAt(LocalDateTime.now().minusMinutes(10))
                    .status("PROCESSED")
                    .reporterName("Anonymous Citizen")
                    .reporterContact(null)
                    .whatsappNumber(null)
                    .reporterLocation("Engen Main Rd")
                    .isAnonymous(true)
                    .aiSummary("High urgency armed robbery with discharged firearms.")
                    .recommendedUnit("SAPS_RAPID_RESPONSE")
                    .tacticalBrief("Priority 10/10: Armed escalation. Require immediate SAPS & medical backup.")
                    .build();

            incidentReportRepository.save(inc1);
            incidentReportRepository.save(inc2);
            log.info("Seeded 2 initial demo incident records successfully.");
        }
    }
}
