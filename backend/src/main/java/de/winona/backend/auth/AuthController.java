package de.winona.backend.auth;

import de.winona.backend.auth.dto.*;
import de.winona.backend.user.User;
import de.winona.backend.user.UserRepository;
import de.winona.backend.game.GameSessionRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final GameSessionRepository gameSessionRepo;

    public AuthController(UserRepository users, PasswordEncoder encoder, GameSessionRepository gameSessionRepo) {
        this.users = users;
        this.encoder = encoder;
        this.gameSessionRepo = gameSessionRepo;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        if (users.existsByUsername(req.username())) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse("Benutzername ist bereits vergeben.", null, null));
        }
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(req.username());
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        return ResponseEntity.ok(new AuthResponse("Registrierung erfolgreich.", u.getUsername(), u.getId()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        var u = users.findByUsername(req.username()).orElse(null);
        if (u == null || !encoder.matches(req.password(), u.getPasswordHash())) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse("Ungültige Zugangsdaten.", null, null));
        }
        // später: JWT hinzufügen
        return ResponseEntity.ok(new AuthResponse("Anmeldung erfolgreich.", u.getUsername(), u.getId()));
    }

    @GetMapping("/profile/{userId}")
    public Map<String, Object> profile(@PathVariable UUID userId) {
        var sessions = gameSessionRepo.findTop5ByUserIdOrderByFinishedAtDesc(userId);
        var bestScores = gameSessionRepo.findBestScoresByUser(userId);
        var statsRaw = gameSessionRepo.findStatsByUser(userId);
        var themeRaw = gameSessionRepo.findTopThemeByUser(userId);

        Map<String, Object> stats = new HashMap<>();
        if (statsRaw != null) {
            stats.put("total", statsRaw[0]);
            stats.put("avg", statsRaw[1]);
        }
        if (!themeRaw.isEmpty()) {
            stats.put("topTheme", themeRaw.get(0)[0]);
        }

        return Map.of(
                "recentGames", sessions,
                "bestScores", bestScores,
                "stats", stats
        );
    }
}
