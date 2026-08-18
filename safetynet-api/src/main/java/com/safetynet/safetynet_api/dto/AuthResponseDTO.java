package com.safetynet.safetynet_api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponseDTO {
    private boolean registered;
    private String username;
    private String email;
    private String role;
    private String picture;
    private String token;
    private String message;
}
