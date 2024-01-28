package com.chordanalyzr.api.dtos;

import com.chordanalyzr.api.entities.Mode;

public class ModeDto {
    public ModeDto(){}

    public ModeDto(Mode mode) {
        this.id = mode.getId();
        this.name = mode.getName();
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
