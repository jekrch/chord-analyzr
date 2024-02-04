package com.chordanalyzr.api.entities;


import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import com.chordanalyzr.api.entities.keys.ModeScaleChordRelationKey;

@Entity(name = "mode_scale_chord_relation_mv")
@Immutable
public class ModeScaleChordRelation {

    @EmbeddedId
    private ModeScaleChordRelationKey id;

    @Column(name = "mode")
    private String mode;

    @Column(name = "key_name")
    private String keyName;

    @Column(name = "chord_note_name")
    private String chordNoteName;

    @Column(name = "chord_name")
    private String chordName;

    @Column(name = "mode_notes")
    private Integer[] modeNotes;

    @Column(name = "chord_notes")
    private String chordNotes;

    @Column(name = "chord_note_names")
    private String chordNoteNames;

    @Column(
        name = "mode_chord_note_diff"
    )
    private Integer[] modeChordNoteDiff;

    @Column(name = "mode_chord_note_diff_count")
    private Integer modeChordNoteDiffCount;

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getKeyName() {
        return keyName;
    }

    public void setKeyName(String keyName) {
        this.keyName = keyName;
    }

    public String getChordNoteName() {
        return chordNoteName;
    }

    public void setChordNoteName(String chordNoteName) {
        this.chordNoteName = chordNoteName;
    }

    public String getChordName() {
        return chordName;
    }

    public void setChordName(String chordName) {
        this.chordName = chordName;
    }

    // accessors delegate to the id object

    public Long getModeId() {
        return id.getModeId();
    }

    public void setModeId(Long modeId) {
        id.setModeId(modeId);
    }

    public Long getChordTypeId() {
        return id.getChordTypeId();
    }

    public void setChordTypeId(Long chordTypeId) {
        id.setChordTypeId(chordTypeId);
    }

    public Integer getChordNote() {
        return id.getChordNote();
    }

    public void setChordNote(Integer chordNote) {
        id.setChordNote(chordNote);
    }

    public Integer getKeyNote() {
        return id.getKeyNote();
    }

    public void setKeyNote(Integer keyNote) {
        id.setKeyNote(keyNote);
    }

    public ModeScaleChordRelationKey getId() {
        return id;
    }

    public void setId(ModeScaleChordRelationKey id) {
        this.id = id;
    }

    public Integer[] getModeNotes() {
        return modeNotes;
    }

    public void setModeNotes(Integer[] modeNotes) {
        this.modeNotes = modeNotes;
    }

    public String getChordNotes() {
        return chordNotes;
    }

    public void setChordNotes(String chordNotes) {
        this.chordNotes = chordNotes;
    }

    public String getChordNoteNames() {
        return chordNoteNames;
    }

    public void setChordNoteNames(String chordNoteNames) {
        this.chordNoteNames = chordNoteNames;
    }

    public Integer[] getModeChordNoteDiff() {
        return modeChordNoteDiff;
    }

    public void setModeChordNoteDiff(Integer[] modeChordNoteDiff) {
        this.modeChordNoteDiff = modeChordNoteDiff;
    }

    public Integer getModeChordNoteDiffCount() {
        return modeChordNoteDiffCount;
    }

    public void setModeChordNoteDiffCount(Integer modeChordNoteDiffCount) {
        this.modeChordNoteDiffCount = modeChordNoteDiffCount;
    }
}
