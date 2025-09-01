package de.winona.backend.controller;

import de.winona.backend.auth.dto.GameSessionDTO;
import de.winona.backend.game.GameSessionRepository;
import de.winona.backend.user.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository users;
    private final GameSessionRepository sessions;

    public ProfileController(UserRepository users, GameSessionRepository sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    @GetMapping("/{userId}")
    public Map<String,Object> getProfile(@PathVariable UUID userId) {
        var user = users.findById(userId).orElseThrow();

        // Letzte Spiele (als DTOs zurückgeben)
        var recentGames = sessions.findTop5ByUser_IdOrderByStartedAtDesc(userId)
                .stream()
                .map(g -> new GameSessionDTO(
                        g.getId(),
                        g.getGameType(),
                        g.getPlayerTheme(),
                        g.getStartedAt(),
                        g.getFinishedAt(),
                        g.getScore()
                ))

                .toList();

        // Bestleistungen (gameType + maxScore)
        var bestScores = sessions.findBestScoresByUser(userId);

        // Statistik (total)
        long total = 0;
        var statsList = sessions.findStatsByUser(userId);
        if (!statsList.isEmpty()) {
            Object[] statsRow = statsList.get(0);
            total = ((Number) statsRow[0]).longValue();
        }

        // Lieblings-Charakter
        String topTheme = "—";
        var topThemeList = sessions.findTopThemeByUser(userId);
        if (!topThemeList.isEmpty()) {
            topTheme = topThemeList.get(0)[0].toString();
        }

        // Durchschnitt pro Spieltyp
        var avgScoresRaw = sessions.findAverageScoresByUser(userId);
        Map<String, Double> avgScores = new HashMap<>();
        for (Object[] row : avgScoresRaw) {
            avgScores.put(row[0].toString(), ((Number) row[1]).doubleValue());
        }

        // JSON-Response
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "recentGames", recentGames,
                "bestScores", bestScores,
                "stats", Map.of(
                        "total", total,
                        "topTheme", topTheme,
                        "avgScores", avgScores
                )
        );
    }
}
