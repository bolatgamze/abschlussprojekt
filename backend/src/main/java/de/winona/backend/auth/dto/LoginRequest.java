package de.winona.backend.auth.dto;


import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message="Benutzername ist erforderlich.") String username,
        @NotBlank(message="Passwort ist erforderlich.") String password
) {}
