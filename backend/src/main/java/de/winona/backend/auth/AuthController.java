package de.winona.backend.auth;

import de.winona.backend.auth.dto.*;
import de.winona.backend.user.User;
import de.winona.backend.user.UserRepository;
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

    public AuthController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        // Normalisieren: alles klein
        String normalized = req.username().toLowerCase();

        if (users.existsByUsername(normalized)) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse("Benutzername ist bereits vergeben. Versuche deinen Nachnamen hinzuzufügen.", null, null));
        }

        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(normalized); // in DB klein gespeichert
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);

        // Aber nach außen immer GROSS zurückgeben
        return ResponseEntity.ok(new AuthResponse("Registrierung erfolgreich.", normalized.toUpperCase(), u.getId()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        String normalized = req.username().toLowerCase();

        var u = users.findByUsername(normalized).orElse(null);
        if (u == null || !encoder.matches(req.password(), u.getPasswordHash())) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse("Ungültige Zugangsdaten.", null, null));
        }

        return ResponseEntity.ok(new AuthResponse("Anmeldung erfolgreich.", u.getUsername().toUpperCase(), u.getId()));
    }

}
