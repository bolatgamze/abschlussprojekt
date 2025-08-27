package de.winona.backend.game;

import org.springframework.web.bind.annotation.*;
import java.util.*;

record StartSessionReq(String gameType, String playerTheme) {}
record StartSessionRes(String sessionId, String message) {}
record FinishReq(Integer score, Map<String, Object> metadata) {}

@RestController
@RequestMapping("/api/game")
public class GameController {

    @PostMapping("/session")
    public StartSessionRes start(@RequestBody StartSessionReq req) {
        // später: GameSession speichern (User optional)
        return new StartSessionRes(UUID.randomUUID().toString(), "Spielrunde gestartet.");
    }

    @PostMapping("/session/{id}/finish")
    public Map<String,String> finish(@PathVariable String id, @RequestBody FinishReq req) {
        // später: score + metadata speichern
        return Map.of("message", "Ergebnis gespeichert.");
    }

    @GetMapping("/leaderboard")
    public List<Map<String,Object>> leaderboard(@RequestParam String gameType,
                                                @RequestParam String playerTheme) {
        // später: Top-10 aus DB
        return List.of();
    }
}
