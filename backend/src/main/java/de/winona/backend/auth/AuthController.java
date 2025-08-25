package de.winona.backend.auth;


import de.winona.backend.auth.dto.*;
        import de.winona.backend.user.User;
import de.winona.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

        import java.util.UUID;

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
        if (users.existsByUsername(req.username())) {
            return ResponseEntity.badRequest()
                    .body(new AuthResponse("Benutzername ist bereits vergeben.", null));
        }
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(req.username());
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        return ResponseEntity.ok(new AuthResponse("Registrierung erfolgreich.", u.getUsername()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        var u = users.findByUsername(req.username()).orElse(null);
        if (u == null || !encoder.matches(req.password(), u.getPasswordHash())) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse("Ungültige Zugangsdaten.", null));
        }
        // später: JWT hinzufügen
        return ResponseEntity.ok(new AuthResponse("Anmeldung erfolgreich.", u.getUsername()));
    }
}
