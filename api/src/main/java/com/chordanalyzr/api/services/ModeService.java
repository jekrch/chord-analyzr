package com.chordanalyzr.api.services;

import com.chordanalyzr.api.entities.Mode;
import com.chordanalyzr.api.repositories.ModeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ModeService {

    private ModeRepository modeRepository;

    public ModeService(ModeRepository modeRepository) {
        this.modeRepository = modeRepository;
    }

    public List<Mode> getAllModes(){
        return this.modeRepository.findAllByOrderByNameAsc();
    }
}
