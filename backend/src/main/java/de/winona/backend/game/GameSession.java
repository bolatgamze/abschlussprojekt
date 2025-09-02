package de.winona.backend.game;

import com.fasterxml.jackson.databind.JsonNode;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import org.hibernate.annotations.Type;
import de.winona.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ap_game_session")
@Getter
@Setter
@NoArgsConstructor
public class GameSession {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // Gast: null lassen

    @Column(name = "game_type", length = 50, nullable = false)
    private String gameType;   // Enum → String

    @Column(name = "player_theme", length = 50, nullable = false)
    private String playerTheme;  // Enum → String

    private Instant startedAt = Instant.now();
    private Instant finishedAt;
    private Integer score;

    @Type(value = JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private JsonNode metadata;
}
