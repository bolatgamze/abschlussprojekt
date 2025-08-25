package de.winona.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message="Benutzername ist erforderlich.")
        @Size(min=3, max=50, message="Benutzername muss zwischen 3 und 50 Zeichen lang sein.")
        String username,
        @NotBlank(message="Passwort ist erforderlich.")
        @Size(min=6, max=100, message="Passwort muss zwischen 6 und 100 Zeichen lang sein.")
        String password
) {}
