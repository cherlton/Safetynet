package com.safetynet.safetynet_api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class WhatsAppMessageDTO {
    @JsonProperty("From")
    private String from;

    @JsonProperty("To")
    private String to;

    @JsonProperty("Body")
    private String body;

    @JsonProperty("Latitude")
    private String latitude;

    @JsonProperty("Longitude")
    private String longitude;

    @JsonProperty("Address")
    private String address;

    @JsonProperty("Label")
    private String label;

    @JsonProperty("ProfileName")
    private String profileName;

    @JsonProperty("MediaUrl0")
    private String mediaUrl0;
}
