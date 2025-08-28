package de.winona.backend.controller;

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

        // 🔹 Letzte Spiele
        var recentGames = sessions.findTop5ByUserIdOrderByFinishedAtDesc(userId);

        // 🔹 Bestleistungen
        var bestScores = sessions.findBestScoresByUser(userId);

        // 🔹 Statistik
        Object[] statsRow = sessions.findStatsByUser(userId);
        long total = ((Number) statsRow[0]).longValue();
        double avg = statsRow[1] != null ? ((Number) statsRow[1]).doubleValue() : 0.0;

        var topThemeList = sessions.findTopThemeByUser(userId);
        String topTheme = topThemeList.isEmpty() ? "—" : topThemeList.get(0)[0].toString();

        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "recentGames", recentGames,
                "bestScores", bestScores,
                "stats", Map.of(
                        "total", total,
                        "avg", avg,
                        "topTheme", topTheme
                )
        );
    }
}
