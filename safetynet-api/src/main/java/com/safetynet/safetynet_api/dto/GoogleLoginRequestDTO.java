package com.safetynet.safetynet_api.dto;

import lombok.Data;

@Data
public class GoogleLoginRequestDTO {
    private String email;
    private String name;
    private String picture;
    private String googleSub;
    private String token;
}
