package com.chordanalyzr.api.repositories;

import com.chordanalyzr.api.entities.Mode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModeRepository extends JpaRepository<Mode, Long> {
    List<Mode> findAllByOrderByNameAsc();
}
