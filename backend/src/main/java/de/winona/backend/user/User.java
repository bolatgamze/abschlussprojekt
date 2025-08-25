package de.winona.backend.user;


import jakarta.persistence.*;
        import lombok.*;
        import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="ap_user")
@Getter @Setter @NoArgsConstructor
public class User {
    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable=false, unique=true, length=50)
    private String username;

    @Column(name="password_hash", nullable=false)
    private String passwordHash;

    @Column(nullable=false)
    private String role = "USER";

    @Column(name="created_at", nullable=false)
    private Instant createdAt = Instant.now();
}
