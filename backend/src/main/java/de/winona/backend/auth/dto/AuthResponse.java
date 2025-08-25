package de.winona.backend.auth.dto;

import java.util.UUID;

public record AuthResponse(
        String message,
        String username,
        UUID userId
) {}
