package de.winona.backend.game;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.winona.backend.user.User;
import de.winona.backend.user.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

record StartSessionReq(String userId, String gameType, String playerTheme) {}
record StartSessionRes(UUID sessionId, String message) {}
record FinishReq(Integer score, Map<String, Object> metadata) {}

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final GameSessionRepository sessions;
    private final UserRepository users;
    private final ObjectMapper mapper;

    public GameController(GameSessionRepository sessions, UserRepository users, ObjectMapper mapper) {
        this.sessions = sessions;
        this.users = users;
        this.mapper = mapper;
    }

    @PostMapping("/session")
    public StartSessionRes start(@RequestBody StartSessionReq req) {
        GameSession gs = new GameSession();
        gs.setGameType(GameType.valueOf(req.gameType().toUpperCase()));
        gs.setPlayerTheme(PlayerTheme.valueOf(req.playerTheme().toUpperCase()));

        if (req.userId() != null && !req.userId().isBlank()) {
            try {
                UUID uid = UUID.fromString(req.userId());
                users.findById(uid).ifPresent(gs::setUser);
                System.out.println("🎮 Start game for user=" + uid);
            } catch (IllegalArgumentException e) {
                System.err.println("⚠️ Ungültige userId: " + req.userId());
            }
        }

        sessions.save(gs);
        return new StartSessionRes(gs.getId(), "Spielrunde gestartet.");
    }


    @PostMapping("/session/{id}/finish")
    public Map<String, String> finish(@PathVariable UUID id, @RequestBody FinishReq req) {
        var gs = sessions.findById(id).orElseThrow();
        gs.setScore(req.score());
        gs.setFinishedAt(Instant.now());

        // 🔹 Metadata sicher speichern
        if (req.metadata() != null) {
            try {
                JsonNode json = mapper.valueToTree(req.metadata());
                gs.setMetadata(json);
            } catch (IllegalArgumentException e) {
                System.err.println("⚠️ Metadata parse error: " + e.getMessage());
                gs.setMetadata(mapper.createObjectNode()); // fallback: leeres JSON
            }
        }

        sessions.save(gs);
        System.out.println("✅ Session finished: " + id + " Score=" + req.score());
        return Map.of("message", "Ergebnis gespeichert.");
    }

    @GetMapping("/leaderboard")
    public List<Map<String, Object>> leaderboard(@RequestParam String gameType,
                                                 @RequestParam String playerTheme) {
        var rows = sessions.findTop10ByGameAndTheme(gameType, playerTheme);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            String username = (String) row[0];
            Integer score = (Integer) row[1];
            result.add(Map.of(
                    "username", (username != null && !username.isBlank()) ? username : "Gast",
                    "score", score
            ));
        }
        return result;
    }
}
