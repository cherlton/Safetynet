package com.safetynet.safetynet_api.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class IncidentResponseDTO {
    private Long id;
    private String cleanText;
    private String crimeType;
    private Integer severity;
    private Integer urgency;
    private Double latitude;
    private Double longitude;
    private LocalDateTime reportedAt;
    private String status;
    private String reporterName;
    private String reporterContact;
    private String whatsappNumber;
    private String reporterLocation;
    private Boolean isAnonymous;
    private String reporterGender;
    private Integer reporterAge;

}
