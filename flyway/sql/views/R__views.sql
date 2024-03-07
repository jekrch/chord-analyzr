
--
-- MODES --
--


DROP VIEW IF EXISTS mode_scale_chord_relation_view;
DROP VIEW IF EXISTS chord_view;
DROP VIEW IF EXISTS chord_note_view;
DROP VIEW IF EXISTS mode_chord_view;
DROP VIEW IF EXISTS mode_chord_note_view;
DROP VIEW IF EXISTS mode_view;
DROP VIEW IF EXISTS mode_note_view;

-- fetches all permutations of modes with keys

CREATE OR REPLACE VIEW mode_note_view AS
SELECT m.id AS mode_id,
       m.name AS mode,
       root_note.note AS key_note, 
       root_note.name AS key_name,
       n.name AS note_name,
       (mn.note + root_note.note) AS seq_note,
       (
           CASE WHEN (mn.note + root_note.note) = 12 
             THEN 12
           ELSE (mn.note + root_note.note) % 12 END
       ) AS note,
       mn.note_ordinal AS note_ordinal
FROM mode m 
JOIN mode_note mn on mn.mode_id = m.id
JOIN note root_note on true 
JOIN note n ON n.note = 
    (
        CASE WHEN (mn.note + root_note.note) = 12 
             THEN 12
        ELSE (mn.note + root_note.note) % 12 END
    )
    AND n.note_type_id IN (1,3);

    
    -- recursive view for getting order of note letters in continuous sequence
CREATE OR REPLACE VIEW ordered_letter_view AS 
WITH RECURSIVE letters AS (
    SELECT letter_ordinal, letter  
    FROM letter l
    UNION ALL
    SELECT l.letter_ordinal + 7, l2.letter 
    FROM letter l2 
    JOIN letters l ON l.letter = l2.letter
)
SELECT * FROM letters
LIMIT 1000; -- courtesy limit 

-- gets the letter proceeding and preceding each note letter 
CREATE OR REPLACE VIEW adjacent_letter_view AS 
SELECT l.letter_ordinal, 
         l.letter, 
         pre_l.letter AS antecedent_letter, 
         post_l.letter AS subsequent_letter 
FROM letter l
JOIN ordered_letter_view pre_l ON (l.letter_ordinal = 1 AND pre_l.letter_ordinal = 7) OR -- if A make the preceding letter G
                                                (pre_l.letter_ordinal = l.letter_ordinal - 1) 
JOIN ordered_letter_view post_l ON (post_l.letter_ordinal = l.letter_ordinal + 1) -- get the subsequent 
ORDER BY l.letter_ordinal asc;



-- get note numbers for every scale in every key 
-- (excluding keys that have a tonic with two or more sharps or flats)
CREATE OR REPLACE VIEW mode_scale_note_view AS 
 SELECT 
    m.id AS mode_id,
    m.name AS mode,
    root_note.note AS key_note,
    root_note.name AS key_name,
    root_note.letter AS key_letter,
    root_note.note_type_id AS key_type_id,
    mn.note + root_note.note AS seq_note,   -- seq_note can go over 12, while note below stays within 1-12 
        CASE
            WHEN (mn.note + root_note.note) = 12 
                THEN 12
            ELSE (mn.note + root_note.note) % 12
        END AS note,
    mn.note_ordinal,                        -- index from 1
    (mn.note_ordinal - 1) AS note_index     -- add an index from 0 for calculations 
   FROM mode m
     JOIN mode_note mn ON mn.mode_id = m.id
     JOIN note root_note ON TRUE AND                                        
                              root_note.note_type_id NOT IN (4,5); -- exclude the double sharps flats
     
     

