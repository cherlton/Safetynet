package com.safetynet.safetynet_api.dto;

import lombok.Data;

@Data
public class WhatsAppSession {
    public enum State {
        AWAITING_ANONYMITY,
        AWAITING_LOCATION_OR_DETAILS,
        AWAITING_REPORT_DETAILS,
        AWAITING_IMAGES
    }

    private String phone;
    private State state;
    private Boolean isAnonymous;
    private String details;
    private String reporterName;
    private String reporterContact;
    private String reporterLocation;
    private Double latitude;
    private Double longitude;
    private String profilePic;
    private String profileName;
    private String mediaUrl;
}
