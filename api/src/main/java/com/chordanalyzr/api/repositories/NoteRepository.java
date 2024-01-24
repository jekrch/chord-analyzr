package com.chordanalyzr.api.repositories;

import com.chordanalyzr.api.entities.Note;
import org.springframework.data.jpa.repository.JpaRepository;

interface NoteRepository extends JpaRepository<Note, Long> {
}
