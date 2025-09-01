package de.winona.backend.auth.dto;

import java.time.Instant;
import java.util.UUID;

// DTO für ein einzelnes Spiel (für Profilansicht)
// Enum-Werte werden als String gespeichert (z.B. "WORD", "SIMBA")
public record GameSessionDTO(
        UUID id,
        String gameType,
        String playerTheme,
        Instant startedAt,
        Instant finishedAt,
        Integer score
) {}
