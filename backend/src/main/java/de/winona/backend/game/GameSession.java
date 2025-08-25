package de.winona.backend.game;


import de.winona.backend.user.User;
import jakarta.persistence.*;
        import lombok.*;
        import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="ap_game_session")
@Getter @Setter @NoArgsConstructor
public class GameSession {
    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="user_id")
    private User user; // Gast: null lassen

    @Enumerated(EnumType.STRING)
    private GameType gameType;

    @Enumerated(EnumType.STRING)
    private PlayerTheme playerTheme;

    private Instant startedAt = Instant.now();
    private Instant finishedAt;
    private Integer score;

    @Column(columnDefinition="jsonb")
    private String metadata; // raw JSON (String), z.B. {"result":"WIN"}
}
