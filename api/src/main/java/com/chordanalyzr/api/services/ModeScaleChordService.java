package com.chordanalyzr.api.services;

import com.chordanalyzr.api.entities.ModeScaleChordRelation;
import com.chordanalyzr.api.repositories.ModeScaleChordRelationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ModeScaleChordService {

    private ModeScaleChordRelationRepository modeScaleChordRelationRepo;

    public ModeScaleChordService(
            ModeScaleChordRelationRepository modeScaleChordRelationRepo
    ) {
        this.modeScaleChordRelationRepo = modeScaleChordRelationRepo;
    }

    public List<ModeScaleChordRelation> getChordsWithinModeKey(String modeName, String keyName) {
        return this.modeScaleChordRelationRepo.getChordsByModeKeyAndDiffCount(
                modeName,
                keyName,
                0
        );
    }
}
