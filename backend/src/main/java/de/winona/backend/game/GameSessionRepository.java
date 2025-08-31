package de.winona.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.*;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {

    // letzte 5 Spiele eines Users
    List<GameSession> findTop5ByUser_IdOrderByFinishedAtDesc(UUID userId);

    // Bestleistungen pro Spieltyp
    @Query("SELECT g.gameType as gameType, MAX(g.score) as maxScore " +
            "FROM GameSession g WHERE g.user.id = :userId GROUP BY g.gameType")
    List<Map<String,Object>> findBestScoresByUser(UUID userId);

    // Statistik (COUNT, AVG)
    @Query("SELECT COUNT(g), AVG(g.score) FROM GameSession g WHERE g.user.id = :userId")
    List<Object[]> findStatsByUser(UUID userId);

    // meistgespieltes Thema
    @Query("SELECT g.playerTheme, COUNT(g) FROM GameSession g WHERE g.user.id = :userId " +
            "GROUP BY g.playerTheme ORDER BY COUNT(g) DESC")
    List<Object[]> findTopThemeByUser(UUID userId);

    // Leaderboard (Top 10)
    @Query(value = """
    SELECT u.username, g.score
    FROM ap_game_session g
    JOIN ap_user u ON g.user_id = u.id
    WHERE g.game_type = :gameType
      AND g.player_theme = :playerTheme
      AND g.score IS NOT NULL
    ORDER BY g.score DESC
    LIMIT 10
""", nativeQuery = true)
    List<Object[]> findTop10ByGameAndTheme(String gameType, String playerTheme);


    @Query("SELECT g.gameType, AVG(g.score) " +
            "FROM GameSession g " +
            "WHERE g.user.id = :userId " +
            "AND g.score IS NOT NULL " +
            "GROUP BY g.gameType")
    List<Object[]> findAverageScoresByUser(UUID userId);

}
