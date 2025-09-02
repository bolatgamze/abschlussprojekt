package de.winona.backend.game;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {

    // letzte 5 Spiele eines Users (egal ob fertig oder nicht)
    List<GameSession> findTop5ByUser_IdOrderByStartedAtDesc(UUID userId);

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

    @Query("""
    select u.username, max(gs.score)
    from GameSession gs
    left join gs.user u
    where gs.gameType = :gameType
    and gs.finishedAt is not null
    group by u.username
    order by max(gs.score) desc
""")
    List<Object[]> findTop10ByGame(@Param("gameType") String gameType);



    @Query("SELECT g.gameType, AVG(g.score) " +
            "FROM GameSession g " +
            "WHERE g.user.id = :userId " +
            "AND g.score IS NOT NULL " +
            "GROUP BY g.gameType")
    List<Object[]> findAverageScoresByUser(UUID userId);

}
