package com.chordanalyzr.api.controllers;

import com.chordanalyzr.api.dtos.ModeDto;
import com.chordanalyzr.api.entities.Mode;
import com.chordanalyzr.api.repositories.ModeScaleChordRelationRepository;
import com.chordanalyzr.api.services.ModeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/modes")
public class ModeController {

    private final ModeService modeService;

    public ModeController(ModeService modeService) {
        this.modeService = modeService;
    }

    @GetMapping
    @Operation(
            summary = "Get modes",
            description = "Get all modes"
    )
    @ApiResponse(responseCode = "200", description = "")
    public ResponseEntity<List<ModeDto>> getModes() {
        List<Mode> modeList = this.modeService.getAllModes();

    return ResponseEntity.ok(
            modeList.stream()
                    .map(ModeDto::new)
                    .toList()
    );
    }
}