CREATE OR REPLACE VIEW mode_scale_note_letter_view AS 
WITH mode_scale_note_letters AS (
	-- complete modes
	SELECT msn.mode_id,
	       msn.mode,
	       msn.key_note, 
	       msn.key_name,
	       msn.note_ordinal,
	       msn.note,
	       nt.name AS note_name, 
	       nt.note_type_id, 
	       nt.letter AS note_letter,
	       msn.key_letter,
	       msn.key_type_id, 
	       msn.seq_note
	FROM mode_scale_note_view msn
	JOIN mode m ON m.id = msn.mode_id AND m.complete IS TRUE -- complete modes
	JOIN note nt ON nt.name IN (
	    SELECT n.name 
	        FROM note n
	        JOIN ordered_letter_view olv_key_ordinal 
	                ON olv_key_ordinal.letter = msn.key_letter
	        JOIN ordered_letter_view olv_seq_letter       -- the letter of the preceding note should be alphabetically prior
	                ON olv_seq_letter.letter_ordinal =    -- the index of the note within the scale should determine the letter 
	                                            (olv_key_ordinal.letter_ordinal + msn.note_index) AND 
	                   olv_seq_letter.letter = n.letter
	        WHERE n.note = msn.note
	)
	UNION ALL 
	-- gapped/incomplete modes
	SELECT DISTINCT
	    msn.mode_id,
	    msn.mode,
	    msn.key_note,
	    msn.key_name,
	    msn.note_ordinal,
	    msn.note,
	    COALESCE(pref_note.name, nt.name) AS note_name,
	    COALESCE(pref_note.note_type_id, nt.note_type_id) AS note_type_id,
	    COALESCE(pref_note.letter, nt.letter) AS note_letter,
	    msn.key_letter,
	    msn.key_type_id,
	    msn.seq_note
	FROM mode_scale_note_view msn
	JOIN mode m ON m.id = msn.mode_id AND m.complete IS FALSE -- only cover gapped/incomplete modes here
	JOIN note nt ON nt.note = msn.note
	LEFT JOIN (
	    SELECT
	        mn.mode,
	        mn.key_name,
	        mn.note,
	        n.name,
	        n.note_type_id,
	        n.letter,
	        CASE -- we're picking the accidentals that match the key, are consistent and minimal relative to naturals
	            WHEN root_note.note_type_id = 3 
	            THEN ROW_NUMBER() OVER (
	            	PARTITION BY mn.mode, mn.key_name, mn.note 
	            	ORDER BY n.note_type_id DESC
	        	)
	            ELSE ROW_NUMBER() OVER (
	            	PARTITION BY mn.mode, mn.key_name, mn.note 
	            	ORDER BY n.note_type_id ASC
	        	)
	        END AS rn
	    FROM mode_note_view mn
	    JOIN mode m ON m.id = mn.mode_id AND m.complete IS FALSE -- only cover gapped/incomplete modes here
	    JOIN note n ON n.note = mn.note
	    JOIN note root_note ON root_note.name = mn.key_name
	    WHERE n.note_type_id IN (1, 2, 3)  -- only consider natural, flat, and sharp notes
	    ORDER BY mn.mode, mn.key_name, mn.note, n.note_type_id
	) pref_note ON pref_note.mode = msn.mode
	             AND pref_note.key_name = msn.key_name
	             AND pref_note.note = msn.note
	             AND pref_note.rn = 1  -- take the note with the preferred note_type_id
)
SELECT *
FROM mode_scale_note_letters 
ORDER BY note_ordinal ASC;




-- fetches all permutations of modes with keys 
-- and displays aggregated csv of the containing notes 

CREATE OR REPLACE VIEW mode_view AS
SELECT 
       msn.mode, 
       msn.key_note, 
       msn.key_name,
       string_agg(msn.note_name, ', '  order by msn.note_ordinal) AS mode_note_names, 
       string_agg(seq_note::text, ', ' order by msn.note_ordinal) AS mode_notes
FROM mode_scale_note_letter_view msn
GROUP BY msn.mode, msn.key_note, msn.key_name;



--
-- CHORDS --
--


-- fetches all permutations of chord types with root notes 
-- when picking note names, this defaults to the ionian mode of 
-- the root note of the chord

CREATE OR REPLACE VIEW chord_note_view AS 
SELECT DISTINCT
    n.note AS note,
    n.name AS note_name, 
    ct.name AS chord_type,
    ct.id AS chord_type_id,
    n.name || ct.name as chord_name,
    (ctn.note + n.note) as chord_seq_note,
    chord_note.note AS chord_note,
    COALESCE(mcn.note_name, chord_note.name) as chord_note_name 
FROM chord_type_note ctn 
JOIN chord_type ct ON ct.id = ctn.chord_type_id
JOIN note n ON true
JOIN note chord_note ON chord_note.note = 
    (
        CASE WHEN (ctn.note + n.note) = 12 
            THEN 12
        ELSE (ctn.note + n.note) % 12 END
    -- when a note falls outside the mode, allow note names that are flat 
    -- if the root is flat, otherwise default to sharps (when necessary)
    ) AND (
        (
            n.note_type_id = 2 AND 
            chord_note.note_type_id IN (1,2) 
        ) OR 
        ( 
            n.note_type_id != 2 AND
            chord_note.note_type_id IN (1,3) 
        )
     ) 
LEFT JOIN mode_scale_note_letter_view mcn ON 
            mcn.key_name = n.name AND
            mcn.mode = 'Ionian' AND 
            mcn.note = chord_note.note;
    

-- fetches all permutations of chord types with root notes 
-- and displays aggregated csv of the containing notes 

CREATE OR REPLACE VIEW chord_view AS 
SELECT 
    cnv.note,
    cnv.note_name, 
    cnv.chord_type_id,
    cnv.chord_type,
    cnv.chord_name,
    array_agg(
         DISTINCT cnv.chord_note
    ) AS chord_note_array,
    string_agg(
            cnv.chord_note_name, ', ' 
            ORDER BY cnv.chord_seq_note
     ) AS chord_note_names, 
    string_agg(
            cnv.chord_seq_note::TEXT, ', ' 
            ORDER BY cnv.chord_seq_note
     ) AS chord_notes
FROM chord_note_view cnv 
GROUP BY cnv.note, cnv.note_name, cnv.chord_type_id,
         cnv.chord_type, cnv.chord_name;


-- key and mode modified chord views 

-- fetches all permutations of chord types with root notes, 
-- paired with the mode and key which determines note names

