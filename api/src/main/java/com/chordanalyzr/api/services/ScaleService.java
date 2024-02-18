package com.chordanalyzr.api.services;

import com.chordanalyzr.api.entities.ScaleNoteDto;
import com.chordanalyzr.api.repositories.NoteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ScaleService {

    private NoteRepository noteRepository;

    public ScaleService(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    public List<ScaleNoteDto> getScale(String mode, String key){
        return this.noteRepository.getScaleNotes(mode, key);
    }
}
