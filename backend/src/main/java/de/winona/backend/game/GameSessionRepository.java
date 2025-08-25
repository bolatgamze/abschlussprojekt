package de.winona.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.*;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {

    List<GameSession> findTop5ByUserIdOrderByFinishedAtDesc(UUID userId);

    @Query("SELECT g.gameType as gameType, MAX(g.score) as maxScore " +
            "FROM GameSession g WHERE g.user.id = :userId GROUP BY g.gameType")
    List<Map<String,Object>> findBestScoresByUser(UUID userId);

    @Query("SELECT COUNT(g), AVG(g.score) FROM GameSession g WHERE g.user.id = :userId")
    Object[] findStatsByUser(UUID userId);

    @Query("SELECT g.playerTheme, COUNT(g) FROM GameSession g WHERE g.user.id = :userId " +
            "GROUP BY g.playerTheme ORDER BY COUNT(g) DESC")
    List<Object[]> findTopThemeByUser(UUID userId);
}