CREATE OR REPLACE VIEW mode_chord_note_view AS 
SELECT DISTINCT
    key_note.name AS key_name, 
    m.name AS mode,
    n.note AS note,
    n.name AS note_name, 
    ct.name AS chord_type,
    ct.id AS chord_type_id,
    n.name || ct.name as chord_name,
    (ctn.note + n.note) as chord_seq_note,
    chord_note.note AS chord_note,
    COALESCE(mcn.note_name, chord_note.name) as chord_note_name
FROM chord_type_note ctn 
JOIN chord_type ct ON ct.id = ctn.chord_type_id
JOIN note n ON TRUE
JOIN note key_note ON TRUE
JOIN mode m ON TRUE
JOIN note chord_note ON chord_note.note = 
    (
        CASE WHEN (ctn.note + n.note) = 12 
            THEN 12
        ELSE (ctn.note + n.note) % 12 END
    -- when a note falls outside the mode, allow note names that are flat 
    -- if the root is flat, otherwise default to sharps (when necessary)
    ) AND (
        (
            n.note_type_id = 2 AND 
            chord_note.note_type_id IN (1,2) 
        ) OR 
        ( 
            n.note_type_id != 2 AND
            chord_note.note_type_id IN (1,3) 
        )
     )         
LEFT JOIN mode_scale_note_letter_view mcn ON 
            mcn.mode = m.name AND 
            mcn.key_name = key_note.name AND
            mcn.note = chord_note.note; 
    

-- fetches all permutations of chord types with root notes 
-- and displays aggregated csv of the containing notes 
-- with note letters determined by mode and key 

CREATE OR REPLACE VIEW mode_chord_view AS 
SELECT 
    mcnv.key_name, 
    mcnv.mode,
    mcnv.note,
    mcnv.note_name, 
    mcnv.chord_type_id,
    mcnv.chord_type,
    mcnv.chord_name,
    array_agg(
         DISTINCT mcnv.chord_note
    ) AS chord_note_array,
    string_agg(
            mcnv.chord_note_name, ', ' 
            ORDER BY mcnv.chord_seq_note
     ) AS chord_note_names, 
    string_agg(
            mcnv.chord_seq_note::TEXT, ', ' 
            ORDER BY mcnv.chord_seq_note
     ) AS chord_notes
FROM mode_chord_note_view mcnv 
GROUP BY mcnv.key_name, mcnv.mode, mcnv.note, 
            mcnv.note_name, mcnv.chord_type_id, 
            mcnv.chord_type, mcnv.chord_name;


--
-- CHORD-SCALE RELATIONSHIPS --
--

DROP MATERIALIZED VIEW IF EXISTS mode_scale_chord_relation_mv;

-- fetches all chord-mode-key permutations with any distinct notes listed and counted. 
-- this can be used to identify the affinity of chords to a given scale 
CREATE MATERIALIZED VIEW IF NOT EXISTS mode_scale_chord_relation_mv AS
WITH mode_notes AS (
 SELECT   
    mnv.mode_id,  
    mnv.mode,
    mnv.key_note,
    mnv.key_name,
    array_agg(DISTINCT mnv.note) AS mode_notes
    FROM mode_note_view mnv 
    GROUP BY mnv.key_note, mnv.key_name, mnv.mode, mnv.mode_id
), mode_chord_notes AS (
 SELECT 
    mn.mode_id,
    mn.mode, 
    mn.key_note, 
    mn.key_name, 
    cn.note_name,
    cn.chord_type_id,
    cn.chord_name, 
    mn.mode_notes,
    cn.chord_notes,
    cn.chord_note_names,
    ARRAY(select unnest(cn.chord_note_array) EXCEPT select unnest(mn.mode_notes)) AS diff
    FROM mode_notes mn 
    JOIN mode_chord_view cn ON cn.key_name = mn.key_name AND 
                               cn.mode = mn.mode 
)
SELECT DISTINCT
    mcn.mode_id,
    mcn.mode, 
    mcn.key_note, 
    mcn.key_name, 
    n.note AS chord_note,
    mcn.note_name chord_note_name,
    mcn.chord_type_id, 
    mcn.chord_name,
    mcn.mode_notes,
    mcn.chord_notes,
    mcn.chord_note_names,
    diff AS mode_chord_note_diff, 
    COALESCE(array_length(mcn.diff, 1), 0) AS mode_chord_note_diff_count
FROM mode_chord_notes mcn
JOIN note n ON n.name = mcn.note_name                 
LEFT JOIN mode_scale_note_letter_view msnlv ON    -- get the chord note's preferred 
    msnlv.mode = mcn.mode AND                     -- mode scale name if one exists 
    msnlv.key_name = mcn.key_name AND 
    msnlv.note = n.note AND 
    mcn.note_name = msnlv.note_name         
WHERE 
(
    NOT(n.note = ANY(mcn.mode_notes::BIGINT[])) OR -- if the chord note is within the selected 
    msnlv.note_name = n.name                       -- mode scale, use the preferred note name
) AND
(                                                  -- only allow chord notes with double sharps/flats
    msnlv.note_name != NULL OR                     -- if they're within the selected mode scale
    n.note_type_id NOT IN (4,5)
);