package com.chordanalyzr.api.repositories;

import com.chordanalyzr.api.entities.ModeScaleChordRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ModeScaleChordRelationRepository extends JpaRepository<ModeScaleChordRelation, Long> {

    @Query("""
            SELECT m
            FROM  com.chordanalyzr.api.entities.ModeScaleChordRelation m
            WHERE m.mode LIKE :mode AND
                  m.keyName = :keyName AND
                  m.chordNoteName = :chordNoteName AND
                  m.modeChordNoteDiffCount <= :modeChordNoteDiffCount
      """)
    List<ModeScaleChordRelation> getChordsByValue(
            String mode,
            String keyName,
            String chordNoteName,
            Integer modeChordNoteDiffCount
    );

}
