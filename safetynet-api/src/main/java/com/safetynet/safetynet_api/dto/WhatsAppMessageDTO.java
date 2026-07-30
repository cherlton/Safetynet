package com.safetynet.safetynet_api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class WhatsAppMessageDTO {
    @JsonProperty("From")
    private String from;

    @JsonProperty("Body")
    private String body;

    @JsonProperty("Latitude")
    private String latitude;

    @JsonProperty("Longitude")
    private String longitude;
}
