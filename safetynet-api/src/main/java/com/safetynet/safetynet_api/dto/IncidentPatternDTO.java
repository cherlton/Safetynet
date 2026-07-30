package com.safetynet.safetynet_api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class IncidentPatternDTO {
    @JsonProperty("crime_type")
    private String crimeType;

    @JsonProperty("infrastructure_target")
    private String infrastructureTarget;

    private Integer severity; // 1-5

    private List<String> keywords;

    @JsonProperty("estimated_time")
    private String estimatedTime;
}
