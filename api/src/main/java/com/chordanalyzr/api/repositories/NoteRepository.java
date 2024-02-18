package com.chordanalyzr.api.repositories;

import com.chordanalyzr.api.entities.Note;
import com.chordanalyzr.api.entities.ScaleNoteDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {

    @Query(
        value = """
            SELECT 
                seq_note AS "seqNote", 
                note_name AS "noteName"
            FROM mode_scale_note_letter_view 
            WHERE
                mode = :mode AND
                key_name ilike :keyName
            ORDER BY seq_note asc;    
        """,
        nativeQuery = true
    )
    List<ScaleNoteDto> getScaleNotes(
            String mode,
            String keyName
    );
}
