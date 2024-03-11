package com.chordanalyzr.api.repositories;

import com.chordanalyzr.api.entities.ModeScaleChordRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ModeScaleChordRelationRepository extends JpaRepository<ModeScaleChordRelation, Long> {

    @Query("""
            SELECT m
            FROM  com.chordanalyzr.api.entities.ModeScaleChordRelation m
            WHERE m.mode = :mode AND
                  m.keyName = :keyName AND
                  m.modeChordNoteDiffCount <= :modeChordNoteDiffMaxCount
      """)
    List<ModeScaleChordRelation> getChordsByModeKeyAndDiffCount(
            String mode,
            String keyName,
            Integer modeChordNoteDiffMaxCount
    );

    @Query("""
            SELECT m
            FROM  com.chordanalyzr.api.entities.ModeScaleChordRelation m
            WHERE m.mode = :mode AND
                  m.keyName = :keyName AND
                  m.modeChordNoteDiffCount = 0
      """)
    List<ModeScaleChordRelation> getChordsByModeKey(
            String mode,
            String keyName
    );
}
