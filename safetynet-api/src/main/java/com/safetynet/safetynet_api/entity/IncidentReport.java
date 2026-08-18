package com.safetynet.safetynet_api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.locationtech.jts.geom.Point;
import java.time.LocalDateTime;

@Entity
@Table(name = "incident_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncidentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String cleanText; // The anonymized report from AI

    private String crimeType;
    private Integer severity; // 1-5
    private Integer urgency; // 1-10

    // This stores the longitude and latitude for the heatmap
    @Column
    private Point location;

    @CreationTimestamp
    private LocalDateTime reportedAt;

    private String status; // e.g., "PENDING", "PROCESSED"

    private String reporterName;
    private String reporterContact;
    private String whatsappNumber;
    private String reporterLocation;
    private Boolean isAnonymous;
    private String reporterGender;
    private Integer reporterAge;
    private String reporterPicture;
    private String mediaUrl;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    private String recommendedUnit;

    @Column(columnDefinition = "TEXT")
    private String tacticalBrief;

    @Column(columnDefinition = "TEXT")
    private String visualAnalysis;
}
