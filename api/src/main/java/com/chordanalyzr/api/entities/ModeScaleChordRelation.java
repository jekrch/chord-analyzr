package com.chordanalyzr.api.entities;


import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

//@Entity(name = "mode_scale_chord_relation_view")
//@Immutable
public class ModeScaleChordRelation {

//    @Id
//    @Column(name = "id")
//    private Long id;

    @Column(name = "mode_id")
    private Long modeId;

    @Column(name = "mode")
    private String mode;

    @Column(name = "key_note")
    private Integer keyNote;

    @Column(name = "key_namea")
    private String keyName;

    @Column(name = "chord_note")
    private Integer chordNote;

    @Column(name = "chord_note_name")
    private String chordNoteName;

    @Column(name = "chord_type_id")
    private Long chordTypeId;

    @Column(name = "chord_name")
    private String chordName;

    public Long getModeId() {
        return modeId;
    }

    public void setModeId(Long modeId) {
        this.modeId = modeId;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public Integer getKeyNote() {
        return keyNote;
    }

    public void setKeyNote(Integer keyNote) {
        this.keyNote = keyNote;
    }

    public String getKeyName() {
        return keyName;
    }

    public void setKeyName(String keyName) {
        this.keyName = keyName;
    }

    public Integer getChordNote() {
        return chordNote;
    }

    public void setChordNote(Integer chordNote) {
        this.chordNote = chordNote;
    }

    public String getChordNoteName() {
        return chordNoteName;
    }

    public void setChordNoteName(String chordNoteName) {
        this.chordNoteName = chordNoteName;
    }

    public Long getChordTypeId() {
        return chordTypeId;
    }

    public void setChordTypeId(Long chordTypeId) {
        this.chordTypeId = chordTypeId;
    }

    public String getChordName() {
        return chordName;
    }

    public void setChordName(String chordName) {
        this.chordName = chordName;
    }
}
