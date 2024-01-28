package com.chordanalyzr.api.controllers;

import com.chordanalyzr.api.repositories.ModeScaleChordRelationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chords")
public class ChordController {

    @Autowired
    ModeScaleChordRelationRepository modeScaleChordRelationRepository;

    @GetMapping
    public ResponseEntity<?> getChords() {
        return ResponseEntity.ok("tbd of chords");
    }
}
