package com.chordanalyzr.api.entities;
import jakarta.persistence.*;

@Entity
@Table(name = "note")
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "letter", nullable = false)
    private String letter;

    @Column(name = "note", nullable = false)
    private Integer noteValue;

//    @ManyToOne
//    @JoinColumn(name = "note_type_id", nullable = false)
//    private NoteType noteType;

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

    public String getLetter() {
        return letter;
    }

    public void setLetter(String letter) {
        this.letter = letter;
    }

    public Integer getNoteValue() {
        return noteValue;
    }

    public void setNoteValue(Integer noteValue) {
        this.noteValue = noteValue;
    }
}
