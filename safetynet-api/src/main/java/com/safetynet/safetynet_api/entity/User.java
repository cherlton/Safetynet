package com.safetynet.safetynet_api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "passwordHash")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true)
    private String email;

    private String passwordHash;

    private String phoneNumber;

    private String role; // e.g. "CPF", "SECURITY"

    private String picture; // Avatar URL

    private String googleSub; // Google's unique subject ID (optional)

    @CreationTimestamp
    private LocalDateTime createdAt;
}
