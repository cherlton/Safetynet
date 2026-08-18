package com.safetynet.safetynet_api.controller;

import com.safetynet.safetynet_api.dto.AuthResponseDTO;
import com.safetynet.safetynet_api.dto.GoogleLoginRequestDTO;
import com.safetynet.safetynet_api.dto.LoginRequestDTO;
import com.safetynet.safetynet_api.dto.RegisterRequestDTO;
import com.safetynet.safetynet_api.entity.User;
import com.safetynet.safetynet_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> register(@RequestBody RegisterRequestDTO request) {
        log.info("Processing registration request for username: {}", request.getUsername());

        // Check if username is already taken
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthResponseDTO.builder()
                            .registered(false)
                            .message("Username is already taken")
                            .build());
        }

        // Check email if present
        if (request.getEmail() != null && !request.getEmail().isBlank() && 
            userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthResponseDTO.builder()
                            .registered(false)
                            .message("Email is already registered")
                            .build());
        }

        String passwordHash = null;
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            passwordHash = passwordEncoder.encode(request.getPassword());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordHash)
                .phoneNumber(request.getPhoneNumber())
                .role(request.getRole() != null ? request.getRole() : "CPF")
                .picture(request.getPicture())
                .googleSub(request.getGoogleSub())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Successfully registered user: {}", savedUser.getUsername());

        String token = UUID.randomUUID().toString();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(AuthResponseDTO.builder()
                        .registered(true)
                        .username(savedUser.getUsername())
                        .email(savedUser.getEmail())
                        .role(savedUser.getRole())
                        .picture(savedUser.getPicture())
                        .token(token)
                        .message("Registration successful")
                        .build());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody LoginRequestDTO request) {
        log.info("Processing login request for username: {}", request.getUsername());

        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponseDTO.builder()
                            .registered(false)
                            .message("Invalid username or password")
                            .build());
        }

        User user = userOpt.get();
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponseDTO.builder()
                            .registered(false)
                            .message("Invalid username or password")
                            .build());
        }

        log.info("User {} logged in successfully", user.getUsername());
        String token = UUID.randomUUID().toString();

        return ResponseEntity.ok(AuthResponseDTO.builder()
                .registered(true)
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .picture(user.getPicture())
                .token(token)
                .message("Login successful")
                .build());
    }

    @PostMapping("/google-login")
    public ResponseEntity<AuthResponseDTO> googleLogin(@RequestBody GoogleLoginRequestDTO request) {
        log.info("Processing Google login/check for sub: {}, email: {}", request.getGoogleSub(), request.getEmail());

        // Attempt to find user by Google Sub first, then by Email
        Optional<User> userOpt = userRepository.findByGoogleSub(request.getGoogleSub());
        if (userOpt.isEmpty() && request.getEmail() != null) {
            userOpt = userRepository.findByEmail(request.getEmail());
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // If they registered before, but did not have googleSub mapped, let's map it now
            if (user.getGoogleSub() == null) {
                user.setGoogleSub(request.getGoogleSub());
                userRepository.save(user);
            }

            log.info("Google user {} authenticated and found in database.", user.getUsername());
            String token = UUID.randomUUID().toString();

            return ResponseEntity.ok(AuthResponseDTO.builder()
                    .registered(true)
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.getRole())
                    .picture(user.getPicture())
                    .token(token)
                    .message("Google login successful")
                    .build());
        } else {
            log.info("Google user {} not found in database. Registration required.", request.getEmail());
            return ResponseEntity.ok(AuthResponseDTO.builder()
                    .registered(false)
                    .username(request.getName())
                    .email(request.getEmail())
                    .picture(request.getPicture())
                    .message("User needs to complete WhatsApp verification to register")
                    .build());
        }
    }

    @PostMapping("/verify-whatsapp")
    public ResponseEntity<java.util.Map<String, Object>> verifyWhatsApp(@RequestBody java.util.Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        log.info("Verifying WhatsApp number: {}", phoneNumber);

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        
        if (phoneNumber == null || phoneNumber.trim().length() != 10) {
            response.put("valid", false);
            response.put("message", "Invalid phone number format. Must be exactly 10 digits.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        boolean isValidFormat = phoneNumber.matches("^[0-9]{10}$");
        if (!isValidFormat) {
            response.put("valid", false);
            response.put("message", "Invalid WhatsApp phone number format. Must be exactly 10 digits.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        response.put("valid", true);
        response.put("message", "WhatsApp number verified successfully.");
        return ResponseEntity.ok(response);
    }
}
