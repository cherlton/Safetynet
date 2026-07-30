package com.safetynet.safetynet_api.dto;

import lombok.Data;

@Data
public class RegisterRequestDTO {
    private String username;
    private String email;
    private String password;
    private String phoneNumber;
    private String role;
    private String picture;
    private String googleSub;
}
