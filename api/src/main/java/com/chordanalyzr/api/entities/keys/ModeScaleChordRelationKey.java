package com.chordanalyzr.api.entities.keys;

import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public class ModeScaleChordRelationKey implements Serializable {

    private Long modeId;
    private Long chordTypeId;
    private Integer chordNote;
    private Integer keyNote;

    public Long getModeId() {
        return modeId;
    }

    public void setModeId(Long modeId) {
        this.modeId = modeId;
    }

    public Long getChordTypeId() {
        return chordTypeId;
    }

    public void setChordTypeId(Long chordTypeId) {
        this.chordTypeId = chordTypeId;
    }

    public Integer getChordNote() {
        return chordNote;
    }

    public void setChordNote(Integer chordNote) {
        this.chordNote = chordNote;
    }

    public Integer getKeyNote() {
        return keyNote;
    }

    public void setKeyNote(Integer keyNote) {
        this.keyNote = keyNote;
    }

}
