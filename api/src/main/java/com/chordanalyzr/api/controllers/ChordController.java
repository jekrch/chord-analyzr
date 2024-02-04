package com.chordanalyzr.api.controllers;

import com.chordanalyzr.api.dtos.ModeScaleChordDto;
import com.chordanalyzr.api.entities.ModeScaleChordRelation;
import com.chordanalyzr.api.services.ModeScaleChordService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/chords")
public class ChordController {

    private final ModeScaleChordService modeScaleChordService;

    public ChordController(ModeScaleChordService modeScaleChordService) {
        this.modeScaleChordService = modeScaleChordService;
    }

    @GetMapping
    @Operation(
            summary = "Get chords by mode and key name",
            description = "Get chords by mode and key name"
    )
    public ResponseEntity<List<ModeScaleChordDto>> getModeKeyChords(
            @RequestParam String key,
            @RequestParam String mode
    ) {
        List<ModeScaleChordRelation> chordList = modeScaleChordService.getChordsWithinModeKey(mode, key);

        return new ResponseEntity<List<ModeScaleChordDto>>(
                chordList.stream()
                .map(ModeScaleChordDto::new)
                .toList(),
                HttpStatus.OK
        );
    }

}
