package com.chordanalyzr.api.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chordanalyzr.api.entities.ScaleNoteDto;
import com.chordanalyzr.api.services.ScaleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@RequestMapping("/api/scales")
public class ScaleController {

    private final ScaleService scaleService;

    public ScaleController(ScaleService scaleService) {
        this.scaleService = scaleService;
    }

    @GetMapping
    @Operation(
            summary = "Get scale notes",
            description = "Get scale notes"
    )
    @ApiResponse(responseCode = "200", description = "")
    public ResponseEntity<List<ScaleNoteDto>> getScaleNotes(
            @RequestParam String key,
            @RequestParam String mode
    ) {
        return ResponseEntity.ok(
                this.scaleService.getScale(mode, key)
        );

    }
}
