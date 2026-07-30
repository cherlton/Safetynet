package com.safetynet.safetynet_api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentReportDetailsDTO {
    private String reporterGender;
    private Integer reporterAge;
    private boolean isAnonymous;
    private String reporterName;
    private String reporterContact;
    private String reporterLocation;
    private String cleanText;
}
