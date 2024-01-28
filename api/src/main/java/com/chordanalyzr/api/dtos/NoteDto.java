package com.chordanalyzr.api.dtos;

import com.chordanalyzr.api.entities.Note;

public class NoteDto {
    public NoteDto(){}

    public NoteDto(Note note) {
        this.id = note.getId();
        this.name = note.getName();
    }

    private Long id;
    private String name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
