package com.chordanalyzr.api.dtos;

import java.util.Arrays;

import com.chordanalyzr.api.entities.ModeScaleChordRelation;

public class ModeScaleChordDto {
    private Long modeId;
    private Long chordTypeId;
    private Integer chordNote;
    private Integer keyNote;
    private String mode;
    private String keyName;
    private String chordNoteName;
    private String chordName;
    private Integer[] modeNotes;
    private String chordNotes;
    private String chordNoteNames;
    private Integer[] modeChordNoteDiff;
    private Integer modeChordNoteDiffCount;

    public ModeScaleChordDto(ModeScaleChordRelation entity) {
        this.modeId = entity.getModeId();
        this.chordTypeId = entity.getChordTypeId();
        this.chordNote = entity.getChordNote();
        this.keyNote = entity.getKeyNote();
        this.mode = entity.getMode();
        this.keyName = entity.getKeyName();
        this.chordNoteName = entity.getChordNoteName();
        this.chordName = entity.getChordName();
        this.modeNotes = entity.getModeNotes();
        this.chordNotes = entity.getChordNotes();
        this.chordNoteNames = entity.getChordNoteNames();
        this.modeChordNoteDiff = entity.getModeChordNoteDiff();
        this.modeChordNoteDiffCount = entity.getModeChordNoteDiffCount();
    }

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

    @Override
    public String toString() {
        return "ModeScaleChordDto{" +
                "modeId=" + modeId +
                ", chordTypeId=" + chordTypeId +
                ", chordNote=" + chordNote +
                ", keyNote=" + keyNote +
                ", mode='" + mode + '\'' +
                ", keyName='" + keyName + '\'' +
                ", chordNoteName='" + chordNoteName + '\'' +
                ", chordName='" + chordName + '\'' +
                ", modeNotes=" + Arrays.toString(modeNotes) +
                ", chordNotes='" + chordNotes + '\'' +
                ", chordNoteNames='" + chordNoteNames + '\'' +
                ", modeChordNoteDiff=" + Arrays.toString(modeChordNoteDiff) +
                ", modeChordNoteDiffCount=" + modeChordNoteDiffCount +
                '}';
    }
}
