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
        keyName = sanitizeKeyName(keyName);
        return this.modeScaleChordRelationRepo.getChordsByModeKeyAndDiffCount(
                modeName,
                keyName,
                0
        );
    }

    public static String sanitizeKeyName(String keyName) {
        if (keyName == null || keyName.isEmpty()) {
            return keyName; 
        }

        // capitalize the first letter and lowercase the rest of the string
        return keyName.substring(0, 1).toUpperCase() + keyName.substring(1).toLowerCase();
    }
}
